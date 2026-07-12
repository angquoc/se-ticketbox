'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/services/authService';
import { Field, TextInput } from '@/components/ui/FormField';
import { InlineSpinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field validation states
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

  const validate = () => {
    let valid = true;
    if (!email) {
      setEmailError('Email không được để trống');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email không hợp lệ');
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError('Mật khẩu không được để trống');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await login(email, password);
      const user = response.user;

      if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
        setError(
          'Tài khoản của bạn không có quyền truy cập trang quản trị. Vui lòng sử dụng tài khoản Admin hoặc Nhà tổ chức.'
        );
        // Clear stored tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
      }
      setLoading(false);
    }
  };

  const handleAutofill = (autofillEmail: string, autofillPass: string) => {
    setEmail(autofillEmail);
    setPassword(autofillPass);
    setEmailError(undefined);
    setPasswordError(undefined);
    setError(null);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '400px',
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.04)',
      borderRadius: '8px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      animation: 'fadeIn 0.4s ease-out',
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#191B23',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          Đăng nhập
        </h2>
        <p style={{
          fontSize: '13px',
          color: '#6B7280',
          marginTop: '6px',
          margin: '6px 0 0',
        }}>
          Chào mừng quay lại! Đăng nhập vào cổng quản trị TicketBox.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 14px',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '4px',
          color: '#991B1B',
          fontSize: '13px',
          lineHeight: '1.5',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Field label="Email" required error={emailError}>
          <TextInput
            type="email"
            value={email}
            onChange={(val) => {
              setEmail(val);
              if (emailError) setEmailError(undefined);
            }}
            placeholder="admin@ticketbox.vn"
            hasError={!!emailError}
            disabled={loading}
          />
        </Field>

        <Field label="Mật khẩu" required error={passwordError}>
          <TextInput
            type="password"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (passwordError) setPasswordError(undefined);
            }}
            placeholder="••••••••"
            hasError={!!passwordError}
            disabled={loading}
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '38px',
            background: loading ? '#6B8CC7' : 'var(--color-brand)',
            borderRadius: '4px',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease-in-out',
            marginTop: '8px',
            width: '100%',
          }}
          className="active:scale-95"
        >
          {loading ? (
            <>
              <InlineSpinner />
              <span>Đang đăng nhập...</span>
            </>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      {/* Helper Pre-seeded Credentials Card */}
      <div style={{
        background: '#FAF8FF',
        border: '1px dashed #C3C5D7',
        borderRadius: '6px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-brand)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
          Tài khoản dùng thử (Click để điền)
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleAutofill('admin@ticketbox.vn', 'admin123')}
            style={{
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E7E7F3',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E7E7F3')}
          >
            <span style={{ fontWeight: 600, color: '#191B23' }}>Vai trò: Administrator</span>
            <span style={{ color: '#6B7280', marginTop: '2px' }}>Email: admin@ticketbox.vn / Pass: admin123</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutofill('organizer-t3-01@ticketbox.vn', 'organizer123')}
            style={{
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E7E7F3',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E7E7F3')}
          >
            <span style={{ fontWeight: 600, color: '#191B23' }}>Vai trò: Organizer 1</span>
            <span style={{ color: '#6B7280', marginTop: '2px' }}>Email: organizer-t3-01@ticketbox.vn / Pass: organizer123</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutofill('organizer-t3-02@ticketbox.vn', 'organizer123')}
            style={{
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E7E7F3',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E7E7F3')}
          >
            <span style={{ fontWeight: 600, color: '#191B23' }}>Vai trò: Organizer 2</span>
            <span style={{ color: '#6B7280', marginTop: '2px' }}>Email: organizer-t3-02@ticketbox.vn / Pass: organizer123</span>
          </button>

          <button
            type="button"
            onClick={() => handleAutofill('customer-t3-01@example.com', 'customer123')}
            style={{
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E7E7F3',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#E7E7F3')}
          >
            <span style={{ fontWeight: 600, color: '#191B23' }}>Vai trò: Customer (Test RBAC)</span>
            <span style={{ color: '#6B7280', marginTop: '2px' }}>Email: customer-t3-01@example.com / Pass: customer123</span>
          </button>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        color: '#434654',
        borderTop: '1px solid #E7E7F3',
        paddingTop: '16px',
        marginTop: '8px',
      }}>
        Chưa có tài khoản quản trị?{' '}
        <Link
          href="/register"
          style={{
            color: 'var(--color-brand)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
