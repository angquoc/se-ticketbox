'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/layout/CustomerHeader';
import BackendNotice from '@/components/ui/BackendNotice';
import { useWaitingRoom } from '@/hooks/useWaitingRoom';
import { getWaitingMessage, getWaitingTip } from '@/lib/waiting-room-messages';

interface WaitingRoomScreenProps {
  concertId: string;
}

export default function WaitingRoomScreen({ concertId }: WaitingRoomScreenProps) {
  const router = useRouter();
  const [messageVisible, setMessageVisible] = useState(true);

  const handleAdmitted = useCallback(() => {
    setTimeout(() => {
      router.replace(`/concerts/${concertId}/seats`);
    }, 900);
  }, [concertId, router]);

  const { concertName, status, error, backendError, messageTick, startedAt, position, estimatedWaitSeconds, retry } = useWaitingRoom({
    concertId,
    onAdmitted: handleAdmitted,
  });

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt || status !== 'waiting') return;
    const update = () => setElapsedMs(Date.now() - startedAt);
    update();
    const interval = setInterval(update, 2_000);
    return () => clearInterval(interval);
  }, [startedAt, status]);
  const headline = useMemo(
    () => getWaitingMessage(elapsedMs, messageTick),
    [elapsedMs, messageTick],
  );
  const tip = useMemo(() => getWaitingTip(messageTick), [messageTick]);

  useEffect(() => {
    setMessageVisible(false);
    const timer = setTimeout(() => setMessageVisible(true), 180);
    return () => clearTimeout(timer);
  }, [messageTick]);

  const isConnecting = status === 'loading';
  const displayHeadline = isConnecting ? 'Đang kiểm tra lượt truy cập...' : headline;

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-red-700">{error ?? 'Không thể vào phòng chờ'}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Thử lại
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'admitted') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader concertName={concertName} />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Đã đến lượt của bạn!</h1>
            <p className="mt-2 text-slate-600">Đang chuyển bạn đến trang chọn ghế...</p>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'waiting' || status === 'loading') {
    return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl"
      />

      <CustomerHeader concertName={concertName} />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {backendError && (
          <div className="mb-4 w-full">
            <BackendNotice backendError={backendError} source="mock" />
          </div>
        )}
        <div className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur sm:p-10">
          <div className="flex flex-col items-center text-center">
            <BreathingOrb />

            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-indigo-600">
              Phòng chờ ảo
            </p>

            <h1
              className={`mt-4 min-h-[2.5rem] text-2xl font-bold text-slate-900 transition-opacity duration-300 sm:text-3xl ${
                isConnecting || messageVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {displayHeadline}
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              {isConnecting
                ? 'Hệ thống đang đánh giá mức tải. Nếu không quá đông, bạn sẽ vào mua vé ngay.'
                : 'Lượt truy cập đang cao. Chúng tôi sẽ tự động chuyển bạn sang trang mua vé ngay khi sẵn sàng — không cần làm gì thêm.'}
            </p>

            {!isConnecting && position !== null && (
              <p className="mt-4 text-sm font-medium text-indigo-700">
                Vị trí trong hàng đợi: #{position}
                {estimatedWaitSeconds !== null && estimatedWaitSeconds > 0 && (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · Ước tính còn khoảng {estimatedWaitSeconds} giây
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mẹo nhỏ</p>
            <p className="mt-1 text-sm text-slate-600">{tip}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:300ms]" />
          </div>
        </div>

        {concertName && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Sự kiện: <span className="font-medium text-slate-700">{concertName}</span>
          </p>
        )}
      </main>
    </div>
    );
  }

  return null;
}

function BreathingOrb() {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-indigo-200/50" />
      <span className="absolute inset-2 animate-pulse rounded-full bg-indigo-100" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200">
        <svg
          className="h-7 w-7 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      </span>
    </div>
  );
}
