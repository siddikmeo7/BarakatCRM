import React, { useEffect, useRef, useState } from 'react';

// Число «оживает»: при изменении значения оно плавно пересчитывается от старого к новому.
export default function AnimatedValue({ value, format = v => String(v) }) {
  const target = Number(value) || 0;
  // Стартуем с нуля: при открытии раздела цифры «набегают» до своих значений
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const started = performance.now();
    const duration = 750;

    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return <>{format(display)}</>;
}