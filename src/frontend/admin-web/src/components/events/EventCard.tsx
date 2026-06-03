import Link from 'next/link';

interface EventCardProps {
  id: string;
  name: string;
  artist: string;
  date: string;
  venue: string;
  ticketsSold: number;
  ticketsTotal: number;
  image?: string;
}

export default function EventCard({
  id,
  name,
  artist,
  date,
  venue,
  ticketsSold,
  ticketsTotal,
}: EventCardProps) {
  // Handle division by zero to prevent NaN/Infinity width
  const progress = ticketsTotal > 0 ? (ticketsSold / ticketsTotal) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{name}</h3>
          <p className="text-slate-500 text-sm">{artist}</p>
        </div>
        <span className="text-2xl">🎵</span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          📅 {date}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          📍 {venue}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Bán vé</span>
          <span>{ticketsSold} / {ticketsTotal}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {/* Use Link for navigation to leverage Next.js routing */}
        <Link
          href={`/events/${id}/edit`} // Assuming an edit page route
          className="flex-1 text-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Chỉnh sửa
        </Link>
        <Link
          href={`/events/${id}`}
          className="flex-1 text-center px-3 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
        >
          Chi tiết
        </Link>
      </div>
    </div>
  );
}