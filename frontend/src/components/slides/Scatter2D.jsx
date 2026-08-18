import { useEffect, useState } from 'react'

// 점 색을 통일한다. 색으로 묶으면 위치로 묶이는 군집이 오히려 안 보인다.
const DOT = '#38bdf8'

const W = 900
const H = 440
const PAD = 70
const R = 5              // 점 반지름. 작을수록 라벨과 부딪힐 여지가 준다.
const LABEL_GAP = 14     // 점 가장자리에서 글자까지
const MIN_GAP = 30       // 라벨끼리 최소 세로 간격
const CHAR_W = 17        // 한글 한 글자 대략 폭 (fontSize 18 기준)

/** [-1,1] 정규화 좌표 → SVG 픽셀 */
function toPx(x, y) {
  return {
    cx: PAD + ((x + 1) / 2) * (W - PAD * 2),
    cy: PAD + ((1 - y) / 2) * (H - PAD * 2),  // y축 뒤집기
  }
}

/**
 * 라벨 배치를 결정한다.
 * - 오른쪽에 자리가 없으면 왼쪽으로 뺀다
 * - 라벨끼리 세로로 겹치면 아래로 밀어낸다
 */
function layoutLabels(points) {
  const sorted = points
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => a.cy - b.cy)

  let prevY = -Infinity
  for (const p of sorted) {
    const width = p.sentence.length * CHAR_W
    // 오른쪽으로 뻗었을 때 화면을 넘으면 왼쪽으로
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

  // 점을 하나씩 순차적으로 찍는다. 한 번에 다 뜨면 관계가 안 보인다.
  useEffect(() => {
    setShown(0)
    const timers = data.map((_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 400 + i * 350)
    )
    return () => timers.forEach(clearTimeout)
  }, [data])

  const points = layoutLabels(
    data.map((p) => ({ ...p, ...toPx(p.x, p.y) }))
  )

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white">{title}</h2>
      <p className="text-lg text-slate-500 mb-6">768차원 → PCA로 2차원 축소</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* 격자 */}
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2}
              stroke="#1e293b" strokeWidth="1" />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD}
              stroke="#1e293b" strokeWidth="1" />

        {points.map((p, i) => {
          const { cx, cy, labelY, flip } = p
          const visible = i < shown
          const tx = flip ? cx - R - LABEL_GAP : cx + R + LABEL_GAP
          const shifted = Math.abs(labelY - cy) > 4

          return (
            <g
              key={p.sentence}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.3)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'opacity 400ms ease-out, transform 400ms ease-out',
              }}
            >
              {/* 라벨이 밀려났으면 점과 이어주는 꺾은선 */}
              {shifted && (
                <polyline
                  points={`${cx},${cy + R} ${cx},${labelY} ${flip ? tx + 4 : tx - 4},${labelY}`}
                  fill="none"
                  stroke={DOT}
                  strokeWidth="1"
                  opacity="0.3"
                />
              )}
              <circle cx={cx} cy={cy} r={R * 2.2} fill={DOT} opacity="0.2" />
              <circle cx={cx} cy={cy} r={R} fill={DOT} />
              <text
                x={tx}
                y={labelY + 6}
                textAnchor={flip ? 'end' : 'start'}
                fill={DOT}
                fontSize="18"
              >
                {p.sentence}
              </text>
            </g>
          )
        })}
      </svg>

      {caption && (
        <p className="mt-4 text-xl text-slate-400 leading-relaxed">{caption}</p>
      )}
    </div>
  )
}