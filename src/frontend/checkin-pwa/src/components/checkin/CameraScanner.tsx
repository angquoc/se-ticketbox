'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

type ScannerState = 'idle' | 'requesting' | 'active' | 'error';

interface CameraScannerProps {
  onScan?: (ticket: {
    id: string;
    gate: string;
    type?: string;
    time?: string;
    status: 'valid' | 'invalid';
    errorMsg?: string;
  }) => void;
  onViewHistory?: () => void;
}

let scanCounter = 0;

export default function CameraScanner({ onScan, onViewHistory }: CameraScannerProps) {
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
    if (state === 'active' && onScan) {
      console.log('[CameraScanner] Camera active. Simulating scan in 2.5 seconds...');
      const timer = setTimeout(() => {
        scanCounter += 1;
        if (scanCounter % 2 === 1) {
          onScan({
            id: 'TCK-88902',
            gate: 'Cổng A',
            type: 'General Admission',
            status: 'valid',
          });
        } else {
          const now = new Date();
          const timeStr = now.toTimeString().split(' ')[0];
          onScan({
            id: 'TCK-88899',
            gate: 'Cổng C',
            time: timeStr,
            status: 'invalid',
            errorMsg: 'Vé không hợp lệ cho cổng này',
          });
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state, onScan]);

  useEffect(() => {
    // Tự động khởi động camera khi tải trang
    startCamera();

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
  }, [startCamera, stopCamera]);

  return (
    <>
      {/* Camera Box / Overlay - Expanded to full relative viewport container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0,
        }}
      >
        {/* Video feed */}
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            transition: 'opacity 300ms',
            opacity: state === 'active' ? 1 : 0,
          }}
          playsInline
          muted
          autoPlay
        />

        {/* Idle / Error / Requesting states */}
        {state !== 'active' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              paddingLeft: '24px',
              paddingRight: '24px',
              zIndex: 5,
            }}
          >
            {state === 'error' ? (
              <div
                style={{
                  textAlign: 'center',
                  backgroundColor: 'rgba(9, 9, 11, 0.8)',
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <p style={{ color: '#F87171', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Không thể mở camera</p>
                <p style={{ color: '#94A3B8', fontSize: '12px', lineHeight: 1.625, whiteSpace: 'pre-line' }}>
                  {errorMsg}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '4px solid #6366f1',
                    borderTopColor: 'transparent',
                    animation: 'spin-loader 0.8s linear infinite',
                  }}
                />
                <p style={{ color: '#94A3B8', fontSize: '14px' }}>Đang mở camera...</p>
              </div>
            )}
          </div>
        )}

        {/* QR scan overlay - Khung quét và tia quét */}
        {state === 'active' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 10,
              display: 'grid',
              gridTemplateRows: '1fr 250px 1fr',
              gridTemplateColumns: '1fr 250px 1fr',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)'
            }}
          >
            {/* Top mask overlay */}
            <div style={{ gridRow: '1', gridColumn: '1 / 4', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />
            {/* Bottom mask overlay */}
            <div style={{ gridRow: '3', gridColumn: '1 / 4', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />
            {/* Left mask overlay */}
            <div style={{ gridRow: '2', gridColumn: '1', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />
            {/* Right mask overlay */}
            <div style={{ gridRow: '2', gridColumn: '3', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />

            {/* Central scan frame (180px * 180px) */}
            <div style={{ gridRow: '2', gridColumn: '2', position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
              {/* Corner: top-left */}
              <span style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderTop: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderTopLeftRadius: '6px' }} />
              {/* Corner: top-right */}
              <span style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderTop: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderTopRightRadius: '6px' }} />
              {/* Corner: bottom-left */}
              <span style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderBottom: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderBottomLeftRadius: '6px' }} />
              {/* Corner: bottom-right */}
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderBottom: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderBottomRightRadius: '6px' }} />

              {/* Scanning line */}
              <div
                style={{
                  position: 'absolute',
                  left: '6px',
                  right: '6px',
                  height: '2px',
                  backgroundColor: 'rgba(52, 211, 153, 0.8)',
                  boxShadow: '0 0 8px #10B981',
                  animation: 'scanline 2.5s linear infinite',
                  top: '50%',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Panel containing buttons and debug info, placed exactly 10px above the Bottom Navigation Bar (76px + 10px = 86px) */}
      <div
        style={{
          position: 'absolute',
          bottom: '86px',
          left: '24px',
          right: '24px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Bộ đôi nút Đèn Flash & Lịch Sử */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', width: '100%' }}>
          <button
            onClick={() => {
              if (streamRef.current) {
                const track = streamRef.current.getVideoTracks()[0];
                const capabilities = track.getCapabilities?.() as any;
                if (capabilities && capabilities.torch) {
                  const constraints = track.getConstraints() as any;
                  const currentTorch = constraints.advanced?.[0]?.torch || false;
                  track.applyConstraints({
                    advanced: [{ torch: !currentTorch } as any]
                  });
                } else {
                  console.log('Flashlight/Torch is not supported on this device/browser.');
                }
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '16px',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {/* Flashlight Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6h-2l-1.2-2.4a1 1 0 0 0-.8-.6H10a1 1 0 0 0-.8.6L8 6H6a2 2 0 0 0-2 2v3a2 2 0 0 0 1.5 1.9L6 20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l.5-7.1A2 2 0 0 0 20 11V8a2 2 0 0 0-2-2z" />
              <line x1="12" y1="12" x2="12" y2="12.01" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.3px' }}>
              ĐÈN FLASH
            </span>
          </button>

          <button
            onClick={() => {
              onViewHistory?.();
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '16px',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {/* History Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.3px' }}>
              LỊCH SỬ
            </span>
          </button>
        </div>

        {/* Debug details panel inside absolute container */}
        {debugInfo !== '' && state === 'error' && (
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#CBD5E1',
              lineHeight: 1.625,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <p style={{ color: '#94A3B8', fontWeight: 500, marginBottom: '4px' }}>Chi tiết kỹ thuật:</p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{debugInfo}</p>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes scanline {
          0%   { top: 4%;  }
          50%  { top: 96%; }
          100% { top: 4%;  }
        }
        @keyframes spin-loader {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
