import { redirect } from 'next/navigation';

/** Alias theo ticket-purchase.md — email link tới /my-tickets */
export default function MyTicketsRedirectPage() {
  redirect('/tickets');
}
