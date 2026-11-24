import { useState } from 'react';

interface ClimographProps {
  monthlyTempC: number[];
  monthlyPrecipMm: number[];
  annualMeanTemp: number;
  annualPrecip: number;
  compact?: boolean;
}

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export function Climograph({
  monthlyTempC,
  monthlyPrecipMm,
  annualMeanTemp,
  annualPrecip,
  compact = false,
}: ClimographProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const width = compact ? 320 : 460;
  const height = compact ? 185 : 230;
  const padLeft = compact ? 36 : 44;
  const padRight = compact ? 38 : 46;
  const padTop = compact ? 16 : 20;
  const padBottom = compact ? 26 : 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Dynamic yet intuitive temperature range (steps of 10°C, always nicely readable)
  const rawMinT = Math.min(...monthlyTempC);
  const rawMaxT = Math.max(...monthlyTempC);
  const minT = Math.min(-10, Math.floor((rawMinT - 3) / 10) * 10);
  const maxT = Math.max(30, Math.ceil((rawMaxT + 3) / 10) * 10);
  const tempRange = Math.max(20, maxT - minT);

  // Precipitation range with sensible floor (250mm) so desert bars visually look dry
  const rawMaxP = Math.max(...monthlyPrecipMm, 0);
  const maxP = Math.max(250, Math.ceil((rawMaxP * 1.15) / 50) * 50);

  const xForMonth = (idx: number) => padLeft + ((idx + 0.5) / 12) * plotW;
  const yForTemp = (t: number) => padTop + (1 - (t - minT) / tempRange) * plotH;
  const yForPrecip = (p: number) => padTop + (1 - Math.max(0, p) / maxP) * plotH;

  const tempTicks: number[] = [];
  const stepT = tempRange > 50 ? 20 : 10;
  for (let t = minT; t <= maxT; t += stepT) {
    tempTicks.push(t);
  }

  const precipTicks = [0, Math.round(maxP * 0.5), maxP];

  const linePoints = monthlyTempC
    .map((t, idx) => `${xForMonth(idx).toFixed(1)},${yForTemp(t).toFixed(1)}`)
    .join(' ');

  const barWidth = Math.max(8, (plotW / 12) * 0.58);
  const zeroY = yForTemp(0);
  const showZeroLine = minT < 0 && maxT > 0;

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between gap-3 mb-2 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block" aria-hidden="true" />
            <span>気温 (℃)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-400/75 inline-block rounded-[2px]" aria-hidden="true" />
            <span>降水量 (mm)</span>
          </span>
        </div>
        <div className="font-mono tabular-nums text-slate-400 whitespace-nowrap">
          {hoveredMonth !== null ? (
            <span className="text-slate-100">
              {hoveredMonth + 1}月 · {monthlyTempC[hoveredMonth].toFixed(1)}℃ ·{' '}
              {monthlyPrecipMm[hoveredMonth]}mm
            </span>
          ) : (
            <span>
              年平均 {annualMeanTemp.toFixed(1)}℃ · 年 {annualPrecip}mm
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="12ヶ月の月別平均気温と降水量の雨温図"
      >
        {/* Horizontal grid lines */}
        {tempTicks.map((t) => {
          const y = yForTemp(t);
          return (
            <g key={`tgrid-${t}`}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.14)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-rose-300/85 font-mono text-[10px]"
              >
                {t}°
              </text>
            </g>
          );
        })}

        {/* Highlight 0°C freezing line */}
        {showZeroLine && (
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(248, 250, 252, 0.35)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}

        {/* Right precipitation ticks */}
        {precipTicks.map((p) => {
          const y = yForPrecip(p);
          return (
            <text
              key={`pgrid-${p}`}
              x={width - padRight + 6}
              y={y + 3.5}
              textAnchor="start"
              className="fill-sky-300/85 font-mono text-[10px]"
            >
              {p}
            </text>
          );
        })}

        {/* Precipitation bars */}
        {monthlyPrecipMm.map((p, idx) => {
          const cx = xForMonth(idx);
          const y = yForPrecip(p);
          const barH = Math.max(1, padTop + plotH - y);
          const isHovered = hoveredMonth === idx;
          return (
            <rect
              key={`bar-${idx}`}
              x={cx - barWidth / 2}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              className={
                isHovered
                  ? 'fill-sky-300 transition-colors duration-150'
                  : 'fill-sky-400/65 transition-colors duration-150'
              }
            />
          );
        })}

        {/* Temperature polyline */}
        <polyline
          fill="none"
          stroke="#FB7185"
          strokeWidth={compact ? 2 : 2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePoints}
        />

        {/* Temperature dots */}
        {monthlyTempC.map((t, idx) => {
          const cx = xForMonth(idx);
          const cy = yForTemp(t);
          const isHovered = hoveredMonth === idx;
          return (
            <circle
              key={`dot-${idx}`}
              cx={cx}
              cy={cy}
              r={isHovered ? 4.5 : compact ? 2.5 : 3}
              className={isHovered ? 'fill-white stroke-rose-500' : 'fill-rose-400 stroke-slate-950'}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Month labels & invisible hover columns */}
        {MONTH_LABELS.map((label, idx) => {
          const cx = xForMonth(idx);
          const colW = plotW / 12;
          return (
            <g
              key={`month-${label}`}
              onMouseEnter={() => setHoveredMonth(idx)}
              onMouseLeave={() => setHoveredMonth(null)}
              className="cursor-pointer"
            >
              <rect
                x={cx - colW / 2}
                y={padTop}
                width={colW}
                height={plotH + padBottom}
                fill="transparent"
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                className={`font-mono text-[10px] ${
                  hoveredMonth === idx ? 'fill-white font-semibold' : 'fill-slate-400'
                }`}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
