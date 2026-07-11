'use client';

import QRCode from 'react-qr-code';
import type { Ticket } from '@/types/ticket';

interface ETicketCardProps {
  ticket: Ticket;
  index: number;
  total: number;
}

function statusLabel(status: Ticket['status']): string {
  switch (status) {
    case 'ISSUED':
      return 'Hợp lệ';
    case 'CHECKED_IN':
      return 'Đã check-in';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}

function statusClass(status: Ticket['status']): string {
  switch (status) {
    case 'ISSUED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CHECKED_IN':
      return 'bg-indigo-100 text-indigo-800';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ETicketCard({ ticket, index, total }: ETicketCardProps) {
  const isUsable = ticket.status === 'ISSUED';
  const shortId = ticket.id.slice(0, 8).toUpperCase();

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-100">
              E-Ticket · {index}/{total}
            </p>
            <h2 className="mt-1 text-lg font-bold leading-snug">{ticket.concertTitle}</h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}
          >
            {statusLabel(ticket.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Loại vé</dt>
            <dd className="font-semibold text-slate-900">{ticket.ticketTypeName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Địa điểm</dt>
            <dd className="font-medium text-slate-900">{ticket.concertVenue}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Thời gian</dt>
            <dd className="font-medium text-slate-900">{formatEventDate(ticket.concertStartsAt)}</dd>
          </div>
          {ticket.gateId && (
            <div>
              <dt className="text-slate-500">Cổng vào (Gate)</dt>
              <dd className="font-bold text-indigo-700 text-base">{ticket.gateId}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Mã vé</dt>
            <dd className="font-mono text-xs text-slate-700">{shortId}</dd>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-3">
          <div
            className={`rounded-xl border-2 p-3 ${
              isUsable ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
            }`}
          >
            <QRCode
              value={ticket.qrPayload}
              size={160}
              level="M"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <p className="max-w-[180px] text-center text-xs text-slate-500">
            {isUsable
              ? 'Xuất trình mã QR tại cổng soát vé'
              : 'Mã QR không còn hiệu lực'}
          </p>
        </div>
      </div>

      {ticket.checkedInAt && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
          Đã check-in lúc{' '}
          {new Date(ticket.checkedInAt).toLocaleString('vi-VN')}
        </div>
      )}
    </article>
  );
}
