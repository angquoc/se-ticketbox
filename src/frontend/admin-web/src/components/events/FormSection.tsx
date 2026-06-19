/**
 * FormSection.tsx
 * Layout wrapper 2 cột cho form /events/new:
 * - Cột trái: tiêu đề section + mô tả
 * - Cột phải: các form fields
 */

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: '32px',
        paddingBottom: '32px',
        borderBottom: '1px solid #E7E7F3',
      }}
    >
      {/* Label column */}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#191B23', margin: '0 0 6px' }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, lineHeight: '18px' }}>
            {description}
          </p>
        )}
      </div>

      {/* Fields column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  );
}
