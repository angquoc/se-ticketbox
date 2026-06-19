/**
 * events.ts
 * Local TypeScript types dùng riêng cho feature Events (form state, UI state).
 * Phân biệt với src/types/api.ts là các types phản ánh Backend DTO.
 */

/** Draft state của một ticket tier trong form tạo/chỉnh sửa sự kiện */
export interface TicketTierDraft {
  id: string;
  name: string;
  /** string để dễ handle input type="number", chuyển sang number khi submit */
  price: string;
  totalQty: string;
  maxPerUser: number;
}

/** Errors map cho form tạo sự kiện */
export type EventFormErrors = Record<string, string>;

/** Hàm tạo unique ID cho tier mới */
export function makeTierId(): string {
  return `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Validate form tạo sự kiện, trả về errors map */
export function validateEventForm(form: {
  title: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  tiers: TicketTierDraft[];
}): EventFormErrors {
  const errs: EventFormErrors = {};
  if (!form.title.trim()) errs.title = 'Concert title is required';
  if (!form.venue.trim()) errs.venue = 'Venue is required';
  if (!form.eventDate) errs.eventDate = 'Event date is required';
  if (!form.startTime) errs.startTime = 'Start time is required';
  if (!form.endTime) errs.endTime = 'End time is required';
  form.tiers.forEach((t) => {
    if (!t.name.trim()) errs[`${t.id}.name`] = 'Name is required';
    if (!t.price || isNaN(Number(t.price)) || Number(t.price) < 0)
      errs[`${t.id}.price`] = 'Valid price is required';
    if (!t.totalQty || isNaN(Number(t.totalQty)) || Number(t.totalQty) < 1)
      errs[`${t.id}.totalQty`] = 'Min 1 ticket required';
  });
  return errs;
}
