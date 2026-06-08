export default function EventRow({ date, month, title, time, isPrimary = false }: { date: string, month: string, title: string, time: string, isPrimary?: boolean }) {
  return (
    <div className="flex justify-between items-center py-[8px] border-b border-[#C3C5D7]/30 last:border-0 hover:bg-slate-50 transition-colors rounded-[4px] group">
      <div className="flex items-center gap-[16px]">
        <div className={`w-[40px] h-[40px] rounded-[2px] flex items-center justify-center flex-shrink-0 ${isPrimary ? 'bg-[#D0E1FB] text-[#54647A]' : 'bg-[#E7E7F3] text-[#434654]'}`}>
          <span className="text-[20px] font-semibold leading-[28px]">{date}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold text-[#191B23] leading-[20px]">{title}</span>
          <span className="text-[13px] text-[#434654] leading-[18px]">{time}</span>
        </div>
      </div>
      <div className="flex flex-col items-end w-[47px] flex-shrink-0">
        <span className="text-[13px] text-[#191B23] font-mono leading-[18px] text-right block">{month}</span>
        <span className="text-[13px] text-[#434654] leading-[18px] opacity-0 group-hover:opacity-100 transition-opacity text-right block cursor-pointer hover:underline">Chi tiết</span>
      </div>
    </div>
  );
}