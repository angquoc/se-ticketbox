import CheckoutPage from '@/components/checkout/CheckoutPage';

interface PageProps {
  params: Promise<{ concertId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { concertId } = await params;
  return <CheckoutPage concertId={concertId} />;
}
