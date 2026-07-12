import { useState, useEffect, useCallback } from 'react';
import { getAdminConcertById, uploadFile, updateConcert } from '@/services/concertService';
import type { ConcertStatus } from '@/types/api';
import type { Concert } from '@/types/api';

export function useEventDetailData(id: string) {
  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const processConcertData = (data: Concert) => {
    if (data.description) {
      const endsAtMatch = data.description.match(/<!-- metadata:endsAt=(.*?) -->/);
      if (endsAtMatch && endsAtMatch[1]) {
        data.endsAt = endsAtMatch[1];
        data.description = data.description.replace(endsAtMatch[0], '').trim();
        if (data.description === '') {
          data.description = null;
        }
      }
    }
    return data;
  };

  const fetchConcert = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getAdminConcertById(id);
      setConcert(processConcertData(data));
    } catch (err) {
      console.error('Failed to load concert details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConcert();
  }, [fetchConcert]);

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!concert) return;
    setUploadingPdf(true);
    try {
      await uploadFile(concert.id, file, 'ARTIST_PRESS_KIT');
      // Refresh details to show new file
      const data = await getAdminConcertById(concert.id);
      setConcert(processConcertData(data));
    } catch (err) {
      console.error('Failed to upload PDF press kit:', err);
    } finally {
      setUploadingPdf(false);
    }
  }, [concert]);

  const handleCsvUpload = useCallback(async (file: File) => {
    if (!concert) return;
    setUploadingCsv(true);
    try {
      await uploadFile(concert.id, file, 'GUEST_LIST_CSV');
      // Refresh details
      const data = await getAdminConcertById(concert.id);
      setConcert(processConcertData(data));
    } catch (err) {
      console.error('Failed to upload CSV guest list:', err);
    } finally {
      setUploadingCsv(false);
    }
  }, [concert]);

  const handleStatusChange = useCallback(async (newStatus: ConcertStatus) => {
    if (!concert) return;
    setUpdatingStatus(true);
    try {
      await updateConcert(concert.id, { status: newStatus });
      const data = await getAdminConcertById(concert.id);
      setConcert(processConcertData(data));
    } catch (err) {
      console.error('Failed to update concert status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  }, [concert]);

  return {
    concert,
    loading,
    uploadingPdf,
    uploadingCsv,
    handlePdfUpload,
    handleCsvUpload,
    handleStatusChange,
    updatingStatus,
    refreshConcert: fetchConcert,
  };
}
