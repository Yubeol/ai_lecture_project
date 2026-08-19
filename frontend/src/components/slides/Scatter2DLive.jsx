import { useEffect, useState } from 'react'

const BASE = '#38bdf8'    // 처음부터 있던 점
const NEW = '#fbbf24'     // 방금 추가된 점

const W = 900
const H = 460
const PAD = 80
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

export default function Scatter2DLive({ title, caption, data = [] }) {
  const [shown, setShown] = useState(0)

  // 초기 점들만 순차 등장. 나중에 추가된 점은 즉시 나타난다.
  useEffect(() => {
    const baseCount = data.filter((d) => !d.added).length
    setShown(0)
    const timers = Array.from({ length: baseCount }, (_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 300 + i * 280)
    )
    return () => timers.forEach(clearTimeout)
  }, [data.length])

  const points = layoutLabels(data.map((p) => ({ ...p, ...toPx(p.x, p.y) })))

  // 추가된 점 → 가장 가까운 원본 점 연결선을 위한 좌표 찾기
  const byText = Object.fromEntries(points.map((p) => [p.sentence, p]))

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-6">
        <span className="tnum text-slate-400">768</span>차원 → PCA로 2차원 축소
        <span className="text-slate-700 mx-3">·</span>
        축은 고정되어 있어 점을 나중에 추가해도 기존 점은 움직이지 않습니다
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <radialGradient id="baseGrad">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
          <radialGradient id="newGrad">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <filter id="liveGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2}
              stroke="#1e293b" strokeWidth="1" />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD}
              stroke="#1e293b" strokeWidth="1" />

        {/* 추가된 점 → 가장 가까운 점 연결선.
            2D 위치가 애매해도 768차원에서 무엇과 가까운지를 보여준다. */}
        {points.filter((p) => p.added && p.nearest).map((p) => {
          const target = byText[p.nearest]
          if (!target) return null
          const mx = (p.cx + target.cx) / 2
          const my = (p.cy + target.cy) / 2
          return (
            <g key={`link-${p.sentence}`} style={{ opacity: 0.75 }}>
              <line
                x1={p.cx} y1={p.cy} x2={target.cx} y2={target.cy}
                stroke={NEW} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5"
              />
              <rect
                x={mx - 30} y={my - 11} width="60" height="20" rx="10"
                fill="#0b0f19" stroke={NEW} strokeOpacity="0.4"
              />
              <text
                x={mx} y={my + 4} textAnchor="middle"
                fill={NEW} fontSize="13" className="tnum"
              >
                {p.nearest_score?.toFixed(3)}
              </text>
            </g>
          )
        })}

        {points.map((p, i) => {
          const { cx, cy, labelY, flip, added } = p
          const baseIdx = data.slice(0, i).filter((d) => !d.added).length
          const visible = added || baseIdx < shown
          const color = added ? NEW : BASE
          const grad = added ? 'url(#newGrad)' : 'url(#baseGrad)'
          const tx = flip ? cx - R - LABEL_GAP : cx + R + LABEL_GAP
          const drifted = Math.abs(labelY - cy) > 4

          return (
            <g key={p.sentence}>
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
                {visible && (
                  <circle cx={cx} cy={cy} r={R} fill="none"
                          stroke={color} strokeWidth="1.5" opacity="0">
                    <animate attributeName="r" from={R} to={R * 6}
                             dur="1.2s" begin="0.25s" fill="freeze" />
                    <animate attributeName="opacity" from="0.8" to="0"
                             dur="1.2s" begin="0.25s" fill="freeze" />
                  </circle>
                )}
                <circle cx={cx} cy={cy} r={added ? R * 3 : R * 2.4}
                        fill={color} opacity="0.18" />
                <circle cx={cx} cy={cy} r={added ? R * 1.3 : R}
                        fill={grad} filter="url(#liveGlow)" />
              </g>

              <g style={{
                opacity: visible ? 1 : 0,
                transition: 'opacity 400ms ease 320ms',
              }}>
                {drifted && (
                  <polyline
                    points={`${cx},${cy + R} ${cx},${labelY} ${flip ? tx + 4 : tx - 4},${labelY}`}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.3"
                  />
                )}
                <text
                  x={tx} y={labelY + 6}
                  textAnchor={flip ? 'end' : 'start'}
                  fill={added ? '#fde68a' : '#bae6fd'}
                  fontSize="18"
                  fontWeight={added ? 600 : 400}
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