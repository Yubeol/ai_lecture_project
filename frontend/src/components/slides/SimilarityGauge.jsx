import { useEffect, useState } from 'react'

/** 점수 구간별 색상. 실측 최대가 0.7 언저리라 구간을 낮게 잡았다. */
function colorFor(score) {
  if (score >= 0.5) return { bar: 'bg-emerald-400', text: 'text-emerald-400' }
  if (score >= 0.3) return { bar: 'bg-amber-400', text: 'text-amber-400' }
  return { bar: 'bg-rose-400', text: 'text-rose-400' }
}

function GaugeRow({ item, delay }) {
  const [width, setWidth] = useState(0)
  const c = colorFor(item.score)

  // 순차적으로 차오르게. 강사가 말을 얹을 타이밍을 만든다.
  useEffect(() => {
    const t = setTimeout(() => setWidth(item.gauge * 100), delay)
    return () => clearTimeout(t)
  }, [item.gauge, delay])

  return (
    <div className="mb-10">
      <div className="flex items-baseline justify-between mb-3 gap-6">
        <div className="text-2xl leading-relaxed">
          <span className="text-slate-100">{item.a}</span>
          <span className="text-slate-500 mx-3">↔</span>
          <span className="text-slate-100">{item.b}</span>
        </div>
        <div className={`text-4xl font-bold tabular-nums shrink-0 ${c.text}`}>
          {item.score.toFixed(3)}
        </div>
      </div>

      {/* 트랙 + 25/50/75 눈금 */}
      <div className="relative h-6 w-full rounded-full bg-slate-800 overflow-hidden">
        {[25, 50, 75].map((t) => (
          <div
            key={t}
            className="absolute top-0 h-full w-px bg-slate-700"
            style={{ left: `${t}%` }}
          />
        ))}
        <div
          className={`relative h-full rounded-full ${c.bar} transition-[width] duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export default function SimilarityGauge({ title, caption, data = [] }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-12 py-10">
      <h2 className="text-5xl font-bold mb-12 text-white">{title}</h2>

      {data.map((item, i) => (
        <GaugeRow key={`${item.a}|${item.b}`} item={item} delay={300 + i * 400} />
      ))}

      {caption && (
        <p className="mt-10 text-xl text-slate-400 leading-relaxed">{caption}</p>
      )}
    </div>
  )
}