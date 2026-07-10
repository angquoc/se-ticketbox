/**
 * Database seed for testing — populates the database with isolated test data.
 *
 * Run from the backend directory:
 *   npx ts-node -r tsconfig-paths/register ../data/seed/seed-test.ts
 */

import { PrismaClient, Role, ConcertStatus, TicketTypeStatus, OrderStatus, PaymentProvider, PaymentStatus, TicketStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Resolve .env from the backend directory (one level up from data/)
import * as fs from 'fs';
const envPath = fs.existsSync(path.resolve(__dirname, '../../src/backend/.env'))
  ? path.resolve(__dirname, '../../src/backend/.env')
  : path.resolve(__dirname, '../../backend/.env');
dotenv.config({ path: envPath });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing in .env file!');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const QR_SECRET = process.env.QR_SIGNATURE_SECRET ?? 'dev_qr_secret';

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function generateQrToken(
  ticketId: string,
  gateName: string,
): { rawToken: string; qrTokenHash: string; qrSignature: string } {
  const rawToken = crypto.randomUUID();
  const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const signaturePayload = `${ticketId}:${qrTokenHash}:${gateName}`;
  const qrSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(signaturePayload)
    .digest('hex');
  return { rawToken, qrTokenHash, qrSignature };
}

async function createGatesForConcert(
  prisma: any,
  concertId: string,
  gateNames: string[],
) {
  for (const name of gateNames) {
    await prisma.gate.create({ data: { concertId, name } });
  }
}

export async function runSeeding() {
  console.log('Start seeding test database...');

  // Clean up existing data
  await prisma.checkinLog.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.userTicketCounter.deleteMany();
  await prisma.guestListEntry.deleteMany();
  await prisma.gate.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing database records');

  await seedTestData(prisma);

  console.log('Seeding completed successfully!');
}

export async function seedTestData(prisma: PrismaClient) {
  // Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin-t3-01@ticketbox.vn',
      passwordHash: hashPassword('admin123'),
      fullName: 'Test Admin T3',
      role: Role.ADMIN,
    },
  });

  const organizer1 = await prisma.user.create({
    data: {
      email: 'organizer-t3-01@ticketbox.vn',
      passwordHash: hashPassword('organizer123'),
      fullName: 'Test Organizer 1 T3',
      role: Role.ORGANIZER,
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: 'organizer-t3-02@ticketbox.vn',
      passwordHash: hashPassword('organizer123'),
      fullName: 'Test Organizer 2 T3',
      role: Role.ORGANIZER,
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      email: 'staff-t2-01@ticketbox.vn',
      passwordHash: hashPassword('staff123'),
      fullName: 'Test Staff 1 T2',
      role: Role.STAFF,
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff-t2-02@ticketbox.vn',
      passwordHash: hashPassword('staff123'),
      fullName: 'Test Staff 2 T2',
      role: Role.STAFF,
    },
  });

  // Create Tester 1 Customers
  const customerT1List: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const cust = await prisma.user.create({
      data: {
        email: `customer-t1-0${i}@example.com`,
        passwordHash: hashPassword('customer123'),
        fullName: `Customer T1 0${i}`,
        role: Role.CUSTOMER,
      },
    });
    customerT1List.push(cust);
  }

  // Create Tester 2 Customers
  const customerT2List: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const cust = await prisma.user.create({
      data: {
        email: `customer-t2-0${i}@example.com`,
        passwordHash: hashPassword('customer123'),
        fullName: `Customer T2 0${i}`,
        role: Role.CUSTOMER,
      },
    });
    customerT2List.push(cust);
  }

  // Create Tester 3 Customer
  const customerT3 = await prisma.user.create({
    data: {
      email: 'customer-t3-01@example.com',
      passwordHash: hashPassword('customer123'),
      fullName: 'Customer T3 01',
      role: Role.CUSTOMER,
    },
  });

  // Create Tester 4 Customers (for concurrent & load testing)
  const customerT4List: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const indexStr = i < 10 ? `0${i}` : `${i}`;
    const cust = await prisma.user.create({
      data: {
        email: `customer-t4-${indexStr}@example.com`,
        passwordHash: hashPassword('customer123'),
        fullName: `Customer T4 ${indexStr}`,
        role: Role.CUSTOMER,
      },
    });
    customerT4List.push(cust);
  }

  console.log('Created all test user accounts');

  // CONCERTS SEEDING
  const farFutureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nearFutureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  // 1. concert-purchase-momo
  const concertMomo = await prisma.concert.create({
    data: {
      id: 'concert-purchase-momo',
      organizerId: organizer1.id,
      title: 'Concert Test Purchase MoMo',
      slug: 'concert-purchase-momo',
      description: 'Concert for testing MoMo payment flow.',
      venue: 'Sân vận động Mỹ Đình, Hà Nội',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
      seatMapUrl: '/seatmaps/concerts/demo.svg',
    },
  });
  const tTypeMomo1 = await prisma.ticketType.create({
    data: {
      concertId: concertMomo.id,
      name: 'SVIP',
      price: 5000000,
      totalQty: 100,
      soldQty: 0,
      maxPerUser: 2,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  const tTypeMomo2 = await prisma.ticketType.create({
    data: {
      concertId: concertMomo.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 200,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  const tTypeMomo3 = await prisma.ticketType.create({
    data: {
      concertId: concertMomo.id,
      name: 'GA',
      price: 1000000,
      totalQty: 1000,
      soldQty: 0,
      maxPerUser: 6,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertMomo.id, ['GATE-A', 'GATE-B', 'GATE-C']);

  // 2. concert-purchase-vnpay
  const concertVnpay = await prisma.concert.create({
    data: {
      id: 'concert-purchase-vnpay',
      organizerId: organizer1.id,
      title: 'Concert Test Purchase VNPAY',
      slug: 'concert-purchase-vnpay',
      description: 'Concert for testing VNPAY payment flow.',
      venue: 'Sân vận động Quân khu 7, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
      seatMapUrl: '/seatmaps/concerts/demo.svg',
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertVnpay.id,
      name: 'SVIP',
      price: 5000000,
      totalQty: 100,
      soldQty: 0,
      maxPerUser: 2,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  const tTypeVnpay2 = await prisma.ticketType.create({
    data: {
      concertId: concertVnpay.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 200,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertVnpay.id, ['GATE-A', 'GATE-B']);

  // 3. concert-purchase-limits
  const concertLimits = await prisma.concert.create({
    data: {
      id: 'concert-purchase-limits',
      organizerId: organizer1.id,
      title: 'Concert Test Purchase Limits',
      slug: 'concert-purchase-limits',
      description: 'Concert for testing per-user limits.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertLimits.id,
      name: 'SVIP',
      price: 5000000,
      totalQty: 100,
      soldQty: 0,
      maxPerUser: 1, // SVIP max 1 per user
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertLimits.id,
      name: 'GA',
      price: 1000000,
      totalQty: 1000,
      soldQty: 0,
      maxPerUser: 3, // GA max 3 per user
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertLimits.id, ['GATE-A']);

  // 4. concert-purchase-idempotency
  const concertIdemp = await prisma.concert.create({
    data: {
      id: 'concert-purchase-idempotency',
      organizerId: organizer1.id,
      title: 'Concert Test Purchase Idempotency',
      slug: 'concert-purchase-idempotency',
      description: 'Concert for testing idempotency keys.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertIdemp.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 500,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertIdemp.id, ['GATE-A']);

  // 5. concert-checkin-online
  const concertCheckinOnline = await prisma.concert.create({
    data: {
      id: 'concert-checkin-online',
      organizerId: organizer1.id,
      title: 'Concert Test Checkin Online',
      slug: 'concert-checkin-online',
      description: 'Concert for online scanning.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      startsAt: nearFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  const tTypeCheckinOnline = await prisma.ticketType.create({
    data: {
      concertId: concertCheckinOnline.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 3,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertCheckinOnline.id, ['GATE-A', 'GATE-B']);

  // Create pre-purchased tickets for Tester 2 online test
  // Customer 2-01 (ready to scan success at GATE-A)
  const orderC2_1 = await prisma.order.create({
    data: {
      userId: customerT2List[0].id,
      concertId: concertCheckinOnline.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 3000000,
      paidAt: pastDate,
    },
  });
  const orderItemC2_1 = await prisma.orderItem.create({
    data: {
      orderId: orderC2_1.id,
      ticketTypeId: tTypeCheckinOnline.id,
      quantity: 1,
      unitPrice: 3000000,
      subtotal: 3000000,
    },
  });
  const tId1 = crypto.randomUUID();
  const tokenC2_1 = generateQrToken(tId1, 'GATE-A');
  await prisma.ticket.create({
    data: {
      id: tId1,
      orderId: orderC2_1.id,
      orderItemId: orderItemC2_1.id,
      concertId: concertCheckinOnline.id,
      ticketTypeId: tTypeCheckinOnline.id,
      userId: customerT2List[0].id,
      gateId: 'GATE-A',
      qrRawToken: tokenC2_1.rawToken,
      qrTokenHash: tokenC2_1.qrTokenHash,
      qrSignature: tokenC2_1.qrSignature,
      status: TicketStatus.ISSUED,
    },
  });

  // Customer 2-03 (already scanned, testing double check-in rejection)
  const orderC2_3 = await prisma.order.create({
    data: {
      userId: customerT2List[2].id,
      concertId: concertCheckinOnline.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 3000000,
      paidAt: pastDate,
    },
  });
  const orderItemC2_3 = await prisma.orderItem.create({
    data: {
      orderId: orderC2_3.id,
      ticketTypeId: tTypeCheckinOnline.id,
      quantity: 1,
      unitPrice: 3000000,
      subtotal: 3000000,
    },
  });
  const tId3 = crypto.randomUUID();
  const tokenC2_3 = generateQrToken(tId3, 'GATE-A');
  const t3 = await prisma.ticket.create({
    data: {
      id: tId3,
      orderId: orderC2_3.id,
      orderItemId: orderItemC2_3.id,
      concertId: concertCheckinOnline.id,
      ticketTypeId: tTypeCheckinOnline.id,
      userId: customerT2List[2].id,
      gateId: 'GATE-A',
      qrRawToken: tokenC2_3.rawToken,
      qrTokenHash: tokenC2_3.qrTokenHash,
      qrSignature: tokenC2_3.qrSignature,
      status: TicketStatus.CHECKED_IN,
      checkedInAt: pastDate,
    },
  });
  await prisma.checkinLog.create({
    data: {
      ticketId: t3.id,
      staffId: staff1.id,
      concertId: concertCheckinOnline.id,
      deviceId: 'CHECKIN-Device-Online-01',
      gate: 'GATE-A',
      status: 'SUCCESS' as any,
      scannedAt: pastDate,
    },
  });

  // 6. concert-checkin-offline
  const concertCheckinOffline = await prisma.concert.create({
    data: {
      id: 'concert-checkin-offline',
      organizerId: organizer1.id,
      title: 'Concert Test Checkin Offline',
      slug: 'concert-checkin-offline',
      description: 'Concert for offline scanning.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      startsAt: nearFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  const tTypeCheckinOffline = await prisma.ticketType.create({
    data: {
      concertId: concertCheckinOffline.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 1,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertCheckinOffline.id, ['GATE-A']);

  // Pre-purchased ticket for Customer 2-02 (offline verification check)
  const orderC2_2 = await prisma.order.create({
    data: {
      userId: customerT2List[1].id,
      concertId: concertCheckinOffline.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 3000000,
      paidAt: pastDate,
    },
  });
  const orderItemC2_2 = await prisma.orderItem.create({
    data: {
      orderId: orderC2_2.id,
      ticketTypeId: tTypeCheckinOffline.id,
      quantity: 1,
      unitPrice: 3000000,
      subtotal: 3000000,
    },
  });
  const tId2 = crypto.randomUUID();
  const tokenC2_2 = generateQrToken(tId2, 'GATE-A');
  await prisma.ticket.create({
    data: {
      id: tId2,
      orderId: orderC2_2.id,
      orderItemId: orderItemC2_2.id,
      concertId: concertCheckinOffline.id,
      ticketTypeId: tTypeCheckinOffline.id,
      userId: customerT2List[1].id,
      gateId: 'GATE-A',
      qrRawToken: tokenC2_2.rawToken,
      qrTokenHash: tokenC2_2.qrTokenHash,
      qrSignature: tokenC2_2.qrSignature,
      status: TicketStatus.ISSUED,
    },
  });

  // 7. concert-checkin-gates
  const concertCheckinGates = await prisma.concert.create({
    data: {
      id: 'concert-checkin-gates',
      organizerId: organizer1.id,
      title: 'Concert Test Checkin Gates',
      slug: 'concert-checkin-gates',
      description: 'Concert for testing gate mismatch routing.',
      venue: 'Nhà thi đấu Phú Thọ, TP.HCM',
      startsAt: nearFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  const tTypeCheckinGates = await prisma.ticketType.create({
    data: {
      concertId: concertCheckinGates.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 1,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertCheckinGates.id, ['GATE-A', 'GATE-B', 'GATE-C']);

  // Pre-purchased ticket for Customer 2-04 (Assigned to GATE-A, scan at GATE-B)
  const orderC2_4 = await prisma.order.create({
    data: {
      userId: customerT2List[3].id,
      concertId: concertCheckinGates.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 3000000,
      paidAt: pastDate,
    },
  });
  const orderItemC2_4 = await prisma.orderItem.create({
    data: {
      orderId: orderC2_4.id,
      ticketTypeId: tTypeCheckinGates.id,
      quantity: 1,
      unitPrice: 3000000,
      subtotal: 3000000,
    },
  });
  const tId4 = crypto.randomUUID();
  const tokenC2_4 = generateQrToken(tId4, 'GATE-A');
  await prisma.ticket.create({
    data: {
      id: tId4,
      orderId: orderC2_4.id,
      orderItemId: orderItemC2_4.id,
      concertId: concertCheckinGates.id,
      ticketTypeId: tTypeCheckinGates.id,
      userId: customerT2List[3].id,
      gateId: 'GATE-A',
      qrRawToken: tokenC2_4.rawToken,
      qrTokenHash: tokenC2_4.qrTokenHash,
      qrSignature: tokenC2_4.qrSignature,
      status: TicketStatus.ISSUED,
    },
  });

  // 8. concert-admin-crud
  await prisma.concert.create({
    data: {
      id: 'concert-admin-crud',
      organizerId: organizer1.id,
      title: 'Concert Test Admin CRUD',
      slug: 'concert-admin-crud',
      description: 'Concert draft for CRUD testing.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: farFutureDate,
      status: ConcertStatus.DRAFT,
    },
  });

  // 9. concert-admin-ai
  await prisma.concert.create({
    data: {
      id: 'concert-admin-ai',
      organizerId: organizer1.id,
      title: 'Concert Test Admin AI',
      slug: 'concert-admin-ai',
      description: 'Concert for testing AI Artist bio upload.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: farFutureDate,
      status: ConcertStatus.DRAFT,
    },
  });

  // 10. concert-admin-csv
  const concertAdminCsv = await prisma.concert.create({
    data: {
      id: 'concert-admin-csv',
      organizerId: organizer1.id,
      title: 'Concert Test Admin CSV',
      slug: 'concert-admin-csv',
      description: 'Concert for VIP Guest list import.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertAdminCsv.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertAdminCsv.id, ['GATE-A', 'GATE-B']);

  // 11. concert-nft-cache
  const concertNftCache = await prisma.concert.create({
    data: {
      id: 'concert-nft-cache',
      organizerId: organizer1.id,
      title: 'Concert Test NFT Cache',
      slug: 'concert-nft-cache',
      description: 'Concert for testing Redis cache details.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertNftCache.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 500,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertNftCache.id, ['GATE-A']);

  // 12. concert-nft-concurrency (SVIP has only 2 tickets left)
  const concertNftConcurrency = await prisma.concert.create({
    data: {
      id: 'concert-nft-concurrency',
      organizerId: organizer1.id,
      title: 'Concert Test NFT Concurrency',
      slug: 'concert-nft-concurrency',
      description: 'Concert for concurrency oversell testing.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertNftConcurrency.id,
      name: 'SVIP',
      price: 5000000,
      totalQty: 2, // ONLY 2 TICKETS FOR CONCURRENCY RACE
      soldQty: 0,
      maxPerUser: 1, // Max 1 per user to test multi-users race
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertNftConcurrency.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 500,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertNftConcurrency.id, ['GATE-A']);

  // 13. concert-nft-cb
  const concertNftCb = await prisma.concert.create({
    data: {
      id: 'concert-nft-cb',
      organizerId: organizer1.id,
      title: 'Concert Test NFT CB',
      slug: 'concert-nft-cb',
      description: 'Concert for testing circuit breaker sập gateway.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: farFutureDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  await prisma.ticketType.create({
    data: {
      concertId: concertNftCb.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 0,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertNftCb.id, ['GATE-A']);

  // 14. concert-nft-notif (starts in 23h 50m - under 24h for reminder mail queue)
  const startsSoonDate = new Date(Date.now() + 23.8 * 60 * 60 * 1000);
  const concertNftNotif = await prisma.concert.create({
    data: {
      id: 'concert-nft-notif',
      organizerId: organizer1.id,
      title: 'Concert Test NFT Notif',
      slug: 'concert-nft-notif',
      description: 'Concert starting soon to trigger 24h reminder emails.',
      venue: 'Sân khấu Trống Đồng, TP.HCM',
      startsAt: startsSoonDate,
      saleStartsAt: pastDate,
      status: ConcertStatus.SALE_OPEN,
    },
  });
  const tTypeNftNotif = await prisma.ticketType.create({
    data: {
      concertId: concertNftNotif.id,
      name: 'VIP',
      price: 3000000,
      totalQty: 100,
      soldQty: 1,
      maxPerUser: 4,
      saleStartsAt: pastDate,
      status: TicketTypeStatus.ACTIVE,
    },
  });
  await createGatesForConcert(prisma, concertNftNotif.id, ['GATE-A']);

  // Pre-purchased ticket for Customer 4-01 (so they receive reminder emails)
  const orderC4_1 = await prisma.order.create({
    data: {
      userId: customerT4List[0].id,
      concertId: concertNftNotif.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 3000000,
      paidAt: pastDate,
    },
  });
  const orderItemC4_1 = await prisma.orderItem.create({
    data: {
      orderId: orderC4_1.id,
      ticketTypeId: tTypeNftNotif.id,
      quantity: 1,
      unitPrice: 3000000,
      subtotal: 3000000,
    },
  });
  const tId5 = crypto.randomUUID();
  const tokenC4_1 = generateQrToken(tId5, 'GATE-A');
  await prisma.ticket.create({
    data: {
      id: tId5,
      orderId: orderC4_1.id,
      orderItemId: orderItemC4_1.id,
      concertId: concertNftNotif.id,
      ticketTypeId: tTypeNftNotif.id,
      userId: customerT4List[0].id,
      gateId: 'GATE-A',
      qrRawToken: tokenC4_1.rawToken,
      qrTokenHash: tokenC4_1.qrTokenHash,
      qrSignature: tokenC4_1.qrSignature,
      status: TicketStatus.ISSUED,
    },
  });

  console.log('Test seeding records created successfully.');
}

// Allow executing this file directly from shell
if (require.main === module) {
  runSeeding()
    .catch((e) => {
      console.error('Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
