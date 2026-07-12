'use client';

import Link from 'next/link';
import { Field, TextInput, TextArea } from '@/components/ui/FormField';
import { InlineSpinner } from '@/components/ui/Spinner';
import FormSection from '@/components/events/FormSection';
import TierCard from '@/components/events/TierCard';
import SuccessState from '@/components/events/SuccessState';
import ValidationSummary from '@/components/events/ValidationSummary';
import { useNewEventForm } from '@/hooks/useNewEventForm';

// ── Main Page ──────────────────────────────────────────────────────────

export default function NewEventPage() {
  const {
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
  } = useNewEventForm();

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

        {/* Media & Assets */}
        <FormSection title="Media & Assets" description="Cover image and seat map URLs. Can be updated after creation.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Cover Image URL">
              <TextInput
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                placeholder="https://example.com/cover.jpg"
              />
            </Field>
            <Field label="Seat Map URL">
              <TextInput
                value={seatMapUrl}
                onChange={setSeatMapUrl}
                placeholder="/seatmaps/concerts/your-concert-slug.svg"
              />
            </Field>
          </div>
          {coverImageUrl && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>Cover Preview</p>
              <img
                src={coverImageUrl}
                alt="Cover preview"
                style={{
                  width: '100%',
                  maxHeight: '160px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid #C3C5D7',
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </FormSection>

        {/* Initial Status */}
        <FormSection title="Publishing Status" description="Set the initial status of the event. Use DRAFT to continue editing before publishing.">
          <Field label="Event Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
              style={{
                height: '36px',
                border: '1px solid #C3C5D7',
                borderRadius: '4px',
                padding: '0 10px',
                fontSize: '13px',
                color: '#191B23',
                background: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
                width: '100%',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                appearance: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#003298')}
              onBlur={(e) => (e.target.style.borderColor = '#C3C5D7')}
            >
              <option value="DRAFT">Draft — not visible to public</option>
              <option value="PUBLISHED">Published — visible to public</option>
            </select>
          </Field>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
            {status === 'DRAFT'
              ? 'Draft: Event is saved but hidden from customers.'
              : 'Published: Event will be visible on the customer site.'}
          </p>
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
