'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheConcertName } from '@/lib/concert-names';
import {
  readWaitingSession,
  storeAdmittedToken,
  writeWaitingSession,
} from '@/lib/waiting-room-storage';
import type { WaitingRoomJoinResponse, WaitingRoomPollResponse } from '@/types/waiting-room';

const POLL_INTERVAL_MS = 2_000;
const MESSAGE_INTERVAL_MS = 4_500;

interface UseWaitingRoomOptions {
  concertId: string;
  onAdmitted?: (token: string) => void;
}

export function useWaitingRoom({ concertId, onAdmitted }: UseWaitingRoomOptions) {
  const [concertName, setConcertName] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'waiting' | 'admitted' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [messageTick, setMessageTick] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const admittedRef = useRef(false);
  const joinStartedRef = useRef(false);
  const onAdmittedRef = useRef(onAdmitted);

  onAdmittedRef.current = onAdmitted;

  const handleAdmitted = useCallback((token: string, tokenExpiresAt?: number) => {
    if (admittedRef.current) return;
    admittedRef.current = true;
    storeAdmittedToken(concertId, token, tokenExpiresAt);
    setStatus('admitted');
    onAdmittedRef.current?.(token);
  }, [concertId]);

  const joinQueue = useCallback(async (signal: { cancelled: boolean }) => {
    setStatus((current) =>
      current === 'waiting' || current === 'admitted' ? current : 'loading',
    );
    setError(null);
    setBackendError(null);

    const existing = readWaitingSession(concertId);
    sessionIdRef.current = existing?.sessionId ?? null;

    try {
      const res = await fetch(`/api/concerts/${concertId}/waiting-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      });

      if (!res.ok) throw new Error('Không thể vào phòng chờ');

      const json = await res.json();
      const data = json.data as WaitingRoomJoinResponse;
      if (signal.cancelled) return;

      sessionIdRef.current = data.sessionId;
      writeWaitingSession(concertId, {
        sessionId: data.sessionId,
        concertId,
      });
      setConcertName(data.concertName);
      cacheConcertName(concertId, data.concertName);
      setBackendError(data.backendError ?? null);
      setStartedAt(Date.now());
      setPosition(data.position ?? null);
      setEstimatedWaitSeconds(data.estimatedWaitSeconds ?? null);

      if (data.status === 'admitted' && data.token) {
        handleAdmitted(data.token, data.tokenExpiresAt);
        return;
      }

      if (data.waitingRoomRequired === false) {
        setStatus('error');
        setError('Không thể xác minh quyền truy cập. Vui lòng thử lại.');
        return;
      }

      setStatus('waiting');
    } catch (e) {
      if (!signal.cancelled) {
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
        setStatus('error');
      }
    }
  }, [concertId, handleAdmitted]);

  useEffect(() => {
    admittedRef.current = false;
    joinStartedRef.current = false;
    sessionIdRef.current = null;
  }, [concertId]);

  useEffect(() => {
    if (joinStartedRef.current) return;
    joinStartedRef.current = true;

    const signal = { cancelled: false };
    void joinQueue(signal);

    return () => {
      signal.cancelled = true;
      joinStartedRef.current = false;
    };
  }, [concertId, joinQueue]);

  useEffect(() => {
    if (status !== 'waiting' || !sessionIdRef.current) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/concerts/${concertId}/waiting-room?sessionId=${sessionIdRef.current}`,
        );
        if (!res.ok) throw new Error('Mất kết nối phòng chờ');

        const json = await res.json();
        const data = json.data as WaitingRoomPollResponse;
        if (cancelled) return;

        if (data.status === 'admitted' && data.token) {
          handleAdmitted(data.token, data.tokenExpiresAt);
          return;
        }

        setPosition(data.position ?? null);
        setEstimatedWaitSeconds(data.estimatedWaitSeconds ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Lỗi không xác định');
          setStatus('error');
        }
      }
    }

    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [concertId, status, handleAdmitted]);

  useEffect(() => {
    if (status !== 'waiting') return;
    const interval = setInterval(() => {
      setMessageTick((t) => t + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  const retry = useCallback(() => {
    admittedRef.current = false;
    joinStartedRef.current = false;
    sessionIdRef.current = null;
    setMessageTick(0);
    setStartedAt(null);
    setPosition(null);
    setEstimatedWaitSeconds(null);
    setError(null);
    joinStartedRef.current = true;
    void joinQueue({ cancelled: false });
  }, [joinQueue]);

  return {
    concertName,
    status,
    error,
    backendError,
    messageTick,
    startedAt,
    position,
    estimatedWaitSeconds,
    retry,
  };
}
