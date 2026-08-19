import { useEffect, useState } from 'react'

const DOT = '#38bdf8'

const W = 900
const H = 440
const PAD = 70
const R = 5
const LABEL_GAP = 14
const MIN_GAP = 30
const CHAR_W = 17

function toPx(x, y) {
  return {
    cx: PAD + ((x + 1) / 2) * (W - PAD * 2),
    cy: PAD + ((1 - y) / 2) * (H - PAD * 2),
  }
}

/**
 * 라벨 배치를 결정한다.
 * - 오른쪽에 자리가 없으면 왼쪽으로 뺀다
 * - 라벨끼리 세로로 겹치면 아래로 밀어낸다
 */
function layoutLabels(points) {
  const sorted = points.map((p, i) => ({ ...p, i })).sort((a, b) => a.cy - b.cy)

  let prevY = -Infinity
  for (const p of sorted) {
    const width = p.sentence.length * CHAR_W
    p.flip = p.cx + R + LABEL_GAP + width > W - 8
    p.labelY = Math.max(p.cy, prevY + MIN_GAP)
    prevY = p.labelY
  }

  const out = new Array(points.length)
  for (const p of sorted) out[p.i] = p
  return out
}

export default function Scatter2D({ title, caption, data = [] }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
    const timers = data.map((_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 400 + i * 320)
    )
    return () => timers.forEach(clearTimeout)
  }, [data])

  const points = layoutLabels(data.map((p) => ({ ...p, ...toPx(p.x, p.y) })))

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-6">
        <span className="tnum text-slate-400">768</span>차원 → PCA로 2차원 축소
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <radialGradient id="dotGrad">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
          <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 격자 */}
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2}
              stroke="#1e293b" strokeWidth="1" />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD}
              stroke="#1e293b" strokeWidth="1" />

        {points.map((p, i) => {
          const { cx, cy, labelY, flip } = p
          const visible = i < shown
          const tx = flip ? cx - R - LABEL_GAP : cx + R + LABEL_GAP
          const drifted = Math.abs(labelY - cy) > 4

          return (
            <g key={p.sentence}>
              {/* 점: 중앙에서 자기 자리로 날아온다 */}
              <g
                style={{
                  transform: visible
                    ? 'translate(0px, 0px) scale(1)'
                    : `translate(${W / 2 - cx}px, ${H / 2 - cy}px) scale(0.2)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  opacity: visible ? 1 : 0,
                  transition: 'transform 620ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease',
                }}
              >
                {/* 착지 파문 */}
                {visible && (
                  <circle cx={cx} cy={cy} r={R} fill="none"
                          stroke={DOT} strokeWidth="1.5" opacity="0">
                    <animate attributeName="r" from={R} to={R * 5}
                             dur="1.1s" begin="0.3s" fill="freeze" />
                    <animate attributeName="opacity" from="0.7" to="0"
                             dur="1.1s" begin="0.3s" fill="freeze" />
                  </circle>
                )}
                <circle cx={cx} cy={cy} r={R * 2.4} fill={DOT} opacity="0.18" />
                <circle cx={cx} cy={cy} r={R} fill="url(#dotGrad)" filter="url(#dotGlow)" />
              </g>

              {/* 라벨 */}
              <g style={{
                opacity: visible ? 1 : 0,
                transition: 'opacity 400ms ease 320ms',
              }}>
                {drifted && (
                  <polyline
                    points={`${cx},${cy + R} ${cx},${labelY} ${flip ? tx + 4 : tx - 4},${labelY}`}
                    fill="none" stroke={DOT} strokeWidth="1" opacity="0.3"
                  />
                )}
                <text
                  x={tx} y={labelY + 6}
                  textAnchor={flip ? 'end' : 'start'}
                  fill="#bae6fd" fontSize="18"
                >
                  {p.sentence}
                </text>
              </g>
            </g>
          )
        })}
      </svg>

      {caption && (
        <p className="mt-4 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}