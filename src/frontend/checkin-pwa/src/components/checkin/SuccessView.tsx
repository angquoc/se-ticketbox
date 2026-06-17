'use client';

interface SuccessViewProps {
  ticketId: string;
  gate: string;
  ticketType: string;
  onScanNext: () => void;
}

export default function SuccessView({ ticketId, gate, ticketType, onScanNext }: SuccessViewProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-5 pb-5 flex-1 w-full">
      {/* White circle with checkmark */}
      <div className="w-[130px] h-[130px] rounded-full bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] mb-7">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* HỢP LỆ text */}
      <h2 className="text-[34px] font-black text-white tracking-[1.5px] mb-8 text-center uppercase">
        HỢP LỆ
      </h2>

      {/* Details Card */}
      <div className="w-full bg-white/12 backdrop-blur-[20px] border border-white/15 rounded-[20px] p-5 mb-10 box-border">
        {/* Ticket ID */}
        <div className="flex flex-col items-center mb-5">
          <span className="text-[11px] font-bold text-white/65 tracking-wider uppercase">
            MÃ VÉ
          </span>
          <span className="text-2xl font-extrabold text-white mt-1.5 tracking-[0.5px]">
            {ticketId}
          </span>
        </div>

        <hr className="border-none border-t border-white/15 mb-5" />

        {/* Details columns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-white/65 tracking-wider uppercase">
              CỔNG
            </span>
            <span className="text-base font-extrabold text-white mt-1.5">
              {gate}
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-bold text-white/65 tracking-wider uppercase">
              LOẠI VÉ
            </span>
            <span className="text-[15px] font-extrabold text-white mt-1.5 leading-tight">
              {ticketType}
            </span>
          </div>
        </div>
      </div>

      {/* QUÉT TIẾP THEO button */}
      <button
        onClick={onScanNext}
        className="w-full h-14 bg-white border-none rounded-2xl text-success text-[15px] font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-150 active:scale-95 hover:bg-white/95"
      >
        {/* Scan SVG icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Tiếp tục
      </button>
    </div>
  );
}
