import EventCard from '@/components/events/EventCard';

// Mock data - tuần 2 sẽ lấy từ API
const mockEvents = [
  {
    id: '1',
    name: 'Anh Trai Say Hi',
    artist: 'RHYDER, Justatee, Wowy',
    date: '15/06/2024',
    venue: 'Sân vận động 974',
    ticketsSold: 1200,
    ticketsTotal: 2000,
  },
  {
    id: '2',
    name: 'Anh Trai Vượt Ngàn Chông Gai',
    artist: 'Các anh trai',
    date: '22/06/2024',
    venue: 'Phú Thái Arena',
    ticketsSold: 850,
    ticketsTotal: 1500,
  },
  {
    id: '3',
    name: 'Chị Đẹp Đạp Gió Rẽ Sóng',
    artist: 'Các chị đẹp',
    date: '29/06/2024',
    venue: 'Sân vận động Thống Nhất',
    ticketsSold: 450,
    ticketsTotal: 3000,
  },
];

export default function EventsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Sự kiện</h1>
          <p className="text-slate-500">Quản lý tất cả sự kiện & bán vé</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
          ➕ Tạo sự kiện
        </button>
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            name={event.name}
            artist={event.artist}
            date={event.date}
            venue={event.venue}
            ticketsSold={event.ticketsSold}
            ticketsTotal={event.ticketsTotal}
          />
        ))}
      </div>
    </div>
  );
}