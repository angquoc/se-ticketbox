import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createConcert, createTicketType } from '@/services/concertService';
import { type TicketTierDraft, type EventFormErrors, makeTierId, validateEventForm } from '@/types/events';

// Helper to convert date & time strings into ISO strings for backend
function toIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

function slugify(text: string): string {
  const baseSlug = text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}

export function useNewEventForm() {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [saleDate, setSaleDate] = useState('');
  const [saleEndDate, setSaleEndDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [seatMapUrl, setSeatMapUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  const [tiers, setTiers] = useState<TicketTierDraft[]>([
    { id: makeTierId(), name: 'General Admission', price: '500000', totalQty: '1000', maxPerUser: 4 },
  ]);

  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addTier = () =>
    setTiers((prev) => [...prev, { id: makeTierId(), name: '', price: '', totalQty: '', maxPerUser: 4 }]);

  const removeTier = (id: string) =>
    setTiers((prev) => prev.filter((t) => t.id !== id));

  const updateTier = (id: string, field: keyof TicketTierDraft, value: string | number) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateEventForm({ title, venue, eventDate, startTime, endTime, tiers });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      // 1. Create Concert DTO
      const endsAtValue = toIso(eventDate, endTime);
      const metadata = `\n<!-- metadata:endsAt=${endsAtValue} -->`;
      
      const dto = {
        title,
        slug: slugify(title),
        description: description ? description + metadata : metadata,
        venue,
        startsAt: toIso(eventDate, startTime),
        endsAt: endsAtValue,
        saleStartsAt: saleDate ? toIso(saleDate, '00:00') : undefined,
        saleEndsAt: saleEndDate ? toIso(saleEndDate, '23:59') : undefined,
        coverImageUrl: coverImageUrl || undefined,
        seatMapUrl: seatMapUrl || undefined,
        status,
      };

      const concert = await createConcert(dto);


      const eventSaleStartsAt = saleDate ? toIso(saleDate, '00:00') : new Date().toISOString();
      const eventSaleEndsAt = saleEndDate ? toIso(saleEndDate, '23:59') : undefined;

      // 2. Create Ticket Types for each tier
      await Promise.all(
        tiers.map((t) =>
          createTicketType(concert.id, {
            name: t.name,
            price: Number(t.price),
            totalQty: Number(t.totalQty),
            maxPerUser: Number(t.maxPerUser),
            saleStartsAt: eventSaleStartsAt,
            saleEndsAt: eventSaleEndsAt,
          })
        )
      );


      setSubmitted(true);
      setTimeout(() => router.push('/events'), 1000);
    } catch (err) {
      console.error('Failed to create concert:', err);
      setErrors((prev) => ({ ...prev, submit: 'Failed to create event. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    title, setTitle,
    description, setDescription,
    venue, setVenue,
    eventDate, setEventDate,
    startTime, setStartTime,
    endTime, setEndTime,
    saleDate, setSaleDate,
    saleEndDate, setSaleEndDate,
    coverImageUrl, setCoverImageUrl,
    seatMapUrl, setSeatMapUrl,
    status, setStatus,
    tiers,
    addTier,
    removeTier,
    updateTier,
    errors,
    submitting,
    submitted,
    handleSubmit,
  };
}
