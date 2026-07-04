/**
 * SectionCard.tsx
 * Card wrapper với header + border-bottom, dùng xuyên suốt admin-web.
 * Tuân thủ Card Component spec trong ui-admin-web.md mục 3.1.
 */

export interface SectionCardProps {
  title: string;
  description?: string;
  /** Slot action hiển thị ở góc phải header (ví dụ: nút Edit, Save) */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Padding nội dung, mặc định 20px */
  bodyPadding?: string;
}

export default function SectionCard({
  title,
  description,
  action,
  children,
  bodyPadding = '20px',
}: SectionCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #C3C5D7',
        }}
      >
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: 0 }}>
            {title}
          </p>
          {description && (
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
              {description}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {/* Body */}
      <div style={{ padding: bodyPadding }}>{children}</div>
    </div>
  );
}
