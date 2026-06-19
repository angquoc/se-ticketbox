'use client';

/**
 * TierCard.tsx
 * Form card cho một ticket tier trong trang /events/new.
 * Cho phép chỉnh sửa name, price, totalQty, maxPerUser.
 */

import { Field, TextInput } from '@/components/ui/FormField';
import type { TicketTierDraft, EventFormErrors } from '@/types/events';

export interface TierCardProps {
  tier: TicketTierDraft;
  index: number;
  onChange: (id: string, field: keyof TicketTierDraft, value: string | number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  errors: EventFormErrors;
}

export default function TierCard({
  tier,
  index,
  onChange,
  onRemove,
  canRemove,
  errors,
}: TierCardProps) {
  return (
    <div
      style={{
        border: '1px solid #C3C5D7',
        borderRadius: '6px',
        padding: '16px',
        background: '#FAFAFA',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#434654',
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
          }}
        >
          Tier {index + 1}
        </span>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(tier.id)}
            title="Remove tier"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: '12px' }}>
        <Field label="Name" required error={errors[`${tier.id}.name`]}>
          <TextInput
            value={tier.name}
            onChange={(v) => onChange(tier.id, 'name', v)}
            placeholder="e.g. VIP Pass"
            hasError={!!errors[`${tier.id}.name`]}
          />
        </Field>

        <Field label="Price (VND)" required error={errors[`${tier.id}.price`]}>
          <TextInput
            value={tier.price}
            onChange={(v) => onChange(tier.id, 'price', v)}
            placeholder="e.g. 500000"
            type="number"
            hasError={!!errors[`${tier.id}.price`]}
          />
        </Field>

        <Field label="Total Qty" required error={errors[`${tier.id}.totalQty`]}>
          <TextInput
            value={tier.totalQty}
            onChange={(v) => onChange(tier.id, 'totalQty', v)}
            placeholder="e.g. 1000"
            type="number"
            hasError={!!errors[`${tier.id}.totalQty`]}
          />
        </Field>

        <Field label="Max / Order">
          <select
            value={tier.maxPerUser}
            onChange={(e) => onChange(tier.id, 'maxPerUser', Number(e.target.value))}
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
              appearance: 'none',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {[2, 4, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
