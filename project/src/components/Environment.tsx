import React, { useEffect, useMemo, useState } from 'react';

const SCENES = [
  {
    name: 'predawn',
    start: 4,
    end: 6,
    sky: '#0b1730',
    far: '#0f1b2e',
    mid: '#111c2b',
    fore: '#0d141f',
  },
  {
    name: 'dawn',
    start: 6,
    end: 8,
    sky: '#1b2a44',
    far: '#1a263a',
    mid: '#1b2837',
    fore: '#141c2a',
  },
  {
    name: 'morning',
    start: 8,
    end: 12,
    sky: '#26324a',
    far: '#1f2a3d',
    mid: '#1c2737',
    fore: '#141c28',
  },
  {
    name: 'afternoon',
    start: 12,
    end: 16,
    sky: '#2d2f38',
    far: '#242a33',
    mid: '#1f252e',
    fore: '#171d26',
  },
  {
    name: 'golden',
    start: 16,
    end: 19,
    sky: '#2c2b34',
    far: '#2a2d32',
    mid: '#1f252c',
    fore: '#171d24',
  },
  {
    name: 'night',
    start: 19,
    end: 24,
    sky: '#0a0e16',
    far: '#0d111a',
    mid: '#0f141c',
    fore: '#0b1018',
  },
  {
    name: 'late',
    start: 0,
    end: 4,
    sky: '#090d14',
    far: '#0c1018',
    mid: '#0d121a',
    fore: '#0b1016',
  },
];

const getSceneForHour = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  return SCENES.find((scene) => normalized >= scene.start && normalized < scene.end) || SCENES[0];
};

export function Environment({ isQuiet = false }: { isQuiet?: boolean }) {
  const [hour, setHour] = useState(() => new Date().getHours());
  const scene = useMemo(() => getSceneForHour(hour), [hour]);
  const quietOpacity = isQuiet ? 0.8 : 1;
  const quietSaturation = isQuiet ? 0.7 : 1;

  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <rect width="1440" height="900" fill={scene.sky} />
        <path
          d="M0,520 C220,480 420,520 640,480 C860,440 1120,500 1440,460 L1440,900 L0,900 Z"
          fill={scene.far}
          style={{ transition: 'fill 1200ms ease' }}
        />
        <path
          d="M0,600 C280,560 520,610 760,560 C980,520 1200,600 1440,560 L1440,900 L0,900 Z"
          fill={scene.mid}
          style={{
            transition: 'fill 1200ms ease, opacity 1200ms ease, filter 1200ms ease',
            opacity: quietOpacity,
            filter: `saturate(${quietSaturation})`,
          }}
        />
        <path
          d="M0,700 C320,660 620,720 900,680 C1160,640 1280,700 1440,680 L1440,900 L0,900 Z"
          fill={scene.fore}
          style={{
            transition: 'fill 1200ms ease, opacity 1200ms ease, filter 1200ms ease',
            opacity: quietOpacity,
            filter: `saturate(${quietSaturation})`,
          }}
        />
      </svg>
    </div>
  );
}
