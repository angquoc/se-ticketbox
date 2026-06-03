'use client';
import { useEffect, useRef, useState } from 'react';

type ScannerState = 'idle' | 'requesting' | 'active' | 'error';

interface ScannerProps {
  onScan?: (data: string) => void;
}

export default function CameraScanner({ onScan }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.error('[Camera] Play error:', err);
        });
        setState('active');
      }
    } catch (err: unknown) {
      setState('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg('❌ Bạn cần cấp quyền camera');
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('❌ Không tìm thấy camera');
        } else {
          setErrorMsg(`❌ Lỗi: ${err.message}`);
        }
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    console.log('[Camera] Photo taken - tuần 2 sẽ xử lý QR');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      
      {/* Camera preview */}
      <div className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-2xl mb-6">
        
        {/* Video element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${state === 'active' ? 'block' : 'hidden'}`}
          playsInline
          muted
        />

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay khi chưa bật */}
        {state !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80">
            <div className="text-6xl animate-bounce">📷</div>
            <p className="text-sm text-slate-400 text-center px-4">
              {state === 'error' 
                ? errorMsg 
                : 'Nhấn nút bên dưới để bắt đầu'}
            </p>
          </div>
        )}

        {/* QR scanning frame */}
        {state === 'active' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Outer overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Inner scanning box */}
            <div className="relative w-64 h-64 border-4 border-cyan-400 rounded-2xl shadow-lg">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-cyan-400" />

              {/* Scanning line animation */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse" />
            </div>

            {/* Instruction text */}
            <p className="absolute bottom-12 text-white text-xs bg-black/60 px-4 py-2 rounded-full">
              ☝️ Căn mã QR vào khung
            </p>
          </div>
        )}

        {/* Loading state */}
        {state === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
            <div className="text-center">
              <div className="text-4xl animate-spin mb-2">⟳</div>
              <p className="text-xs text-slate-400">Đang khởi động camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="w-full space-y-3">
        {state === 'active' ? (
          <>
            <button
              onClick={handleTakePhoto}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors active:scale-95"
            >
              📸 Chụp & quét QR
            </button>
            <button
              onClick={stopCamera}
              className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-semibold rounded-xl transition-colors"
            >
              ⏹ Tắt camera
            </button>
          </>
        ) : (
          <button
            onClick={startCamera}
            disabled={state === 'requesting'}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors active:scale-95"
          >
            {state === 'requesting' ? '⏳ Đang khởi động...' : '▶️ Bật camera'}
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <div
          className={`w-2 h-2 rounded-full ${
            state === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
          }`}
        />
        {state === 'active' 
          ? '🟢 Camera sẵn sàng' 
          : '⚪ Chưa bật'}
      </div>
    </div>
  );
}