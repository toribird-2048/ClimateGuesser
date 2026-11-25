import { useState } from 'react';

interface HythergraphProps {
  monthlyTempC: number[];
  monthlyPrecipMm: number[];
  annualMeanTemp: number;
  annualPrecip: number;
  compact?: boolean;
  showGuides?: boolean;
  hideSummaryStats?: boolean;
}

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

interface LabelPlacement {
  lx: number;
  ly: number;
}

/**
 * Computes readable non-overlapping label positions around the 12 monthly vertices
 * by offsetting outward from the polygon centroid and gently nudging crowded pairs.
 */
function computeLabelPlacements(
  points: { x: number; y: number }[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  offsetDist: number
): LabelPlacement[] {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const placements: LabelPlacement[] = points.map((p, idx) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy);
    // Fallback deterministic radial angle if points are tightly clustered (e.g. arid BW or flat Af)
    const angle = len > 4 ? Math.atan2(dy, dx) : (idx / 12) * Math.PI * 2 - Math.PI / 2;
    return {
      lx: p.x + Math.cos(angle) * offsetDist,
      ly: p.y + Math.sin(angle) * offsetDist,
    };
  });

  // 4 quick relaxation passes to separate nearby month numbers
  const minSep = offsetDist * 1.05;
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const dx = placements[j].lx - placements[i].lx;
        const dy = placements[j].ly - placements[i].ly;
        const dist = Math.hypot(dx, dy);
        if (dist < minSep) {
          const push = (minSep - dist) * 0.55;
          const angle = dist > 0.1 ? Math.atan2(dy, dx) : ((i + j) % 12) * 0.52;
          const px = Math.cos(angle) * push;
          const py = Math.sin(angle) * push;
          placements[i].lx -= px;
          placements[i].ly -= py;
          placements[j].lx += px;
          placements[j].ly += py;
        }
      }
    }
  }

  return placements.map((pl) => ({
    lx: Math.max(bounds.minX, Math.min(bounds.maxX, pl.lx)),
    ly: Math.max(bounds.minY, Math.min(bounds.maxY, pl.ly)),
  }));
}

export function Hythergraph({
  monthlyTempC,
  monthlyPrecipMm,
  annualMeanTemp,
  annualPrecip,
  compact = false,
  showGuides = false,
  hideSummaryStats = false,
}: HythergraphProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const width = compact ? 440 : 620;
  const height = compact ? 310 : 450;
  const padLeft = compact ? 48 : 58;
  const padRight = compact ? 30 : 48;
  const padTop = compact ? 22 : 30;
  const padBottom = compact ? 42 : 52;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Vertical axis: Temperature (°C), textbook standard range at least -10°C to 30°C
  const rawMinT = Math.min(...monthlyTempC);
  const rawMaxT = Math.max(...monthlyTempC);
  const minT = Math.min(-10, Math.floor((rawMinT - 4) / 10) * 10);
  const maxT = Math.max(30, Math.ceil((rawMaxT + 4) / 10) * 10);
  const tempRange = Math.max(20, maxT - minT);

  // Horizontal axis: Monthly Precipitation (mm), floor at 250mm so arid climates visually hug the left
  const rawMaxP = Math.max(...monthlyPrecipMm, 0);
  const maxP = Math.max(250, Math.ceil((rawMaxP * 1.15) / 50) * 50);

  const xForPrecip = (p: number) => padLeft + (Math.max(0, p) / maxP) * plotW;
  const yForTemp = (t: number) => padTop + (1 - (t - minT) / tempRange) * plotH;

  const tempStep = tempRange > 60 ? 20 : 10;
  const tempTicks: number[] = [];
  for (let t = minT; t <= maxT; t += tempStep) {
    tempTicks.push(t);
  }

  const precipStep = maxP <= 300 ? 50 : maxP <= 600 ? 100 : 150;
  const precipTicks: number[] = [];
  for (let p = 0; p <= maxP; p += precipStep) {
    precipTicks.push(p);
  }
  if (precipTicks[precipTicks.length - 1] !== maxP) {
    precipTicks.push(maxP);
  }

  const points = monthlyTempC.map((t, idx) => ({
    x: xForPrecip(monthlyPrecipMm[idx]),
    y: yForTemp(t),
    t,
    p: monthlyPrecipMm[idx],
    month: idx + 1,
  }));

  const polygonPoints = points.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

  const labels = computeLabelPlacements(
    points,
    {
      minX: padLeft + 10,
      maxX: width - padRight - 10,
      minY: padTop + 12,
      maxY: padTop + plotH - 8,
    },
    compact ? 13 : 16
  );

  // Direction chevrons placed on selected segments if long enough to read cleanly
  const arrowIndices = [0, 3, 6, 9];
  const arrows = arrowIndices
    .map((idx) => {
      const a = points[idx];
      const b = points[(idx + 1) % 12];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < (compact ? 22 : 28)) return null;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return { idx, mx, my, angleDeg };
    })
    .filter((item): item is { idx: number; mx: number; my: number; angleDeg: number } =>
      Boolean(item)
    );

  // Optional Köppen threshold guides (unlocked via Hint 1 in Hythergraph Mode or toggled in Reveal)
  const tempGuides = [
    { value: 18, label: '18℃ (A)', color: '#34D399' },
    { value: 10, label: '10℃ (E)', color: '#CBD5E1' },
    { value: 0, label: '0℃ (EF)', color: '#7DD3FC' },
    { value: -3, label: '-3℃ (C/D)', color: '#A5B4FC' },
  ].filter((g) => g.value >= minT && g.value <= maxT);

  const show60mmGuide = showGuides && 60 <= maxP;
  const zeroY = yForTemp(0);
  const showBaselineZero = !showGuides && minT < 0 && maxT > 0;

  const activePoint = hoveredMonth !== null ? points[hoveredMonth] : null;

  return (
    <div className="w-full select-none space-y-2.5">
      {/* Legend & Live Hover Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" aria-hidden="true" />
            <span>1月</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" aria-hidden="true" />
            <span>7月</span>
          </span>
          <span className="text-slate-500 hidden sm:inline">1→2→…→12月</span>
        </div>

        <div className="font-mono tabular-nums text-slate-300 whitespace-nowrap">
          {activePoint ? (
            <span className="text-white font-semibold">
              {activePoint.month}月 · {activePoint.t.toFixed(1)}℃ · {activePoint.p}mm
            </span>
          ) : hideSummaryStats ? (
            <span className="text-slate-400 font-sans">
              点または下の月番号にカーソルを合わせて数値確認
            </span>
          ) : (
            <span className="text-slate-400">
              年平均 {annualMeanTemp.toFixed(1)}℃ · 年 {annualPrecip.toLocaleString()}mm
            </span>
          )}
        </div>
      </div>

      {/* Main SVG Coordinate Stage */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="横軸に月降水量、縦軸に月平均気温をとった12ヶ月のハイサーグラフ"
      >
        {/* Plot Area Background */}
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          rx={6}
          fill="rgba(2, 6, 23, 0.55)"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth={1}
        />

        {/* Horizontal Temperature Grid Lines */}
        {tempTicks.map((t) => {
          const y = yForTemp(t);
          return (
            <g key={`hyther-t-${t}`}>
              <line
                x1={padLeft}
                x2={padLeft + plotW}
                y1={y}
                y2={y}
                stroke="rgba(148, 163, 184, 0.14)"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {t}°
              </text>
            </g>
          );
        })}

        {/* Vertical Precipitation Grid Lines */}
        {precipTicks.map((p) => {
          const x = xForPrecip(p);
          return (
            <g key={`hyther-p-${p}`}>
              <line
                x1={x}
                x2={x}
                y1={padTop}
                y2={padTop + plotH}
                stroke="rgba(148, 163, 184, 0.14)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={padTop + plotH + 16}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {p}
              </text>
            </g>
          );
        })}

        {/* Subtle 0°C Reference Line when guides are off */}
        {showBaselineZero && (
          <line
            x1={padLeft}
            x2={padLeft + plotW}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(248, 250, 252, 0.3)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}

        {/* Köppen Threshold Guide Lines (Hint 1 or Review Toggle) */}
        {showGuides &&
          tempGuides.map((g) => {
            const y = yForTemp(g.value);
            return (
              <g key={`guide-t-${g.value}`}>
                <line
                  x1={padLeft}
                  x2={padLeft + plotW}
                  y1={y}
                  y2={y}
                  stroke={g.color}
                  strokeOpacity={0.7}
                  strokeDasharray="5 4"
                  strokeWidth={1.25}
                />
                <text
                  x={padLeft + plotW - 6}
                  y={y - 4}
                  textAnchor="end"
                  fill={g.color}
                  className="font-mono text-[9.5px] font-semibold"
                >
                  {g.label}
                </text>
              </g>
            );
          })}

        {show60mmGuide && (
          <g>
            <line
              x1={xForPrecip(60)}
              x2={xForPrecip(60)}
              y1={padTop}
              y2={padTop + plotH}
              stroke="#FBBF24"
              strokeOpacity={0.75}
              strokeDasharray="5 4"
              strokeWidth={1.25}
            />
            <text
              x={xForPrecip(60) + 5}
              y={padTop + 13}
              textAnchor="start"
              fill="#FBBF24"
              className="font-mono text-[9.5px] font-semibold"
            >
              60mm (Af)
            </text>
          </g>
        )}

        {/* Axis Titles */}
        <text
          x={padLeft + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-300 text-[11px] font-medium"
        >
          月降水量 (mm) →
        </text>
        <text
          x={14}
          y={padTop + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${padTop + plotH / 2})`}
          className="fill-slate-300 text-[11px] font-medium"
        >
          月平均気温 (℃) →
        </text>

        {/* Closed 12-Month Hythergraph Polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(56, 189, 248, 0.14)"
          stroke="#38BDF8"
          strokeWidth={compact ? 2 : 2.5}
          strokeLinejoin="round"
        />

        {/* Directional Chevrons */}
        {arrows.map((a) => (
          <path
            key={`arrow-${a.idx}`}
            d="M -3.5 -2.8 L 3.5 0 L -3.5 2.8"
            fill="none"
            stroke="#7DD3FC"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${a.mx.toFixed(1)} ${a.my.toFixed(1)}) rotate(${a.angleDeg.toFixed(1)})`}
          />
        ))}

        {/* Active Hover Crosshair to Both Axes */}
        {activePoint && (
          <g pointerEvents="none">
            <line
              x1={padLeft}
              x2={activePoint.x}
              y1={activePoint.y}
              y2={activePoint.y}
              stroke="rgba(248, 250, 252, 0.55)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={activePoint.y}
              y2={padTop + plotH}
              stroke="rgba(248, 250, 252, 0.55)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          </g>
        )}

        {/* Month Labels & Interactive Vertices */}
        {points.map((pt, idx) => {
          const isHovered = hoveredMonth === idx;
          const isJan = idx === 0;
          const isJul = idx === 6;
          const labelPos = labels[idx];

          const dotFill = isHovered
            ? '#FFFFFF'
            : isJan
              ? '#38BDF8'
              : isJul
                ? '#FB7185'
                : '#E2E8F0';
          const dotStroke = isHovered
            ? '#10B981'
            : isJan
              ? '#0C4A6E'
              : isJul
                ? '#881337'
                : '#0F172A';
          const baseR = isJan || isJul ? (compact ? 4 : 5) : compact ? 3 : 3.7;

          return (
            <g
              key={`pt-${pt.month}`}
              onMouseEnter={() => setHoveredMonth(idx)}
              onMouseLeave={() => setHoveredMonth(null)}
              className="cursor-pointer"
            >
              {/* Generous invisible hit area for easy hovering */}
              <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />

              {isHovered && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={baseR + 4.5}
                  fill="rgba(52, 211, 153, 0.25)"
                  stroke="#34D399"
                  strokeWidth={1.5}
                />
              )}

              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? baseR + 1.4 : baseR}
                fill={dotFill}
                stroke={dotStroke}
                strokeWidth={1.5}
              />

              <text
                x={labelPos.lx}
                y={labelPos.ly + 3.5}
                textAnchor="middle"
                className={`font-mono pointer-events-none ${
                  isHovered
                    ? 'fill-emerald-300 font-bold text-[11px]'
                    : isJan
                      ? 'fill-sky-300 font-bold text-[10.5px]'
                      : isJul
                        ? 'fill-rose-300 font-bold text-[10.5px]'
                        : 'fill-slate-300 text-[9.5px]'
                }`}
              >
                {pt.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Interactive 12-Month Quick Inspector Strip (essential when points cluster tightly) */}
      <div
        className="grid grid-cols-6 sm:grid-cols-12 gap-1"
        role="group"
        aria-label="月別の気温・降水量を強調表示"
      >
        {MONTH_NUMBERS.map((m, idx) => {
          const isHovered = hoveredMonth === idx;
          const isJan = idx === 0;
          const isJul = idx === 6;
          return (
            <button
              key={m}
              type="button"
              onMouseEnter={() => setHoveredMonth(idx)}
              onMouseLeave={() => setHoveredMonth(null)}
              onFocus={() => setHoveredMonth(idx)}
              onBlur={() => setHoveredMonth(null)}
              onClick={() => setHoveredMonth((curr) => (curr === idx ? null : idx))}
              className={`py-1 px-1 rounded text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                isHovered
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : isJan
                    ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                    : isJul
                      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                      : 'bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
              title={`${m}月: ${monthlyTempC[idx].toFixed(1)}℃ / ${monthlyPrecipMm[idx]}mm`}
            >
              {m}月
            </button>
          );
        })}
      </div>
    </div>
  );
}
