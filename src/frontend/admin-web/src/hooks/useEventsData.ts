import { useState, useEffect, useCallback } from 'react';
import { getAdminConcerts } from '@/services/concertService';
import type { Concert } from '@/types/api';

export function useEventsData() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingEvent, setEditingEvent] = useState<Concert | null>(null);

  const limit = 5;
  const totalPages = Math.ceil(total / limit) || 1;

  const fetchConcerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminConcerts(currentPage, limit);
      setConcerts(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load events data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchConcerts();
  }, [fetchConcerts]);

  const handleEdit = (event: Concert) => {
    setEditingEvent((prev) => (prev?.id === event.id ? null : event));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return {
    concerts,
    total,
    loading,
    currentPage,
    totalPages,
    editingEvent,
    handleEdit,
    setEditingEvent,
    handlePageChange,
    refresh: fetchConcerts,
  };
}

