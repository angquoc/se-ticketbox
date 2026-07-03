import { PrismaClient, Role, ConcertStatus, TicketTypeStatus, OrderStatus, PaymentProvider, PaymentStatus, TicketStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing in .env file!');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function generateQrToken(): string {
  return crypto.randomBytes(32).toString('hex');
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

async function main() {
  console.log('Start seeding...');

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

  console.log('Cleaned existing data');

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ticketbox.vn',
      passwordHash: hashPassword('admin123'),
      fullName: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const organizer1 = await prisma.user.create({
    data: {
      email: 'pops-organizer@ticketbox.vn',
      passwordHash: hashPassword('organizer123'),
      fullName: 'POPS Entertainment',
      role: Role.ORGANIZER,
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: 'cdm-organizer@ticketbox.vn',
      passwordHash: hashPassword('organizer123'),
      fullName: 'CDM Entertainment',
      role: Role.ORGANIZER,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@ticketbox.vn',
      passwordHash: hashPassword('staff123'),
      fullName: 'Checkin Staff',
      role: Role.STAFF,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@example.com',
      passwordHash: hashPassword('customer123'),
      fullName: 'Nguyen Van A',
      phone: '0909123456',
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@example.com',
      passwordHash: hashPassword('customer123'),
      fullName: 'Tran Thi B',
      phone: '0912345678',
      role: Role.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'customer3@example.com',
      passwordHash: hashPassword('customer123'),
      fullName: 'Le Van C',
      phone: '0987654321',
      role: Role.CUSTOMER,
    },
  });

  console.log('Created users');

  // Concert 1: Tokyo Girls Collection Vietnam 2026
  const tgcConcert = await prisma.concert.create({
    data: {
      organizerId: organizer1.id,
      title: 'TOKYO GIRLS COLLECTION in VIETNAM 2026',
      slug: 'tgc-vietnam-2026',
      description: 'Tokyo Girls Collection (TGC) - one of Japan most iconic fashion and cultural festivals - officially debuted in Vietnam. The event gathered leading artists and cultural icons from both Vietnam and Japan.',
      artistBio: 'W TOKYO and POPS Entertainment collaborated to bring this global cultural platform to Southeast Asia.',
      venue: 'Van Phuc City, Ho Chi Minh City, Vietnam',
      startsAt: new Date('2026-03-29T18:30:00'),
      saleStartsAt: new Date('2026-02-09T09:00:00'),
      saleEndsAt: new Date('2026-03-29T17:00:00'),
      status: ConcertStatus.COMPLETED,
      seatMapUrl: '/seatmaps/concerts/tgc-vietnam-2026.svg',
      coverImageUrl: 'https://popsww.com/tgc-vietnam-2026.jpg',
    },
  });

  // Ticket types for TGC
  const tgcTicketTypes = await Promise.all([
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'SKY LOUNGE',
        price: 5000000,
        totalQty: 50,
        soldQty: 50,
        reservedQty: 0,
        maxPerUser: 2,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'GINZA',
        price: 2800000,
        totalQty: 100,
        soldQty: 100,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'VIP 1',
        price: 2200000,
        totalQty: 200,
        soldQty: 180,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'SHIBUYA 1',
        price: 990000,
        totalQty: 500,
        soldQty: 500,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'SHIBUYA 2',
        price: 790000,
        totalQty: 500,
        soldQty: 450,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: tgcConcert.id,
        name: 'HARAJUKU 1',
        price: 550000,
        totalQty: 1000,
        soldQty: 800,
        reservedQty: 0,
        maxPerUser: 6,
        saleStartsAt: new Date('2026-02-09T09:00:00'),
        saleEndsAt: new Date('2026-03-29T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
  ]);

  console.log('Created TGC Vietnam 2026 concert and ticket types');

  await createGatesForConcert(prisma, tgcConcert.id, [
    'GATE-A',
    'GATE-B',
    'GATE-C',
  ]);

  // Concert 2: Kangin Fan Meeting
  const kanginConcert = await prisma.concert.create({
    data: {
      organizerId: organizer2.id,
      title: '2026 KANGIN FAN MEETING TOUR: STUNNING TOGETHER in HO CHI MINH CITY',
      slug: '2026-kangin-fan-meeting-in-ho-chi-minh',
      description: 'Kangin, former member of Super Junior, returns to Vietnam for his first fan meeting tour. An intimate opportunity for fans to meet their favorite K-pop idol.',
      artistBio: 'Kangin (Le Dong Bang) is a South Korean singer, actor, and former member of Super Junior.',
      venue: 'Ben Thanh Theater, Ho Chi Minh City, Vietnam',
      startsAt: new Date('2026-01-24T19:00:00'),
      saleStartsAt: new Date('2025-11-20T09:00:00'),
      saleEndsAt: new Date('2026-01-24T18:00:00'),
      status: ConcertStatus.COMPLETED,
      seatMapUrl: '/seatmaps/concerts/2026-kangin-fan-meeting-in-ho-chi-minh.svg',
      coverImageUrl: 'https://kangintour-2026.com/poster.jpg',
    },
  });

  // Ticket types for Kangin Fan Meeting
  const kanginTicketTypes = await Promise.all([
    prisma.ticketType.create({
      data: {
        concertId: kanginConcert.id,
        name: 'VIP',
        price: 3500000,
        totalQty: 100,
        soldQty: 100,
        reservedQty: 0,
        maxPerUser: 2,
        saleStartsAt: new Date('2025-11-20T09:00:00'),
        saleEndsAt: new Date('2026-01-24T18:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: kanginConcert.id,
        name: 'PATRON',
        price: 2500000,
        totalQty: 200,
        soldQty: 200,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2025-11-20T09:00:00'),
        saleEndsAt: new Date('2026-01-24T18:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: kanginConcert.id,
        name: 'GEN AD',
        price: 1500000,
        totalQty: 300,
        soldQty: 280,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2025-11-20T09:00:00'),
        saleEndsAt: new Date('2026-01-24T18:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
  ]);

  console.log('Created Kangin Fan Meeting concert and ticket types');

  await createGatesForConcert(prisma, kanginConcert.id, [
    'GATE-A',
    'GATE-B',
  ]);

  // Concert 3: Jessica's Reflections Concert
  const jessicaConcert = await prisma.concert.create({
    data: {
      organizerId: organizer1.id,
      title: "JESSICA'S REFLECTIONS CONCERT TOUR IN HO CHI MINH CITY 2026",
      slug: 'jessica-reflections-2026',
      description: "Jessica Jung, former member of Girls' Generation, brings her Reflections Concert Tour to Ho Chi Minh City. The concert falls on her birthday, making it an extra special event for fans.",
      artistBio: 'Jessica Jung is a South Korean-American singer, actress, and former member of Girls Generation (SNSD).',
      venue: 'Tan Binh Stadium, Ho Chi Minh City, Vietnam',
      startsAt: new Date('2026-04-18T18:30:00'),
      saleStartsAt: new Date('2026-02-24T09:00:00'),
      saleEndsAt: new Date('2026-04-18T17:00:00'),
      status: ConcertStatus.COMPLETED,
      seatMapUrl: '/seatmaps/concerts/jessica-reflections-2026.svg',
      coverImageUrl: 'https://ticketbox.vn/jessica-reflections-2026.jpg',
    },
  });

  // Ticket types for Jessica Concert
  const jessicaTicketTypes = await Promise.all([
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'SVIP-1',
        price: 5000000,
        totalQty: 100,
        soldQty: 100,
        reservedQty: 0,
        maxPerUser: 2,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'SVIP-2',
        price: 5000000,
        totalQty: 100,
        soldQty: 100,
        reservedQty: 0,
        maxPerUser: 2,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'VIP',
        price: 4250000,
        totalQty: 200,
        soldQty: 150,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'PRE',
        price: 3500000,
        totalQty: 300,
        soldQty: 200,
        reservedQty: 0,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'CAT1',
        price: 2750000,
        totalQty: 500,
        soldQty: 350,
        reservedQty: 0,
        maxPerUser: 6,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'CAT2',
        price: 2250000,
        totalQty: 500,
        soldQty: 300,
        reservedQty: 0,
        maxPerUser: 6,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: jessicaConcert.id,
        name: 'CAT3',
        price: 1500000,
        totalQty: 500,
        soldQty: 500,
        reservedQty: 0,
        maxPerUser: 6,
        saleStartsAt: new Date('2026-02-24T09:00:00'),
        saleEndsAt: new Date('2026-04-18T17:00:00'),
        status: TicketTypeStatus.SOLD_OUT,
      },
    }),
  ]);

  console.log('Created Jessica Reflections concert and ticket types');

  await createGatesForConcert(prisma, jessicaConcert.id, [
    'GATE-A',
    'GATE-B',
    'GATE-C',
    'GATE-D',
  ]);

  // Concert 4: Summer Music Festival Vietnam 2026
  const summerConcert = await prisma.concert.create({
    data: {
      organizerId: organizer1.id,
      title: 'SUMMER MUSIC FESTIVAL VIETNAM 2026',
      slug: 'summer-music-festival-2026',
      description: 'The biggest summer music festival in Vietnam featuring top international and local artists. Three days of non-stop music, performances, and entertainment.',
      artistBio: 'Featuring performances from international superstars and emerging Vietnamese artists.',
      venue: 'Quang Truong Ba Dinh, Ha Noi, Vietnam',
      startsAt: new Date('2026-07-08T18:00:00'),
      saleStartsAt: new Date('2026-05-01T09:00:00'),
      saleEndsAt: new Date('2026-07-08T17:00:00'),
      status: ConcertStatus.SALE_OPEN,
      seatMapUrl: '/seatmaps/concerts/summer-music-festival-2026.svg',
      coverImageUrl: 'https://ticketbox.vn/summer-festival-2026.jpg',
    },
  });

  // Ticket types for Summer Music Festival
  const summerTicketTypes = await Promise.all([
    prisma.ticketType.create({
      data: {
        concertId: summerConcert.id,
        name: 'PLATINUM PASS',
        price: 8500000,
        totalQty: 100,
        soldQty: 45,
        reservedQty: 10,
        maxPerUser: 2,
        saleStartsAt: new Date('2026-05-01T09:00:00'),
        saleEndsAt: new Date('2026-07-08T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: summerConcert.id,
        name: 'GOLD PASS',
        price: 5500000,
        totalQty: 300,
        soldQty: 180,
        reservedQty: 20,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-05-01T09:00:00'),
        saleEndsAt: new Date('2026-07-08T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: summerConcert.id,
        name: 'SILVER PASS',
        price: 3200000,
        totalQty: 500,
        soldQty: 320,
        reservedQty: 30,
        maxPerUser: 4,
        saleStartsAt: new Date('2026-05-01T09:00:00'),
        saleEndsAt: new Date('2026-07-08T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.create({
      data: {
        concertId: summerConcert.id,
        name: 'GENERAL ADMISSION',
        price: 1500000,
        totalQty: 2000,
        soldQty: 1200,
        reservedQty: 100,
        maxPerUser: 6,
        saleStartsAt: new Date('2026-05-01T09:00:00'),
        saleEndsAt: new Date('2026-07-08T17:00:00'),
        status: TicketTypeStatus.ACTIVE,
      },
    }),
  ]);

  console.log('Created Summer Music Festival concert and ticket types');

  await createGatesForConcert(prisma, summerConcert.id, [
    'GATE-A',
    'GATE-B',
    'GATE-C',
    'GATE-D',
    'GATE-E',
  ]);
  console.log('Created gates for all concerts');

  // Create sample orders with tickets
  // Order 1: Customer 1 bought TGC tickets
  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      concertId: tgcConcert.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 5800000,
      paidAt: new Date('2026-02-15T14:30:00'),
      expiresAt: new Date('2026-02-15T14:45:00'),
    },
  });

  const orderItem1 = await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      ticketTypeId: tgcTicketTypes[1].id, // GINZA
      quantity: 1,
      unitPrice: 2800000,
      subtotal: 2800000,
    },
  });

  const orderItem2 = await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      ticketTypeId: tgcTicketTypes[4].id, // SHIBUYA 2
      quantity: 2,
      unitPrice: 790000,
      subtotal: 1580000,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order1.id,
      provider: PaymentProvider.MOCK,
      status: PaymentStatus.SUCCESS,
      amount: 5800000,
      providerTransactionId: 'MOCK_TGC_001',
      receivedAt: new Date('2026-02-15T14:30:00'),
    },
  });

  // Tickets for order 1
  for (let i = 0; i < 3; i++) {
    await prisma.ticket.create({
      data: {
        orderId: order1.id,
        orderItemId: i === 0 ? orderItem1.id : orderItem2.id,
        concertId: tgcConcert.id,
        ticketTypeId: i === 0 ? tgcTicketTypes[1].id : tgcTicketTypes[4].id,
        userId: customer1.id,
        qrTokenHash: hashPassword(generateQrToken()),
        status: TicketStatus.ISSUED,
      },
    });
  }

  // Order 2: Customer 2 bought Jessica tickets
  const order2 = await prisma.order.create({
    data: {
      userId: customer2.id,
      concertId: jessicaConcert.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 9250000,
      paidAt: new Date('2026-03-01T10:15:00'),
      expiresAt: new Date('2026-03-01T10:30:00'),
    },
  });

  const orderItem3 = await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      ticketTypeId: jessicaTicketTypes[2].id, // VIP
      quantity: 1,
      unitPrice: 4250000,
      subtotal: 4250000,
    },
  });

  const orderItem4 = await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      ticketTypeId: jessicaTicketTypes[4].id, // CAT1
      quantity: 2,
      unitPrice: 2750000,
      subtotal: 5000000,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order2.id,
      provider: PaymentProvider.MOMO,
      status: PaymentStatus.SUCCESS,
      amount: 9250000,
      providerTransactionId: 'MOMO_JESS_001',
      receivedAt: new Date('2026-03-01T10:15:00'),
    },
  });

  // Tickets for order 2
  for (let i = 0; i < 3; i++) {
    await prisma.ticket.create({
      data: {
        orderId: order2.id,
        orderItemId: i === 0 ? orderItem3.id : orderItem4.id,
        concertId: jessicaConcert.id,
        ticketTypeId: i === 0 ? jessicaTicketTypes[2].id : jessicaTicketTypes[4].id,
        userId: customer2.id,
        qrTokenHash: hashPassword(generateQrToken()),
        status: i === 2 ? TicketStatus.CHECKED_IN : TicketStatus.ISSUED,
        checkedInAt: i === 2 ? new Date('2026-04-18T18:45:00') : null,
      },
    });
  }

  // Order 3: Customer 3 bought Kangin tickets
  const order3 = await prisma.order.create({
    data: {
      userId: customer3.id,
      concertId: kanginConcert.id,
      status: OrderStatus.PAID,
      totalAmountInVnd: 4000000,
      paidAt: new Date('2025-12-10T16:20:00'),
      expiresAt: new Date('2025-12-10T16:35:00'),
    },
  });

  const orderItem5 = await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      ticketTypeId: kanginTicketTypes[0].id, // VIP
      quantity: 1,
      unitPrice: 3500000,
      subtotal: 3500000,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order3.id,
      provider: PaymentProvider.VNPAY,
      status: PaymentStatus.SUCCESS,
      amount: 4000000,
      providerTransactionId: 'VNPAY_KAN_001',
      receivedAt: new Date('2025-12-10T16:20:00'),
    },
  });

  // Ticket for order 3
  const ticket3 = await prisma.ticket.create({
    data: {
      orderId: order3.id,
      orderItemId: orderItem5.id,
      concertId: kanginConcert.id,
      ticketTypeId: kanginTicketTypes[0].id,
      userId: customer3.id,
      qrTokenHash: hashPassword(generateQrToken()),
      status: TicketStatus.CHECKED_IN,
      checkedInAt: new Date('2026-01-24T19:15:00'),
    },
  });

  // Checkin logs
  await prisma.checkinLog.create({
    data: {
      ticketId: ticket3.id,
      staffId: staff.id,
      concertId: kanginConcert.id,
      deviceId: 'CHECKIN-Device-001',
      gate: 'Gate A',
      status: 'SUCCESS' as any,
      scannedAt: new Date('2026-01-24T19:15:00'),
    },
  });

  // Pending order (not paid yet)
  const pendingOrder = await prisma.order.create({
    data: {
      userId: customer1.id,
      concertId: jessicaConcert.id,
      status: OrderStatus.PENDING_PAYMENT,
      totalAmountInVnd: 5000000,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    },
  });

  const pendingOrderItem = await prisma.orderItem.create({
    data: {
      orderId: pendingOrder.id,
      ticketTypeId: jessicaTicketTypes[3].id, // PRE
      quantity: 1,
      unitPrice: 3500000,
      subtotal: 3500000,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: pendingOrder.id,
      provider: PaymentProvider.MOCK,
      status: PaymentStatus.INITIATED,
      amount: 5000000,
    },
  });

  // Guest list entries for TGC
  await prisma.guestListEntry.createMany({
    data: [
      {
        concertId: tgcConcert.id,
        fullName: 'VIP Guest 1',
        email: 'vip1@tgc.com',
        phone: '0901000001',
        sponsorName: 'Acecook Vietnam',
        checkedInAt: new Date('2026-03-29T18:00:00'),
      },
      {
        concertId: tgcConcert.id,
        fullName: 'VIP Guest 2',
        email: 'vip2@tgc.com',
        phone: '0901000002',
        sponsorName: 'POPS',
      },
      {
        concertId: tgcConcert.id,
        fullName: 'Press Guest',
        email: 'press@tgc.com',
        sponsorName: 'VTV',
      },
    ],
  });

  console.log('Created orders, tickets, payments, and guest list entries');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
