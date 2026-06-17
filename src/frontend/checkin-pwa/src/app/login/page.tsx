'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBadge,
  IconLock,
  IconGate,
  IconLogo,
  IconChevronDown,
  IconSpinner,
  IconArrowRight,
} from '@/components/icons';

// ── Gate options ───────────────────────────────────────────────────────
const GATES = [
  'Cổng VIP (Tầng 1)',
  'Cổng General (Tầng 1)',
  'Cổng General (Tầng 2)',
  'Cổng Nhân viên',
];

// ── Main component ─────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [gate, setGate] = useState(GATES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!staffId.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setError('');
    setLoading(true);
    // Simulate auth delay — replace with real API call
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    router.push('/checkin');
  };

  return (
    <div className="min-h-[100dvh] bg-bg-dark flex flex-col items-center justify-between p-0 font-sans text-white">
      <div className="w-full max-w-[390px] flex flex-col flex-1">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-center pt-[52px] px-6 pb-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {/* Bar chart icon */}
            <IconLogo />
            <span className="font-extrabold text-[15px] tracking-[1.5px] text-white">
              TICKETSCAN
            </span>
          </div>
        </div>

        {/* ── Status Info ── */}
        <div className="px-6 pb-8 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] animate-radar" />
            <span className="text-[11px] font-bold text-green-400 tracking-[0.5px]">
              HỆ THỐNG TRỰC TUYẾN
            </span>
          </div>
          <span className="text-xs text-white/50">
            Sẵn sàng quét vé
          </span>
        </div>

        {/* ── Form area ── */}
        <div className="px-6 flex-1">
          {/* Heading */}
          <h1 className="text-[32px] font-bold text-white mb-1.5 leading-tight">
            Đăng nhập
          </h1>
          <p className="text-[13px] text-white/45 mb-7 leading-relaxed">
            Vui lòng nhập thông tin nhân viên để bắt đầu.
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-500/12 border border-red-500/30 rounded-lg py-2.5 px-3.5 text-[13px] text-red-300 mb-4 transition-all">
              {error}
            </div>
          )}

          {/* ── Staff ID field ── */}
          <div className="mb-4">
            <label className="block text-[10px] font-semibold tracking-wider text-white/45 mb-2 uppercase">
              Mã nhân viên
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 flex items-center pointer-events-none">
                <IconBadge />
              </span>
              <input
                type="text"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                placeholder="VD: STF-9921"
                className="w-full h-[52px] bg-card-dark border border-white/10 rounded-lg pl-[46px] pr-3.5 text-[15px] text-white outline-none tracking-wide focus:border-brand/60 transition-colors duration-200 caret-brand"
              />
            </div>
          </div>

          {/* ── Password field ── */}
          <div className="mb-4">
            <label className="block text-[10px] font-semibold tracking-wider text-white/45 mb-2 uppercase">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 flex items-center pointer-events-none">
                <IconLock />
              </span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-[52px] bg-card-dark border border-white/10 rounded-lg pl-[46px] pr-3.5 text-[15px] text-white outline-none focus:border-brand/60 transition-colors duration-200 caret-brand"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>
          </div>

          {/* ── Gate selector ── */}
          <div className="mb-8">
            <label className="block text-[10px] font-semibold tracking-wider text-white/45 mb-2 uppercase">
              Cổng soát vé
            </label>
            <div className="relative">
              {/* Gate icon */}
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 flex items-center pointer-events-none z-1">
                <IconGate />
              </span>
              <select
                value={gate}
                onChange={e => setGate(e.target.value)}
                className="w-full h-[52px] bg-card-dark border border-white/10 rounded-lg pl-[46px] pr-11 text-[15px] text-white outline-none cursor-pointer appearance-none focus:border-brand/60 transition-colors duration-200"
              >
                {GATES.map(g => (
                  <option key={g} value={g} className="bg-card-dark text-white">{g}</option>
                ))}
              </select>
              {/* Chevron */}
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                <IconChevronDown />
              </span>
            </div>
          </div>

          {/* ── Submit button ── */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-brand to-brand-hover text-white text-[15px] font-bold tracking-wider rounded-xl flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(124,92,252,0.4)] transition-all duration-200 cursor-pointer disabled:cursor-default active:scale-95 disabled:active:scale-100 disabled:opacity-75 disabled:brightness-100 disabled:shadow-none"
          >
            {loading ? (
              <>
                <IconSpinner />
                Đang xác thực...
              </>
            ) : (
              <>
                BẮT ĐẦU CA LÀM VIỆC
                <IconArrowRight />
              </>
            )}
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 text-center">
          <span className="text-[11px] text-white/20 tracking-wider">
            v4.2.0
          </span>
        </div>
      </div>
    </div>
  );
}
