'use client';
export default function AdminHeader() {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-800 font-semibold">Admin Dashboard</h2>
          <p className="text-xs text-slate-500">Quản lý sự kiện & vé bán</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="search"
            placeholder="Tìm sự kiện..."
            className="px-3 py-2 bg-slate-100 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300">
            🔔
          </button>
        </div>
      </div>
    </header>
  );
}