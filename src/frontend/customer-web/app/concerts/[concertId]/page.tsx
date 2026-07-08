import ConcertDetailPage from '@/components/concerts/ConcertDetailPage';

interface PageProps {
  params: Promise<{ concertId: string }>;
}

export default async function ConcertPage({ params }: PageProps) {
  const { concertId } = await params;
  return <ConcertDetailPage concertId={concertId} />;
}
