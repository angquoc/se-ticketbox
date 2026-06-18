'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Field, TextInput, TextArea } from '@/components/ui/FormField';
import { InlineSpinner } from '@/components/ui/Spinner';
import FormSection from '@/components/events/FormSection';
import TierCard from '@/components/events/TierCard';
import { type TicketTierDraft, type EventFormErrors, makeTierId, validateEventForm } from '@/types/events';
// ── Success State ──────────────────────────────────────────────────────

function SuccessState() {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', minHeight: '400px',
      }}
    >
      <div
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 600, color: '#191B23', margin: 0 }}>Event Created!</p>
      <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>Redirecting to event list…</p>
    </div>
  );
}

// ── Validation Summary ─────────────────────────────────────────────────

function ValidationSummary({ errors }: { errors: EventFormErrors }) {
  const messages = Object.values(errors);
  if (messages.length === 0) return null;
  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '6px',
      }}
    >
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', margin: '0 0 6px' }}>
        Please fix the following errors:
      </p>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {messages.map((msg, i) => (
          <li key={i} style={{ fontSize: '12px', color: '#BA1A1A' }}>
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter();

  // Form state
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [venue,       setVenue]       = useState('');
  const [eventDate,   setEventDate]   = useState('');
  const [startTime,   setStartTime]   = useState('19:00');
  const [endTime,     setEndTime]     = useState('23:00');
  const [saleDate,    setSaleDate]    = useState('');
  const [saleEndDate, setSaleEndDate] = useState('');

  const [tiers, setTiers] = useState<TicketTierDraft[]>([
    { id: makeTierId(), name: 'General Admission', price: '500000', totalQty: '1000', maxPerUser: 4 },
  ]);

  const [errors,     setErrors]     = useState<EventFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Tier helpers
  const addTier = () =>
    setTiers((prev) => [...prev, { id: makeTierId(), name: '', price: '', totalQty: '', maxPerUser: 4 }]);

  const removeTier = (id: string) =>
    setTiers((prev) => prev.filter((t) => t.id !== id));

  const updateTier = (id: string, field: keyof TicketTierDraft, value: string | number) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateEventForm({ title, venue, eventDate, startTime, endTime, tiers });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      // TODO: Replace with real API calls
      // const dto: CreateConcertDto = {
      //   title, description: description || undefined, venue,
      //   startsAt: toIso(eventDate, startTime),
      //   endsAt: toIso(eventDate, endTime),
      //   saleStartsAt: saleDate ? toIso(saleDate, '00:00') : undefined,
      //   saleEndsAt: saleEndDate ? toIso(saleEndDate, '23:59') : undefined,
      // };
      // const concert = await createConcert(dto);
      // await Promise.all(tiers.map((t) => createTicketType(concert.id, {
      //   name: t.name, price: Number(t.price), totalQty: Number(t.totalQty), maxPerUser: t.maxPerUser,
      // })));
      // router.push(`/events/${concert.id}`);

      await new Promise((r) => setTimeout(r, 1200)); // simulate
      setSubmitted(true);
      setTimeout(() => router.push('/events'), 1000);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SuccessState />;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '1000px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Link href="/events" style={{ color: '#9CA3AF', fontSize: '13px', textDecoration: 'none' }}>Events</Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ fontSize: '13px', color: '#434654' }}>New Event</span>
          </div>
          <h1 style={{ fontWeight: 700, fontSize: '28px', letterSpacing: '-0.5px', color: '#191B23', margin: 0 }}>
            Create New Event
          </h1>
          <p style={{ fontSize: '14px', color: '#434654', margin: '6px 0 0' }}>
            Fill in the details below to create a new concert or festival.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <Link
            href="/events"
            style={{
              display: 'inline-flex', alignItems: 'center',
              height: '34px', padding: '0 14px',
              border: '1px solid #C3C5D7', borderRadius: '4px',
              background: '#FFFFFF', color: '#434654',
              fontSize: '13px', fontWeight: 500, textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            style={{
              height: '34px', padding: '0 18px',
              border: 'none', borderRadius: '4px',
              background: submitting ? '#6B8CC7' : '#003298',
              color: '#FFFFFF',
              fontSize: '13px', fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.15s',
            }}
          >
            {submitting && <InlineSpinner />}
            {submitting ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>

      {/* ── Form Card ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          borderRadius: '8px',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {/* Basic Info */}
        <FormSection
          title="Basic Information"
          description="Name and description of your event visible to ticket buyers."
        >
          <Field label="Concert Title" required error={errors.title}>
            <TextInput value={title} onChange={setTitle} placeholder="e.g. Neon Nights Festival 2025" hasError={!!errors.title} />
          </Field>
          <Field label="Description">
            <TextArea value={description} onChange={setDescription} placeholder="Describe the event — artists, atmosphere, highlights…" rows={4} />
          </Field>
        </FormSection>

        {/* Location & Schedule */}
        <FormSection title="Location & Schedule" description="Where and when the event will take place.">
          <Field label="Venue" required error={errors.venue}>
            <TextInput value={venue} onChange={setVenue} placeholder="e.g. Sân vận động Mỹ Đình, Hà Nội" hasError={!!errors.venue} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field label="Event Date" required error={errors.eventDate}>
              <TextInput value={eventDate} onChange={setEventDate} type="date" hasError={!!errors.eventDate} />
            </Field>
            <Field label="Start Time" required error={errors.startTime}>
              <TextInput value={startTime} onChange={setStartTime} type="time" hasError={!!errors.startTime} />
            </Field>
            <Field label="End Time" required error={errors.endTime}>
              <TextInput value={endTime} onChange={setEndTime} type="time" hasError={!!errors.endTime} />
            </Field>
          </div>
        </FormSection>

        {/* Sale Window */}
        <FormSection title="Sale Window" description="When ticket sales open and close. Leave blank to set later.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Sale Opens">
              <TextInput value={saleDate} onChange={setSaleDate} type="date" />
            </Field>
            <Field label="Sale Closes">
              <TextInput value={saleEndDate} onChange={setSaleEndDate} type="date" />
            </Field>
          </div>
        </FormSection>

        {/* Ticket Types */}
        <FormSection
          title="Ticket Types"
          description="Define ticket categories, pricing and capacity. At least one tier is required."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tiers.map((tier, idx) => (
              <TierCard
                key={tier.id}
                tier={tier}
                index={idx}
                onChange={updateTier}
                onRemove={removeTier}
                canRemove={tiers.length > 1}
                errors={errors}
              />
            ))}

            <button
              type="button"
              onClick={addTier}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px',
                border: '1px dashed #C3C5D7', borderRadius: '6px',
                background: 'transparent', color: '#434654',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#003298';
                (e.currentTarget as HTMLButtonElement).style.color = '#003298';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#C3C5D7';
                (e.currentTarget as HTMLButtonElement).style.color = '#434654';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Another Ticket Type
            </button>
          </div>

          <ValidationSummary errors={errors} />
        </FormSection>
      </div>
    </form>
  );
}
