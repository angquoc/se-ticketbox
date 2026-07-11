import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE } from '../queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { ConcertStatus } from '@prisma/client';

const REMINDER_JOB_NAME = 'concert-reminder-24h';
const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule a 24h reminder delayed job for a concert.
   * Removes any existing reminder job for the concert first (idempotent reschedule).
   * The job fires at: startsAt - 24h. If that time is in the past, skips scheduling.
   *
   * Call this whenever:
   * - A concert is published (status → PUBLISHED / SALE_OPEN)
   * - A concert's startsAt is updated
   */
  async scheduleReminder(concertId: string): Promise<void> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, startsAt: true, status: true, reminderJobId: true },
    });

    if (!concert) return;

    // Only schedule for published concerts
    if (
      concert.status !== ConcertStatus.PUBLISHED &&
      concert.status !== ConcertStatus.SALE_OPEN
    ) {
      return;
    }

    const reminderTime = new Date(
      concert.startsAt.getTime() - REMINDER_DELAY_MS,
    );

    // Skip if reminder time is in the past
    if (reminderTime <= new Date()) {
      this.logger.log(
        `[Reminder] Concert ${concertId} startsAt too soon, skipping 24h reminder`,
      );
      await this.cancelReminder(concertId);
      return;
    }

    // Cancel any existing reminder job first
    await this.cancelReminder(concertId);

    // Add a new delayed job
    const delay = reminderTime.getTime() - Date.now();
    const job = await this.notificationQueue.add(
      REMINDER_JOB_NAME,
      { concertId },
      {
        delay,
        // BullMQ custom jobId cannot contain ':' (used as Redis key separator)
        jobId: `reminder-${concertId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Persist job ID to Concert for future reschedule/cancel operations
    await this.prisma.concert.update({
      where: { id: concertId },
      data: { reminderJobId: job.id },
    });

    this.logger.log(
      `[Reminder] Scheduled 24h reminder for concert ${concertId} at ${reminderTime.toISOString()} (delay=${Math.round(delay / 1000 / 60)}min, jobId=${job.id})`,
    );
  }

  /**
   * Cancel any pending reminder job for a concert.
   * Idempotent — safe to call even if no job exists.
   */
  async cancelReminder(concertId: string): Promise<void> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { reminderJobId: true },
    });

    if (!concert?.reminderJobId) return;

    try {
      const job = await this.notificationQueue.getJob(concert.reminderJobId);
      if (job) {
        const state = await job.getState();
        if (state !== 'completed' && state !== 'failed') {
          await job.remove();
          this.logger.log(
            `[Reminder] Cancelled pending job ${concert.reminderJobId} for concert ${concertId}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `[Reminder] Failed to cancel job ${concert.reminderJobId} for concert ${concertId}: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Clear the stored job ID
    await this.prisma.concert
      .update({
        where: { id: concertId },
        data: { reminderJobId: null },
      })
      .catch(() => {
        // Concert may have been deleted; ignore
      });
  }
}
