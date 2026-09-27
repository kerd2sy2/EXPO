import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { WorkSession } from '../types/delegate';

export function useSessionTimer(activeSession: WorkSession | null) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef<any>(null);

  const calculateElapsed = () => {
    if (!activeSession?.start_time) {
      setElapsedTime('00:00:00');
      return;
    }

    try {
      const createdTime = new Date(activeSession.start_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - createdTime) / 1000));

      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      const formatted = `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setElapsedTime(formatted);
    } catch {
      setElapsedTime('00:00:00');
    }
  };

  useEffect(() => {
    if (!activeSession || !activeSession.start_time) {
      setElapsedTime('00:00:00');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Initial calculation immediately
    calculateElapsed();

    // 1-second interval
    timerRef.current = setInterval(calculateElapsed, 1000);

    // Reconcile immediately when returning from background
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        calculateElapsed();
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

  return { elapsedTime };
}
