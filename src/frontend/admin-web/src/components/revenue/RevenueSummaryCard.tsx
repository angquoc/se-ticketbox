// src/components/revenue/RevenueSummaryCard.tsx

interface Props {
  totalRevenue: number;
  transactionCount: number;
}

export default function RevenueSummaryCard({ totalRevenue, transactionCount }: Props) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(totalRevenue);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minWidth: '220px',
      flexShrink: 0,
    }}>
      <p style={{
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        color: '#434654',
        margin: '0 0 10px',
      }}>
        Total Filtered Revenue
      </p>
      <p style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#003298',
        letterSpacing: '-0.5px',
        margin: '0 0 4px',
        lineHeight: 1.1,
      }}>
        {formatted}
      </p>
      <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>
        From {transactionCount.toLocaleString()} transactions
      </p>
    </div>
  );
}
