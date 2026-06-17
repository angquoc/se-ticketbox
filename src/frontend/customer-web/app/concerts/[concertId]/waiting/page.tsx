import WaitingRoomScreen from '@/components/waiting-room/WaitingRoomScreen';

interface PageProps {
  params: Promise<{ concertId: string }>;
}

export default async function WaitingRoomPage({ params }: PageProps) {
  const { concertId } = await params;
  return <WaitingRoomScreen concertId={concertId} />;
}
