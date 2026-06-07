import Link from 'next/link';
import CustomerHeader from '@/components/layout/CustomerHeader';

const DEMO_CONCERTS = [
  {
    id: 'demo-concert',
    name: 'Sơn Tùng M-TP — SKY Tour 2026',
    venue: 'Mỹ Đình National Stadium',
    date: '15/08/2026',
  },
  {
    id: 'concert-001',
    name: 'BlackPink — Born Pink World Tour',
    venue: 'Phú Thọ Indoor Stadium',
    date: '22/09/2026',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">Sự kiện nổi bật</h1>
        <p className="mt-2 text-slate-600">Chọn sự kiện và bắt đầu chọn ghế</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DEMO_CONCERTS.map((concert) => (
            <article
              key={concert.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{concert.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{concert.venue}</p>
              <p className="mt-1 text-sm text-slate-500">{concert.date}</p>
              <Link
                href={`/concerts/${concert.id}/waiting`}
                className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Mua vé
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
