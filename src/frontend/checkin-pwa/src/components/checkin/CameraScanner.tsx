'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';

type ScannerState = 'idle' | 'requesting' | 'active' | 'error';

interface CameraScannerProps {
  onScan?: (rawQr: string) => void;
  onViewHistory?: () => void;
}

export default function CameraScanner({ onScan, onViewHistory }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      if (typeof window === 'undefined') {
        return;
      }

      if (window.isSecureContext === false) {
        setState('error');
        setErrorMsg('Cần HTTPS để dùng camera.');
        setDebugInfo(
          `URL hiện tại: ${window.location.href}\nDùng ngrok hoặc mở qua localhost.`
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState('error');
        setErrorMsg('Trình duyệt không hỗ trợ camera API.');
        setDebugInfo('navigator.mediaDevices = undefined. Dùng Chrome 60+ hoặc Safari 11+.');
        return;
      }

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

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          setState('error');
          setErrorMsg('Lỗi nội bộ: video element không tồn tại.');
          return;
        }

        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          const onReady = () => {
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('loadeddata', onReady);
            resolve();
          };
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.addEventListener('loadeddata', onReady, { once: true });
          setTimeout(() => {
            resolve();
          }, 2000);
        });

        await video.play();
        setState('active');
      } catch (err: unknown) {
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
    } catch (fatalErr: unknown) {
      const errorInstance = fatalErr instanceof Error ? fatalErr : new Error(String(fatalErr));
      setState('error');
      setErrorMsg('Đã xảy ra lỗi nghiêm trọng.');
      setDebugInfo(errorInstance.message);
    }
  }, []);

  useEffect(() => {
    let animId: number;
    let hasScanned = false;

    const scanFrame = () => {
      if (hasScanned) return;
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && state === 'active') {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            hasScanned = true;
            if (onScan) {
              onScan(code.data);
            }
            return;
          }
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    if (state === 'active') {
      animId = requestAnimationFrame(scanFrame);
    }

    return () => {
      hasScanned = true;
      cancelAnimationFrame(animId);
    };
  }, [state, onScan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 0);

    const handleError = (event: ErrorEvent) => {
      setDebugInfo((prev) => prev + `\n[Lỗi ngầm JS]: ${event.message}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setDebugInfo((prev) => prev + `\n[Lỗi Promise]: ${String(event.reason)}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }

    return () => {
      clearTimeout(timer);
      stopCamera();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [startCamera, stopCamera]);

  return (
    <>
      {/* Camera Box / Overlay - Expanded to full relative viewport container */}
      <div className="absolute inset-0 overflow-hidden bg-black/40 z-0">
        {/* Video feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover z-1 transition-opacity duration-300 ${state === 'active' ? 'opacity-100' : 'opacity-0'
            }`}
          playsInline
          muted
          autoPlay
        />

        {/* Idle / Error / Requesting states */}
        {state !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 z-5">
            {state === 'error' ? (
              <div className="text-center bg-zinc-950/80 p-5 rounded-2xl border border-red-500/20">
                <p className="color-red-400 text-sm font-medium mb-1 text-red-400">Không thể mở camera</p>
                <p className="text-slate-400 text-xs leading-relaxed whiteSpace-pre-line">
                  {errorMsg}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
                <p className="text-slate-400 text-sm">Đang mở camera...</p>
              </div>
            )}
          </div>
        )}

        {/* QR scan overlay - Khung quét và tia quét */}
        {state === 'active' && (
          <div className="absolute inset-0 pointer-events-none z-10 grid grid-rows-[1fr_250px_1fr] grid-cols-[1fr_250px_1fr] transform translate-z-0">
            {/* Top mask overlay */}
            <div className="bg-black/60 backdrop-blur-[5px]" style={{ gridRow: '1', gridColumn: '1 / 4' }} />
            {/* Bottom mask overlay */}
            <div className="bg-black/60 backdrop-blur-[5px]" style={{ gridRow: '3', gridColumn: '1 / 4' }} />
            {/* Left mask overlay */}
            <div className="bg-black/60 backdrop-blur-[5px]" style={{ gridRow: '2', gridColumn: '1' }} />
            {/* Right mask overlay */}
            <div className="bg-black/60 backdrop-blur-[5px]" style={{ gridRow: '2', gridColumn: '3' }} />

            {/* Central scan frame (180px * 180px) */}
            <div className="relative w-full h-full pointer-events-none" style={{ gridRow: '2', gridColumn: '2' }}>
              {/* Corner: top-left */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-[6px]" />
              {/* Corner: top-right */}
              <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-[6px]" />
              {/* Corner: bottom-left */}
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-[6px]" />
              {/* Corner: bottom-right */}
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-[6px]" />

              {/* Scanning line */}
              <div className="absolute left-1.5 right-1.5 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#10B981] animate-scanline top-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Panel containing buttons and debug info */}
      <div className="absolute bottom-[86px] left-6 right-6 z-20 flex flex-col gap-3">
        {/* Bộ đôi nút Đèn Flash & Lịch Sử */}
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <button
            onClick={() => {
              if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()[0];
                const capabilities = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean };
                if (capabilities && capabilities.torch) {
                  const constraints = track.getConstraints() as MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> };
                  const currentTorch = constraints.advanced?.[0]?.torch || false;
                  void track.applyConstraints({
                    advanced: [{ torch: !currentTorch } as MediaTrackConstraintSet & { torch?: boolean }]
                  });
                }
              }
            }}
            className="bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl p-4 text-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 hover:bg-white/12"
          >
            {/* Flashlight Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6h-2l-1.2-2.4a1 1 0 0 0-.8-.6H10a1 1 0 0 0-.8.6L8 6H6a2 2 0 0 0-2 2v3a2 2 0 0 0 1.5 1.9L6 20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l.5-7.1A2 2 0 0 0 20 11V8a2 2 0 0 0-2-2z" />
              <line x1="12" y1="12" x2="12" y2="12.01" />
            </svg>
            <span className="text-[11px] font-bold text-white/85 tracking-wider uppercase">
              ĐÈN FLASH
            </span>
          </button>

          <button
            onClick={() => {
              onViewHistory?.();
            }}
            className="bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl p-4 text-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 hover:bg-white/12"
          >
            {/* History Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[11px] font-bold text-white/85 tracking-wider uppercase">
              LỊCH SỬ
            </span>
          </button>
        </div>

        {/* Debug details panel inside absolute container */}
        {debugInfo !== '' && state === 'error' && (
          <div className="w-full rounded-xl py-3 px-4 text-xs text-slate-300 leading-relaxed bg-slate-900/85 backdrop-blur-md border border-white/12">
            <p className="text-slate-400 font-medium mb-1">Chi tiết kỹ thuật:</p>
            <p className="margin-0 whiteSpace-pre-wrap font-mono">{debugInfo}</p>
          </div>
        )}
      </div>
    </>
  );
}
