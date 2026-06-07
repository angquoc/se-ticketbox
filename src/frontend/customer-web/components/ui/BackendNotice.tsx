interface BackendNoticeProps {
  backendError?: string | null;
  warning?: string | null;
  source?: 'backend' | 'mock' | null;
}

export default function BackendNotice({ backendError, warning, source }: BackendNoticeProps) {
  if (!backendError && !warning) return null;

  const isError = Boolean(backendError);

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isError
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-blue-200 bg-blue-50 text-blue-900'
      }`}
      role="status"
    >
      {isError && (
        <>
          <p className="font-semibold">Backend không phản hồi — đang dùng dữ liệu demo</p>
          <p className="mt-1">{backendError}</p>
        </>
      )}
      {!isError && warning && <p>{warning}</p>}
      {source === 'mock' && !isError && (
        <p className="mt-1 text-xs opacity-80">Nguồn dữ liệu: mock (demo)</p>
      )}
    </div>
  );
}
