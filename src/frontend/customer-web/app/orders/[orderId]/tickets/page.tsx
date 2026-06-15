import { Suspense } from 'react';
import ETicketPage from '@/components/tickets/ETicketPage';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { orderId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <ETicketPage orderId={orderId} />
    </Suspense>
  );
}
