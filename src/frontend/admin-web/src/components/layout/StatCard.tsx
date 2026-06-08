export default function StatCard({ title, value, trend, trendColor }: { title: string, value: string, trend: string, trendColor: string }) {
  return (
    <div className="bg-white border border-[#C3C5D7] rounded-[8px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[16px] flex flex-col gap-[16px] relative">
      <div className="flex justify-between items-start">
        <span className="text-[12px] font-medium text-[#434654] uppercase tracking-[0.6px] leading-[16px]">{title}</span>
        <div className="w-[30px] h-[24px] bg-[#DCE1FF] rounded-[6px] flex items-center justify-center">
          {/* Box icon placeholder */}
          <div className="w-[18px] h-[16px] bg-[#003298] rounded-sm opacity-80" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}></div>
        </div>
      </div>
      <div className="flex flex-col gap-[4px]">
        <div className="text-[24px] font-semibold text-[#191B23] tracking-[-0.24px] leading-[32px]">{value}</div>
        <div className={`flex items-center gap-[4px] ${trendColor} text-[13px] leading-[18px]`}>
          <span className="font-medium">{trend}</span>
          <span className="text-inherit opacity-90">so với tháng trước</span>
        </div>
      </div>
    </div>
  );
}