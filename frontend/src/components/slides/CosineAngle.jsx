import { useEffect, useState } from 'react'

const SIZE = 300
const CX = SIZE / 2
const CY = SIZE / 2 + 20
const R = 110

/** 각도(도)를 화면 좌표로. 0도가 오른쪽, 반시계 방향. */
function tip(deg) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) }
}

function colorFor(score) {
  if (score >= 0.5) return '#34d399'
  if (score >= 0.25) return '#fbbf24'
  return '#fb7185'
}

function AnglePlot({ item, delay }) {
  const [shown, setShown] = useState(false)
  const color = colorFor(item.score)

  // 첫 화살표는 항상 0도(기준). 두 번째가 실제 각도만큼 벌어진다.
  const baseDeg = 0
  const otherDeg = item.angle

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const p1 = tip(baseDeg)
  const p2 = tip(shown ? otherDeg : 0)

  // 두 화살표 사이 부채꼴
  const arcR = 42
  const a1 = tip(0)
  const arcStart = { x: CX + arcR, y: CY }
  const arcEndDeg = shown ? otherDeg : 0
  const arcEnd = {
    x: CX + arcR * Math.cos((arcEndDeg * Math.PI) / 180),
    y: CY - arcR * Math.sin((arcEndDeg * Math.PI) / 180),
  }
  const largeArc = arcEndDeg > 180 ? 1 : 0

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[300px]">
        <defs>
          <marker id={`head-${item.angle}`} markerWidth="9" markerHeight="9"
                  refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 z" fill={color} />
          </marker>
          <marker id="headBase" markerWidth="9" markerHeight="9"
                  refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 z" fill="#64748b" />
          </marker>
        </defs>

        {/* 기준 원 */}
        <circle cx={CX} cy={CY} r={R} fill="none"
                stroke="#1e293b" strokeWidth="1" strokeDasharray="3 5" />

        {/* 각도 부채꼴 */}
        <path
          d={`M ${CX} ${CY} L ${arcStart.x} ${arcStart.y}
              A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`}
          fill={color}
          opacity="0.14"
          style={{ transition: 'all 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />

        {/* 기준 벡터 */}
        <line x1={CX} y1={CY} x2={p1.x} y2={p1.y}
              stroke="#64748b" strokeWidth="2.5" markerEnd="url(#headBase)" />

        {/* 비교 벡터 */}
        <line
          x1={CX} y1={CY} x2={p2.x} y2={p2.y}
          stroke={color} strokeWidth="2.5"
          markerEnd={`url(#head-${item.angle})`}
          style={{ transition: 'all 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />

        <circle cx={CX} cy={CY} r="3.5" fill="#94a3b8" />

        {/* 각도 숫자 */}
        <text x={CX + 58} y={CY - 14} fill={color} fontSize="19" className="tnum">
          {shown ? `${item.angle}°` : '0°'}
        </text>
      </svg>

      <div className="text-center -mt-2">
        <div className="text-3xl font-bold tnum mb-3" style={{ color }}>
          {item.score.toFixed(3)}
        </div>
        <div className="text-base text-slate-400 leading-relaxed max-w-[280px]">
          <div className="text-slate-500">{item.a}</div>
          <div className="text-slate-600 my-1">↕</div>
          <div className="text-slate-300">{item.b}</div>
        </div>
      </div>
    </div>
  )
}

export default function CosineAngle({ title, caption, data = [] }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-10">
        코사인 유사도는 두 벡터가 이루는 각도다 ·
        <span className="text-slate-400"> 0° = 1.000</span>,
        <span className="text-slate-400"> 90° = 0.000</span>,
        <span className="text-slate-400"> 180° = −1.000</span>
      </p>

      <div className={`grid gap-10 ${
        data.length === 1 ? 'grid-cols-1 max-w-md mx-auto'
        : data.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        {data.map((item, i) => (
          <AnglePlot key={`${item.a}|${item.b}`} item={item} delay={400 + i * 550} />
        ))}
      </div>

      {caption && (
        <p className="mt-10 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}