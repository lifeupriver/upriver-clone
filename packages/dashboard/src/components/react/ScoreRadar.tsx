import React from 'react';

interface Props {
  scores: Record<string, number>;
  size?: number;
}

const ACCENT = '#F1551A';
const BORDER = '#443828';
const MUTED  = '#9A8E83';

export function ScoreRadar({ scores, size = 260 }: Props) {
  const dimensions = Object.keys(scores);
  if (dimensions.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) * 0.78;
  const n = dimensions.length;

  function polarPoint(angle: number, r: number): [number, number] {
    const rad = (angle - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  function polygonPoints(r: number): string {
    return Array.from({ length: n }, (_, i) => {
      const [x, y] = polarPoint((360 / n) * i, r);
      return `${x},${y}`;
    }).join(' ');
  }

  const rings = [20, 40, 60, 80, 100];

  const dataPoints = dimensions.map((dim, i) => {
    const score = scores[dim] ?? 0;
    return polarPoint((360 / n) * i, (score / 100) * maxR);
  });

  const dataPoly = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Audit score radar chart"
    >
      {/* Ring lines */}
      {rings.map(pct => (
        <polygon
          key={pct}
          points={polygonPoints((pct / 100) * maxR)}
          fill="none"
          stroke={BORDER}
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes */}
      {dimensions.map((_, i) => {
        const [x, y] = polarPoint((360 / n) * i, maxR);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={x} y2={y}
            stroke={BORDER}
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={dataPoly}
        fill={`rgba(241,85,26,0.10)`}
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />
      ))}

      {/* Labels */}
      {dimensions.map((dim, i) => {
        const angle = (360 / n) * i;
        const [x, y] = polarPoint(angle, maxR * 1.16);
        const anchor =
          Math.abs(angle % 360 - 180) < 10
            ? 'middle'
            : angle % 360 > 180
            ? 'end'
            : angle % 360 < 10 || angle % 360 > 350
            ? 'middle'
            : 'start';
        return (
          <text
            key={dim}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
            fill={MUTED}
            textTransform="uppercase"
          >
            {dim.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
