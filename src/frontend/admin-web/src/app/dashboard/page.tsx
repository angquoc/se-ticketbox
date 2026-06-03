export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
      <p className="text-slate-500 mb-8">Tổng quan sự kiện & doanh thu</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Sự kiện hoạt động', value: '4', color: 'bg-blue-50 text-blue-700', icon: '🎵' },
          { label: 'Vé đã bán', value: '1,240', color: 'bg-green-50 text-green-700', icon: '🎫' },
          { label: 'Doanh thu', value: '500M đ', color: 'bg-emerald-50 text-emerald-700', icon: '💰' },
          { label: 'Check-in hôm nay', value: '342', color: 'bg-purple-50 text-purple-700', icon: '✓' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-6 ${stat.color} border border-current/10`}>
            <p className="text-sm font-medium opacity-70">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
            <p className="text-2xl mt-2">{stat.icon}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h2 className="font-semibold text-slate-800 mb-4">Bán vé 7 ngày gần đây</h2>
        <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
          [Chart placeholder - Todo W02]
        </div>
      </div>
    </div>
  );
}