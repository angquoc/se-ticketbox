import { useState, useEffect, useCallback } from 'react';
import { getUsers, UserListItem, UserListMeta } from '@/services/userService';

export function useUsersData() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [meta, setMeta] = useState<UserListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const limit = 20;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUsers(page, limit, debouncedSearch, role);
      setUsers(res.users);
      setMeta(res.meta);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePageChange = (newPage: number) => {
    if (meta && newPage >= 1 && newPage <= meta.totalPages) {
      setPage(newPage);
    }
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setPage(1);
  };

  return {
    users,
    meta,
    loading,
    page,
    search,
    role,
    setSearch,
    handleRoleChange,
    handlePageChange,
    refresh: fetchUsers,
  };
}
