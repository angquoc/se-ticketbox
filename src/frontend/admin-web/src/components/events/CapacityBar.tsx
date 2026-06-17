/**
 * CapacityBar.tsx
 * Thanh tiến trình biểu diễn sold / reserved / total của một loại vé.
 * Màu sắc theo hệ thống trong ui-admin-web.md.
 */

export interface CapacityBarProps {
  sold: number;
  reserved: number;
  total: number;
}

export default function CapacityBar({ sold, reserved, total }: CapacityBarProps) {
  const soldPct = total > 0 ? Math.min((sold / total) * 100, 100) : 0;
  const reservedPct = total > 0 ? Math.min((reserved / total) * 100, 100 - soldPct) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
      {/* Track */}
      <div
        style={{
          height: '6px',
          background: '#E7E7F3',
          borderRadius: '3px',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{ width: `${soldPct}%`, background: '#003298', transition: 'width 0.3s ease' }}
        />
        <div
          style={{ width: `${reservedPct}%`, background: '#A3B8F0', transition: 'width 0.3s ease' }}
        />
      </div>

      {/* Label */}
      <span style={{ fontSize: '11px', color: '#434654' }}>
        {sold.toLocaleString()} / {total.toLocaleString()} sold
        {reserved > 0 && (
          <span style={{ color: '#9CA3AF' }}> · {reserved} reserved</span>
        )}
      </span>
    </div>
  );
}
