import React from 'react';
import type { UploadedFile } from '@/types/api';
import { UploadStatusBadge } from '@/components/ui/Badge';
import { formatBytes } from '@/utils/format';

interface UploadedFileItemProps {
  file: UploadedFile;
}

export default function UploadedFileItem({ file }: UploadedFileItemProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 12px',
        background: '#FAFAFA', borderRadius: '6px',
        border: '1px solid #E7E7F3',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#191B23', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.originalName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <UploadStatusBadge status={file.status} />
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{formatBytes(file.sizeBytes)}</span>
        </div>
        {file.errorMessage && (
          <p style={{ fontSize: '11px', color: '#991B1B', margin: '4px 0 0' }}>{file.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
