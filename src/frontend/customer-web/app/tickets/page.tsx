import { Suspense } from 'react';
import MyTicketsPage from '@/components/tickets/MyTicketsPage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <MyTicketsPage />
    </Suspense>
  );
}
