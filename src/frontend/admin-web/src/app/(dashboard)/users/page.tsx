'use client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUsersData } from '@/hooks/useUsersData';
import { formatDate } from '@/utils/format';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';

export default function UsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const {
    users,
    meta,
    loading,
    search,
    role,
    setSearch,
    handleRoleChange,
    handlePageChange,
  } = useUsersData();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  if (authLoading || !isAdmin) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: '36px',
            letterSpacing: '-0.6px',
            color: '#191B23',
            margin: 0,
          }}>Users</h1>
          <p style={{
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#434654',
            margin: '4px 0 0',
          }}>Manage system users and their roles.</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '250px',
            background: 'var(--color-bg-white)',
          }}
        />
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '14px',
            background: 'var(--color-bg-white)',
          }}
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ORGANIZER">Organizer</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* ── Data Table ── */}
      <div style={{
        background: 'var(--color-bg-white)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px' }}>
            <Spinner size={32} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8F9FA', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-secondary)' }}>User</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Role</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Orders</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Tickets</th>
                  <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-secondary)' }}>Joined At</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{user.fullName || 'No Name'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: user.role === 'ADMIN' ? '#FEE2E2' :
                            user.role === 'ORGANIZER' ? '#E0E7FF' :
                              user.role === 'STAFF' ? '#FEF3C7' : '#F3F4F6',
                          color: user.role === 'ADMIN' ? '#991B1B' :
                            user.role === 'ORGANIZER' ? '#3730A3' :
                              user.role === 'STAFF' ? '#92400E' : '#374151',
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>
                        {user._count.orders}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>
                        {user._count.tickets}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && meta && meta.totalPages > 0 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          totalCount={meta.total}
          onPageChange={handlePageChange}
          perPage={20}
        />
      )}
    </div>
  );
}
