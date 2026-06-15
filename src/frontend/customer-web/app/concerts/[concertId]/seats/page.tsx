import SeatMapPage from '@/components/seatmap/SeatMapPage';

interface PageProps {
  params: Promise<{ concertId: string }>;
}

export default async function SeatsPage({ params }: PageProps) {
  const { concertId } = await params;
  return <SeatMapPage concertId={concertId} />;
}
