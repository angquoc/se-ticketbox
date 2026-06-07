import { RedisService, RedisClient } from './redis.service';
import { ConfigService } from '@nestjs/config';

// ─── Test utilities ─────────────────────────────────────────────────────────────

function makeMockConfigService(): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string, fallback?: string) => {
      if (key === 'redis.url') return 'redis://localhost:6379';
      return fallback;
    }),
  } as unknown as ConfigService;
}

/**
 * Builds a RedisService with a fake client whose evalsha/eval are real jest spies.
 * Tests can control exactly what each call returns via spy.mockReturnValueOnce().
 */
function buildService(): {
  service: RedisService;
  evalshaSpy: jest.Mock;
  evalSpy: jest.Mock;
  scriptSpy: jest.Mock;
} {
  const evalshaSpy = jest.fn();
  const evalSpy = jest.fn();
  const scriptSpy = jest.fn().mockResolvedValue('mock_sha_abc123');

  const mockClient = {
    script: scriptSpy,
    evalsha: evalshaSpy,
    eval: evalSpy,
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  } as unknown as RedisClient;

  const configService = makeMockConfigService();
  const service = new RedisService(configService, mockClient);

  return { service, evalshaSpy, evalSpy, scriptSpy };
}

// ─── Helpers to construct expected Lua script JSON responses ─────────────────────

const ok = (extra: Record<string, unknown> = {}) => ({ ok: true, step: 'SUCCESS', error: null, message: '', ...extra });
const fail = (step: string, error: string, extra: Record<string, unknown> = {}) =>
  ({ ok: false, step, error, message: '', ...extra });

function reserveSuccess(newStock: number, newUserQty: number, orderId: string, ttl = 900) {
  return JSON.stringify(ok({
    reserved_qty: 2,
    new_stock: newStock,
    new_user_qty: newUserQty,
    expires_in_seconds: ttl,
    order_id: orderId,
    message: 'Ticket reservation successful',
  }));
}

function releaseSuccess(newStock: number, newUserQty: number, orderId: string) {
  return JSON.stringify(ok({
    released_qty: 2,
    new_stock: newStock,
    new_user_qty: newUserQty,
    order_id: orderId,
    message: 'Ticket release successful',
  }));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('RedisService — reserveTicket', () => {
  // ══════════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ══════════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should return ok=true and correct stock/user-limit on success', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(reserveSuccess(98, 2, 'order_001'));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(true);
      expect(result.step).toBe('SUCCESS');
      expect(result.error).toBeNull();
      expect(result.reserved_qty).toBe(2);
      expect(result.new_stock).toBe(98);
      expect(result.new_user_qty).toBe(2);
    });

    it('should call evalsha with correct keys and args', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(reserveSuccess(5, 5, 'order_002'));

      await service.onModuleInit();
      await service.reserveTicket({
        ticketTypeId: 'ticket_std_001',
        userId: 'user_002',
        orderId: 'order_002',
        quantity: 5,
        maxPerUser: 5,
        ttlSeconds: 600,
      });

      expect(evalshaSpy).toHaveBeenCalledTimes(1);
      const call = evalshaSpy.mock.calls[0] as [string, number, ...(string | number)[]];
      // call[0] = sha, call[1] = numKeys, call[2] = key1, call[3] = key2, call[4] = key3,
      // call[5] = arg1(quantity), call[6] = arg2(maxPerUser), call[7] = arg3(ttlSeconds),
      // call[8] = arg4(orderId), call[9] = arg5(userId), call[10] = arg6(ticketTypeId)
      expect(call[1]).toBe(3); // 3 keys
      expect(call[2]).toBe('stock:ticket_std_001');
      expect(call[3]).toBe('user_limit:user_002:ticket_std_001');
      expect(call[4]).toBe('reservation:order_002');
      expect(call[5]).toBe(5);  // quantity
      expect(call[6]).toBe(5);  // maxPerUser
      expect(call[7]).toBe(600); // ttlSeconds
      expect(call[8]).toBe('order_002');
      expect(call[9]).toBe('user_002');
      expect(call[10]).toBe('ticket_std_001');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // OUT_OF_STOCK
  // ══════════════════════════════════════════════════════════════════════════════

  describe('OUT_OF_STOCK', () => {
    it('should reject when stock is 0', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('STOCK_CHECK', 'OUT_OF_STOCK', {
        remaining_stock: 0,
        requested_qty: 1,
        message: 'Not enough tickets available',
      })));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('STOCK_CHECK');
      expect(result.error).toBe('OUT_OF_STOCK');
      expect(result.remaining_stock).toBe(0);
      expect(result.requested_qty).toBe(1);
    });

    it('should reject when stock < requested quantity', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('STOCK_CHECK', 'OUT_OF_STOCK', {
        remaining_stock: 3,
        requested_qty: 5,
        message: 'Not enough tickets available',
      })));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 5,
        maxPerUser: 10,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('STOCK_CHECK');
      expect(result.error).toBe('OUT_OF_STOCK');
      expect(result.remaining_stock).toBe(3);
    });

    it('should reject when stock key does not exist (concert not on sale)', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('STOCK_CHECK', 'OUT_OF_STOCK', {
        remaining_stock: 0,
        requested_qty: 1,
        message: 'Not enough tickets available',
      })));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'nonexistent_ticket',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('OUT_OF_STOCK');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // EXCEED_USER_LIMIT
  // ══════════════════════════════════════════════════════════════════════════════

  describe('EXCEED_USER_LIMIT', () => {
    it('should reject when (current + requested) > maxPerUser', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('USER_LIMIT_CHECK', 'EXCEED_USER_LIMIT', {
        user_current_qty: 3,
        requested_qty: 2,
        max_per_user: 4,
        remaining_can_buy: 1,
        message: 'Purchase would exceed per-user ticket limit',
      })));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('USER_LIMIT_CHECK');
      expect(result.error).toBe('EXCEED_USER_LIMIT');
      expect(result.user_current_qty).toBe(3);
      expect(result.remaining_can_buy).toBe(1);
    });

    it('should reject when user already at exact limit', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('USER_LIMIT_CHECK', 'EXCEED_USER_LIMIT', {
        user_current_qty: 4,
        requested_qty: 1,
        max_per_user: 4,
        remaining_can_buy: 0,
        message: 'Purchase would exceed per-user ticket limit',
      })));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('EXCEED_USER_LIMIT');
      expect(result.remaining_can_buy).toBe(0);
    });

    it('should allow buying up to exactly the limit', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(reserveSuccess(96, 4, 'order_001'));

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(true);
      expect(result.new_user_qty).toBe(4);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // RESERVATION_ALREADY_EXISTS (idempotency)
  // ══════════════════════════════════════════════════════════════════════════════

  describe('RESERVATION_ALREADY_EXISTS (idempotency)', () => {
    it('should reject duplicate orderId reservation', async () => {
      const { service, evalshaSpy } = buildService();
      // First call succeeds, second call (duplicate) fails
      evalshaSpy
        .mockResolvedValueOnce(reserveSuccess(98, 2, 'order_001'))
        .mockResolvedValueOnce(JSON.stringify(fail('RESERVATION_EXISTS', 'RESERVATION_ALREADY_EXISTS', {
          order_id: 'order_001',
          message: 'Reservation already exists, possible duplicate request',
        })));

      await service.onModuleInit();

      const r1 = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
        maxPerUser: 4,
        ttlSeconds: 900,
      });
      expect(r1.ok).toBe(true);

      const r2 = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
        maxPerUser: 4,
        ttlSeconds: 900,
      });
      expect(r2.ok).toBe(false);
      expect(r2.step).toBe('RESERVATION_EXISTS');
      expect(r2.error).toBe('RESERVATION_ALREADY_EXISTS');
    });

    it('should allow same user + ticket type with different orderId', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy
        .mockResolvedValueOnce(reserveSuccess(99, 1, 'order_001'))
        .mockResolvedValueOnce(reserveSuccess(98, 2, 'order_002'));

      await service.onModuleInit();

      await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      const r2 = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_002',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(r2.ok).toBe(true);
      expect(r2.new_user_qty).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ══════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should correctly track stock across multiple sequential reservations', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy
        .mockResolvedValueOnce(reserveSuccess(7, 3, 'order_001'))   // 10 - 3 = 7
        .mockResolvedValueOnce(reserveSuccess(3, 3, 'order_002'))   // 7 - 4 = 3
        .mockResolvedValueOnce(JSON.stringify(fail('STOCK_CHECK', 'OUT_OF_STOCK', {
          remaining_stock: 3,
          requested_qty: 4,
          message: 'Not enough tickets available',
        }))); // 3 < 4 → OUT_OF_STOCK

      await service.onModuleInit();

      await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 3,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_002',
        orderId: 'order_002',
        quantity: 4,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      const r3 = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_003',
        orderId: 'order_003',
        quantity: 4,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(r3.ok).toBe(false);
      expect(r3.error).toBe('OUT_OF_STOCK');
    });

    it('should handle non-ok responses (script threw unexpected error)', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce('{"ok":false,"step":"UNKNOWN","error":"INTERNAL_ERROR"}');

      await service.onModuleInit();
      const result = await service.reserveTicket({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 1,
        maxPerUser: 4,
        ttlSeconds: 900,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('INTERNAL_ERROR');
    });
  });
});

describe('RedisService — releaseReservation', () => {
  // ══════════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ══════════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should return ok=true and correct restored stock on success', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(releaseSuccess(100, 0, 'order_001'));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.step).toBe('SUCCESS');
      expect(result.error).toBeNull();
      expect(result.released_qty).toBe(2);
      expect(result.new_stock).toBe(100);
      expect(result.new_user_qty).toBe(0);
    });

    it('should call evalsha with correct keys and args', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(releaseSuccess(100, 0, 'order_001'));

      await service.onModuleInit();
      await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(evalshaSpy).toHaveBeenCalledTimes(1);
      const call = evalshaSpy.mock.calls[0] as [string, number, ...(string | number)[]];
      // call[0] = sha, call[1] = numKeys, call[2] = key1, call[3] = key2, call[4] = key3,
      // call[5] = arg1(quantity), call[6] = arg2(orderId), call[7] = arg3(userId), call[8] = arg4(ticketTypeId)
      expect(call[1]).toBe(3);
      expect(call[2]).toBe('stock:ticket_vip_001');
      expect(call[3]).toBe('user_limit:user_001:ticket_vip_001');
      expect(call[4]).toBe('reservation:order_001');
      expect(call[5]).toBe(2); // quantity
      expect(call[6]).toBe('order_001');
      expect(call[7]).toBe('user_001');
      expect(call[8]).toBe('ticket_vip_001');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ERROR CASES
  // ══════════════════════════════════════════════════════════════════════════════

  describe('RESERVATION_NOT_FOUND', () => {
    it('should reject when reservation key does not exist', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('RESERVATION_NOT_FOUND', 'RESERVATION_NOT_FOUND', {
        order_id: 'nonexistent_order',
        message: 'Reservation not found, may have already been released',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'nonexistent_order',
        quantity: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('RESERVATION_NOT_FOUND');
      expect(result.error).toBe('RESERVATION_NOT_FOUND');
    });

    it('should reject double-release (idempotent at reservation level)', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy
        .mockResolvedValueOnce(releaseSuccess(100, 0, 'order_001'))
        .mockResolvedValueOnce(JSON.stringify(fail('RESERVATION_NOT_FOUND', 'RESERVATION_NOT_FOUND', {
          order_id: 'order_001',
          message: 'Reservation not found, may have already been released',
        })));

      await service.onModuleInit();

      await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      const r2 = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(r2.ok).toBe(false);
      expect(r2.error).toBe('RESERVATION_NOT_FOUND');
    });
  });

  describe('ORDER_ID_MISMATCH', () => {
    it('should reject when orderId does not match reservation', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('ORDER_ID_MISMATCH', 'ORDER_ID_MISMATCH', {
        expected: 'wrong_order_id',
        actual: 'order_001',
        message: 'Order ID in reservation does not match request',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'wrong_order_id',
        quantity: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('ORDER_ID_MISMATCH');
      expect(result.error).toBe('ORDER_ID_MISMATCH');
      expect(result.expected).toBe('wrong_order_id');
      expect(result.actual).toBe('order_001');
    });

    it('should NOT modify stock when order_id mismatch checkpoint fails', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('ORDER_ID_MISMATCH', 'ORDER_ID_MISMATCH', {
        expected: 'wrong_order_id',
        actual: 'order_001',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'wrong_order_id',
        quantity: 2,
      });

      // The checkpoint should abort before any write operations
      expect(result.ok).toBe(false);
      expect(result.step).toBe('ORDER_ID_MISMATCH');
    });
  });

  describe('USER_ID_MISMATCH', () => {
    it('should reject when userId does not match', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('USER_ID_MISMATCH', 'USER_ID_MISMATCH', {
        expected: 'wrong_user_id',
        actual: 'user_001',
        message: 'User ID in reservation does not match request',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'wrong_user_id',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('USER_ID_MISMATCH');
      expect(result.error).toBe('USER_ID_MISMATCH');
    });
  });

  describe('TICKET_TYPE_MISMATCH', () => {
    it('should reject when ticketTypeId does not match', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('TICKET_TYPE_MISMATCH', 'TICKET_TYPE_MISMATCH', {
        expected: 'wrong_ticket_type',
        actual: 'ticket_vip_001',
        message: 'Ticket type ID in reservation does not match request',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'wrong_ticket_type',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('TICKET_TYPE_MISMATCH');
      expect(result.error).toBe('TICKET_TYPE_MISMATCH');
    });
  });

  describe('QUANTITY_MISMATCH', () => {
    it('should reject when release quantity differs from reservation', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(fail('QUANTITY_MISMATCH', 'QUANTITY_MISMATCH', {
        expected: 2,
        actual: 3,
        message: 'Requested release quantity does not match reservation',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(false);
      expect(result.step).toBe('QUANTITY_MISMATCH');
      expect(result.error).toBe('QUANTITY_MISMATCH');
      expect(result.expected).toBe(2);
      expect(result.actual).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ══════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should reset user_limit to 0 if it would go negative (data inconsistency)', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce(JSON.stringify(ok({
        released_qty: 2,
        new_stock: 100,
        new_user_qty: 0, // Lua clamps to 0 when user_limit would go negative
        order_id: 'order_001',
        message: 'Ticket release successful',
      })));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.new_user_qty).toBe(0);
    });

    it('should fall back to eval if evalsha fails with NOSCRIPT', async () => {
      const { service, evalshaSpy, evalSpy } = buildService();
      // First call: evalsha fails with NOSCRIPT (script not cached — e.g. Redis restarted)
      evalshaSpy.mockRejectedValueOnce(new Error('NOSCRIPT No matching script'));
      // Second call: eval succeeds
      evalSpy.mockResolvedValueOnce(releaseSuccess(100, 0, 'order_001'));

      await service.onModuleInit();
      const result = await service.releaseReservation({
        ticketTypeId: 'ticket_vip_001',
        userId: 'user_001',
        orderId: 'order_001',
        quantity: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.new_stock).toBe(100);
    });

    it('should throw if script returns non-string', async () => {
      const { service, evalshaSpy } = buildService();
      evalshaSpy.mockResolvedValueOnce({ ok: true }); // object, not string

      await service.onModuleInit();
      await expect(
        service.releaseReservation({
          ticketTypeId: 'ticket_vip_001',
          userId: 'user_001',
          orderId: 'order_001',
          quantity: 2,
        }),
      ).rejects.toThrow('non-string');
    });
  });
});
