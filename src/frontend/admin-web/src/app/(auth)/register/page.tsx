'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/services/authService';
import { Field, TextInput } from '@/components/ui/FormField';
import { InlineSpinner } from '@/components/ui/Spinner';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field validation states
  const [fullNameError, setFullNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>(undefined);

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
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu phải chứa ít nhất 6 ký tự');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      valid = false;
    } else {
      setConfirmPasswordError(undefined);
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await register(email, password, fullName || undefined);
      
      setSuccess(
        'Đăng ký thành công! Tuy nhiên, tài khoản mới đăng ký sẽ mặc định có vai trò CUSTOMER. Hệ thống sẽ chuyển hướng bạn về trang Đăng nhập sau vài giây.'
      );
      
      // Clear storage since the registered user is a CUSTOMER and can't use admin dashboard
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Đăng ký thất bại. Email này có thể đã được sử dụng.');
      }
      setLoading(false);
    }
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
          Đăng ký tài khoản
        </h2>
        <p style={{
          fontSize: '13px',
          color: '#6B7280',
          marginTop: '6px',
          margin: '6px 0 0',
        }}>
          Tạo tài khoản quản trị viên / nhà tổ chức mới.
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

      {success && (
        <div style={{
          padding: '12px 14px',
          background: '#DCFCE7',
          border: '1px solid #BBF7D0',
          borderRadius: '4px',
          color: '#166534',
          fontSize: '13px',
          lineHeight: '1.5',
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Field label="Họ và tên" error={fullNameError}>
          <TextInput
            type="text"
            value={fullName}
            onChange={(val) => {
              setFullName(val);
              if (fullNameError) setFullNameError(undefined);
            }}
            placeholder="Nguyen Van A"
            hasError={!!fullNameError}
            disabled={loading || !!success}
          />
        </Field>

        <Field label="Email" required error={emailError}>
          <TextInput
            type="email"
            value={email}
            onChange={(val) => {
              setEmail(val);
              if (emailError) setEmailError(undefined);
            }}
            placeholder="organizer@example.com"
            hasError={!!emailError}
            disabled={loading || !!success}
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
            placeholder="Tối thiểu 6 ký tự"
            hasError={!!passwordError}
            disabled={loading || !!success}
          />
        </Field>

        <Field label="Xác nhận mật khẩu" required error={confirmPasswordError}>
          <TextInput
            type="password"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val);
              if (confirmPasswordError) setConfirmPasswordError(undefined);
            }}
            placeholder="Nhập lại mật khẩu"
            hasError={!!confirmPasswordError}
            disabled={loading || !!success}
          />
        </Field>

        {/* Informative Note Box */}
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '11.5px',
          color: '#92400E',
          lineHeight: '1.5',
        }}>
          ⚠️ <strong>Lưu ý:</strong> Mặc định các tài khoản đăng ký mới sẽ có vai trò là <strong>CUSTOMER</strong>. Bạn cần được cập nhật vai trò (Role) trong cơ sở dữ liệu thành <strong>ADMIN</strong> hoặc <strong>ORGANIZER</strong> để có thể đăng nhập vào Dashboard này.
        </div>

        <button
          type="submit"
          disabled={loading || !!success}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '38px',
            background: (loading || success) ? '#6B8CC7' : 'var(--color-brand)',
            borderRadius: '4px',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            border: 'none',
            cursor: (loading || success) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease-in-out',
            marginTop: '8px',
            width: '100%',
          }}
          className="active:scale-95"
        >
          {loading ? (
            <>
              <InlineSpinner />
              <span>Đang đăng ký...</span>
            </>
          ) : (
            <span>Đăng ký</span>
          )}
        </button>
      </form>

      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        color: '#434654',
        borderTop: '1px solid #E7E7F3',
        paddingTop: '16px',
        marginTop: '8px',
      }}>
        Đã có tài khoản?{' '}
        <Link
          href="/login"
          style={{
            color: 'var(--color-brand)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
