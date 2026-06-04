import { useEffect, useState } from 'react';

interface CountdownResult {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isEnded: boolean;
}

const formatTime = (timeInMs: number): CountdownResult => {
  if (timeInMs <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isEnded: true,
    };
  }

  const days = Math.floor(timeInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeInMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeInMs / 1000 / 60) % 60);
  const seconds = Math.floor((timeInMs / 1000) % 60);

  const pad = (num: number) => String(num).padStart(2, '0');

  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    isEnded: false,
  };
};

export const useCountdown = (
  targetDateString: string | undefined,
): CountdownResult => {
  const [timeLeft, setTimeLeft] = useState<CountdownResult>({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isEnded: true,
  });

  useEffect(() => {
    if (!targetDateString) return;

    let targetDate: number;
    if (/^\d+$/.test(targetDateString)) {
      targetDate = parseInt(targetDateString, 10);
      if (targetDateString.length === 10) targetDate *= 1000;
    } else {
      targetDate = new Date(targetDateString).getTime();
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      setTimeLeft(formatTime(difference));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDateString]);

  return timeLeft;
};
