'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

type ScannerState = 'idle' | 'requesting' | 'active' | 'error';

interface CameraScannerProps {
  onScan?: (data: string) => void;
}

export default function CameraScanner({ onScan: _onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState('idle');
    setDebugInfo('');
  }, []);

  const startCamera = useCallback(async () => {
    try {
      console.log('[CameraScanner] Hàm startCamera được gọi.');
      // Thay alert bằng setDebugInfo để in thẳng ra màn hình, tránh việc iOS chặn alert
      setDebugInfo('[Click] Đã nhận sự kiện bấm nút startCamera!\n');

      if (typeof window === 'undefined') {
        console.log('[CameraScanner] Môi trường server, bỏ qua.');
        return;
      }

      console.log('[CameraScanner] Kiểm tra isSecureContext:', window.isSecureContext);
      if (window.isSecureContext === false) { // Có thể undefined trên một số trình duyệt siêu cũ, nên check === false
        console.warn('[CameraScanner] Không phải context bảo mật (HTTPS/localhost).');
        setState('error');
        setErrorMsg('Cần HTTPS để dùng camera.');
        setDebugInfo(
          `URL hiện tại: ${window.location.href}\nDùng ngrok hoặc mở qua localhost.`
        );
        return;
      }

      console.log('[CameraScanner] Kiểm tra mediaDevices:', !!navigator.mediaDevices);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[CameraScanner] Trình duyệt không hỗ trợ mediaDevices.getUserMedia.');
        setState('error');
        setErrorMsg('Trình duyệt không hỗ trợ camera API.');
        setDebugInfo('navigator.mediaDevices = undefined. Dùng Chrome 60+ hoặc Safari 11+.');
        return;
      }

      console.log('[CameraScanner] Bắt đầu request quyền camera...');
      setState('requesting');
      setErrorMsg('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        console.log('[CameraScanner] Đã lấy được stream camera.', stream.id);
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          console.error('[CameraScanner] Thẻ video không tồn tại trong DOM.');
          stream.getTracks().forEach((t) => t.stop());
          setState('error');
          setErrorMsg('Lỗi nội bộ: video element không tồn tại.');
          return;
        }

        console.log('[CameraScanner] Gắn stream vào thẻ video.');
        video.srcObject = stream;

        console.log('[CameraScanner] Chờ metadata của video...');
        await new Promise<void>((resolve) => {
          const onReady = () => {
            console.log('[CameraScanner] Video đã sẵn sàng.');
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('loadeddata', onReady);
            resolve();
          };
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.addEventListener('loadeddata', onReady, { once: true });
          // Fallback: sau 2s nếu event không fire thì vẫn tiếp tục
          setTimeout(() => {
            console.log('[CameraScanner] Timeout chờ metadata, vẫn tiếp tục...');
            resolve();
          }, 2000);
        });

        console.log('[CameraScanner] Gọi video.play()...');
        await video.play();
        console.log('[CameraScanner] Camera đang hoạt động.');
        setState('active');
      } catch (err: unknown) {
        console.error('[CameraScanner] Lỗi khi getUserMedia hoặc play:', err);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setState('error');

        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
              setErrorMsg('Chưa cấp quyền camera.');
              setDebugInfo('Vào Settings → Safari/Chrome → Camera → Cho phép.');
              break;
            case 'NotFoundError':
              setErrorMsg('Không tìm thấy camera trên thiết bị.');
              setDebugInfo(`DOMException: ${err.name}`);
              break;
            case 'NotReadableError':
              setErrorMsg('Camera đang dùng bởi app khác.');
              setDebugInfo('Đóng các app đang dùng camera rồi thử lại.');
              break;
            case 'OverconstrainedError':
              setErrorMsg('Camera không hỗ trợ cấu hình yêu cầu.');
              setDebugInfo(`DOMException: ${err.name} — ${err.message}`);
              break;
            default:
              setErrorMsg(`Lỗi camera: ${err.name}`);
              setDebugInfo(err.message);
          }
        } else if (err instanceof Error) {
          setErrorMsg('Không thể khởi động camera.');
          setDebugInfo(err.message);
        } else {
          setErrorMsg('Lỗi không xác định.');
        }
      }
    } catch (fatalErr: any) {
      console.error('[CameraScanner] Lỗi nghiêm trọng chưa xử lý:', fatalErr);
      setState('error');
      setErrorMsg('Đã xảy ra lỗi nghiêm trọng.');
      setDebugInfo(fatalErr.message || String(fatalErr));
    }
  }, []);

  useEffect(() => {
    // Bắt toàn bộ lỗi ngầm của React/JS trên trình duyệt và in thẳng ra màn hình
    const handleError = (event: ErrorEvent) => {
      setDebugInfo((prev) => prev + `\n[Lỗi ngầm JS]: ${event.message}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setDebugInfo((prev) => prev + `\n[Lỗi Promise]: ${String(event.reason)}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Đoạn code tạm thời để ép trình duyệt xóa Service Worker (PWA Cache)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[CameraScanner] Đã xóa Service Worker cũ để nhận code mới.');
        }
      });
    }

    return () => { 
      stopCamera(); 
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">

      {/* Camera box */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700"
        style={{ aspectRatio: '1 / 1' }}
      >

        {/* Video feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${state === 'active' ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          muted
          autoPlay
        />

        {/* Idle / Error state */}
        {state !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}
            >
              {/* Camera SVG icon — không dùng emoji */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
            </div>

            {state === 'error' ? (
              <div className="text-center">
                <p className="text-red-400 text-sm font-medium mb-1">Không thể mở camera</p>
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
            ) : state === 'requesting' ? (
              <p className="text-slate-300 text-sm">Đang khởi động camera...</p>
            ) : (
              <p className="text-slate-400 text-sm text-center">
                Nhấn <span className="text-indigo-400 font-medium">Bật camera</span> để bắt đầu quét
              </p>
            )}
          </div>
        )}

        {/* QR scan overlay — chỉ khi camera active */}
        {state === 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Dimmed corners */}
            <div className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
              }}
            />

            {/* Scan frame */}
            <div className="relative w-56 h-56">
              {/* Corner: top-left */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
              {/* Corner: top-right */}
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
              {/* Corner: bottom-left */}
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
              {/* Corner: bottom-right */}
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

              {/* Scanning line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-cyan-400 opacity-80"
                style={{ animation: 'scanline 2s linear infinite', top: '50%' }}
              />
            </div>

            <p className="absolute bottom-5 text-white text-xs bg-black/50 px-4 py-1.5 rounded-full">
              Căn mã QR vào trong khung
            </p>
          </div>
        )}

        {/* Requesting overlay */}
        {state === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"
                style={{ animation: 'spin-loader 0.8s linear infinite' }}
              />
              <p className="text-slate-300 text-sm">Đang khởi động...</p>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="w-full flex flex-col gap-3">
        {state === 'active' ? (
          <button
            onClick={stopCamera}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-95"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
          >
            Tắt camera
          </button>
        ) : (
          <button
            onClick={startCamera}
            disabled={state === 'requesting'}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: state === 'requesting' ? '#4338ca' : '#4f46e5' }}
          >
            {state === 'requesting' ? 'Đang khởi động...' : state === 'error' ? 'Thử lại' : 'Bật camera'}
          </button>
        )}
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: state === 'active' ? '#22c55e' : state === 'error' ? '#ef4444' : '#475569',
            boxShadow: state === 'active' ? '0 0 6px #22c55e' : 'none',
          }}
        />
        <span className="text-xs text-slate-500">
          {state === 'active'
            ? 'Camera đang hoạt động'
            : state === 'requesting'
            ? 'Đang khởi động...'
            : state === 'error'
            ? 'Camera bị lỗi'
            : 'Sẵn sàng'}
        </span>
      </div>

      {/* Debug info — chỉ hiện khi có lỗi */}
      {debugInfo !== '' && (
        <div
          className="w-full rounded-xl px-4 py-3 text-xs text-slate-400 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-slate-500 font-medium mb-1">Chi tiết lỗi:</p>
          <p className="whitespace-pre-wrap font-mono">{debugInfo}</p>
        </div>
      )}

      {/* Animations — dùng global style thay vì style jsx */}
      <style>{`
        @keyframes scanline {
          0%   { top: 8%;  }
          50%  { top: 88%; }
          100% { top: 8%;  }
        }
        @keyframes spin-loader {
          to { transform: rotate(360deg); }
        }
        .animate-scanline {
          animation: scanline 2s ease-in-out infinite;
        }
        .animate-spin-loader {
          animation: spin-loader 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}