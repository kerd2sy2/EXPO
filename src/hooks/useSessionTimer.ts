import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { WorkSession } from '../types/delegate';

export function formatSessionElapsed(startTime?: string | null): string {
  if (!startTime) return '00:00:00';
  try {
    const createdTime = new Date(startTime).getTime();
    if (isNaN(createdTime) || createdTime <= 0) return '00:00:00';

    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - createdTime) / 1000));

    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } catch {
    return '00:00:00';
  }
}

export function useSessionTimer(activeSession: WorkSession | null) {
  const [elapsedTime, setElapsedTime] = useState<string>(() =>
    formatSessionElapsed(activeSession?.start_time)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStartTimeRef = useRef<string | undefined>(activeSession?.start_time);

  // If start_time changed between renders, compute immediately without waiting for useEffect
  let currentDisplayTime = elapsedTime;
  if (activeSession?.start_time !== lastStartTimeRef.current) {
    lastStartTimeRef.current = activeSession?.start_time;
    currentDisplayTime = formatSessionElapsed(activeSession?.start_time);
  }

  useEffect(() => {
    if (!activeSession || !activeSession.start_time) {
      setElapsedTime('00:00:00');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const updateTick = () => {
      setElapsedTime(formatSessionElapsed(activeSession.start_time));
    };

    // Initial calculation immediately
    updateTick();

    // 1-second interval
    timerRef.current = setInterval(updateTick, 1000);

    // Reconcile immediately when returning from background
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateTick();
      }
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      sub.remove();
    };
  }, [activeSession?.id, activeSession?.start_time]);

  return { elapsedTime: activeSession ? currentDisplayTime : '00:00:00' };
}
