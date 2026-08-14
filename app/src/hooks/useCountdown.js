import { useEffect, useRef, useState } from 'react';

export function useCountdown(timerEndsAt) {
  const [countdown, setCountdown] = useState(null);
  const totalDuration = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerEndsAt) { setCountdown(null); totalDuration.current = null; return; }
    totalDuration.current = Math.ceil((timerEndsAt - Date.now()) / 1000);
    const tick = () => {
      const secs = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      setCountdown(secs);
      if (secs === 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [timerEndsAt]);

  return { countdown, totalDuration };
}
