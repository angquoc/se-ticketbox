'use client';

/**
 * FormField.tsx
 * Tập hợp các primitives cho form: Field wrapper, TextInput, TextArea.
 * Áp dụng Input/Select spec trong ui-admin-web.md mục 3.3.
 */

// ── Field Wrapper ──────────────────────────────────────────────────────

export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, required, error, children }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 500, color: '#434654' }}>
        {label}
        {required && (
          <span style={{ color: '#BA1A1A', marginLeft: '3px' }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: '11px', color: '#BA1A1A', margin: 0 }}>{error}</p>
      )}
    </div>
  );
}

// ── Text Input ─────────────────────────────────────────────────────────

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  hasError,
  disabled,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        height: '36px',
        border: `1px solid ${hasError ? '#BA1A1A' : '#C3C5D7'}`,
        borderRadius: '4px',
        padding: '0 10px',
        fontSize: '13px',
        color: disabled ? '#9CA3AF' : '#191B23',
        background: disabled ? '#F9FAFB' : '#FFFFFF',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        boxSizing: 'border-box',
        width: '100%',
        transition: 'border-color 0.15s',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => {
        if (!disabled) e.target.style.borderColor = '#003298';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = hasError ? '#BA1A1A' : '#C3C5D7';
      }}
    />
  );
}

// ── Text Area ──────────────────────────────────────────────────────────

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, rows = 4 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        border: '1px solid #C3C5D7',
        borderRadius: '4px',
        padding: '10px',
        fontSize: '13px',
        color: '#191B23',
        background: '#FFFFFF',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        resize: 'vertical',
        width: '100%',
        boxSizing: 'border-box',
        lineHeight: '1.6',
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => (e.target.style.borderColor = '#003298')}
      onBlur={(e) => (e.target.style.borderColor = '#C3C5D7')}
    />
  );
}

// ── Read-only Field ────────────────────────────────────────────────────

export interface ReadonlyFieldProps {
  value: string;
}

export function ReadonlyField({ value }: ReadonlyFieldProps) {
  return (
    <div
      style={{
        height: '36px',
        border: '1px solid #E7E7F3',
        borderRadius: '4px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        color: '#191B23',
        background: '#F9FAFB',
      }}
    >
      {value}
    </div>
  );
}

// ── Info Row (label + value, không editable) ───────────────────────────

export interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          color: '#9CA3AF',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '14px', color: '#191B23' }}>{value}</span>
    </div>
  );
}
