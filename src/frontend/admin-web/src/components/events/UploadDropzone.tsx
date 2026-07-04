'use client';

/**
 * UploadDropzone.tsx
 * Drag-and-drop file upload dropzone cho PDF press kit và CSV guest list.
 * Hỗ trợ dragging state, loading state, và native file input fallback.
 */

import { useState, useCallback } from 'react';
import Spinner from '@/components/ui/Spinner';

export interface UploadDropzoneProps {
  accept: string;
  label: string;
  hint: string;
  onFile: (file: File) => void;
  loading?: boolean;
}

export default function UploadDropzone({
  accept,
  label,
  hint,
  onFile,
  loading,
}: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '24px',
        border: `2px dashed ${dragging ? '#003298' : '#C3C5D7'}`,
        borderRadius: '8px',
        background: dragging ? '#EEF4FF' : '#FAFAFA',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        textAlign: 'center',
      }}
    >
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        disabled={loading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {loading ? (
        <>
          <Spinner size={32} />
          <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>Uploading…</p>
        </>
      ) : (
        <>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#191B23', margin: '0 0 2px' }}>
              {label}
            </p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{hint}</p>
          </div>
        </>
      )}
    </label>
  );
}
