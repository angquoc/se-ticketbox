'use client';

/**
 * Spinner.tsx
 * Loading spinner component dùng chung toàn admin-web.
 * Inject keyframe animation một lần duy nhất qua <style>.
 */

export interface SpinnerProps {
  size?: number;
  color?: string;
  trackColor?: string;
}

export default function Spinner({
  size = 24,
  color = '#003298',
  trackColor = '#E7E7F3',
}: SpinnerProps) {
  return (
    <>
      <style>{`@keyframes tb-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${trackColor}`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'tb-spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
    </>
  );
}

/**
 * InlineSpinner — spinner nhỏ dùng bên trong nút bấm
 */
export function InlineSpinner() {
  return (
    <>
      <style>{`@keyframes tb-spin { to { transform: rotate(360deg); } }`}</style>
      <span
        style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          border: '2px solid rgba(255,255,255,0.4)',
          borderTop: '2px solid #FFFFFF',
          borderRadius: '50%',
          animation: 'tb-spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
    </>
  );
}
