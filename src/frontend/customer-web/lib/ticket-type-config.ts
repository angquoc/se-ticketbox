/**
 * @deprecated Cấu hình seatmap đã chuyển sang public/seatmaps/configs/{slug}.json
 * File này giữ lại re-export để tương thích ngược.
 */
export {
  buildFallbackLayout,
  normalizeTicketTypeName,
  slugPrefixFromName,
  type TicketTypeZoneLayout,
} from '@/lib/seat-layout-helpers';
