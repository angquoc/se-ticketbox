import { formatVnd } from '@/utils/format';

interface Props {
  totalRevenue: number;
  transactionCount: number;
}

export default function RevenueSummaryCard({ totalRevenue, transactionCount }: Props) {
  const avgOrderValue = transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '27px',
      width: '100%',
      marginBottom: '8px',
    }}>
      {/* CARD 1: Total Revenue */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#434654',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            display: 'block',
          }}>
            Total Revenue
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            fontWeight: 700,
            color: '#003298',
            letterSpacing: '-0.3px',
            display: 'block',
          }}>
            {formatVnd(totalRevenue)}
          </span>
        </div>
        <div style={{
          background: '#DCE1FF',
          borderRadius: '6px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#003298',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
      </div>

      {/* CARD 2: Total Transactions */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#434654',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            display: 'block',
          }}>
            Transactions
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            fontWeight: 700,
            color: '#191B23',
            letterSpacing: '-0.3px',
            display: 'block',
          }}>
            {transactionCount.toLocaleString()}
          </span>
        </div>
        <div style={{
          background: '#DCE1FF',
          borderRadius: '6px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#003298',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
      </div>

      {/* CARD 3: Average Ticket Value */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#434654',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            display: 'block',
          }}>
            Avg. Order Value
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            fontWeight: 700,
            color: '#191B23',
            letterSpacing: '-0.3px',
            display: 'block',
          }}>
            {formatVnd(avgOrderValue)}
          </span>
        </div>
        <div style={{
          background: '#DCE1FF',
          borderRadius: '6px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#003298',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        </div>
      </div>
    </div>
  );
}
