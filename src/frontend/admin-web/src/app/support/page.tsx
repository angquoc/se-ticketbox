export default function SupportPage() {
  const faqs = [
    { q: 'How do I create a new event?', a: 'Click "+ New Event" in the sidebar, fill in event details, configure ticket types and save.' },
    { q: 'How do I import a guest list?', a: 'Go to Guests page, upload a CSV file with columns: fullName, email, phone. The system validates each row before import.' },
    { q: 'How does offline check-in work?', a: 'The Check-in PWA caches QR signatures. Staff can scan offline; logs are synced when the device reconnects.' },
    { q: 'What payment methods are supported?', a: 'TicketBox integrates with VNPAY, MoMo and a MOCK gateway for testing.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <div>
        <h1 style={{ fontWeight: 700, fontSize: '30px', letterSpacing: '-0.6px', color: '#191B23', margin: 0 }}>Support</h1>
        <p style={{ fontSize: '14px', color: '#434654', margin: '4px 0 0' }}>Frequently asked questions and help resources.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqs.map((item) => (
          <div key={item.q} style={{ background: '#FFFFFF', border: '1px solid #C3C5D7', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: '0 0 6px' }}>{item.q}</p>
            <p style={{ fontSize: '13px', color: '#434654', margin: 0, lineHeight: '20px' }}>{item.a}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #C3C5D7', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: '0 0 6px' }}>Still need help?</p>
        <p style={{ fontSize: '13px', color: '#434654', margin: '0 0 16px' }}>Contact the TicketBox engineering team.</p>
        <a href="mailto:support@ticketbox.vn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 16px', background: '#003298', borderRadius: '4px', color: '#FFFFFF', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
          Email Support
        </a>
      </div>
    </div>
  );
}
