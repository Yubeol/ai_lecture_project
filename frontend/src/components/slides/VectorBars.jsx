import { useEffect, useState } from 'react'

const ROW_COLORS = ['bg-emerald-400', 'bg-sky-400', 'bg-rose-400']
const ROW_TEXTS = ['text-emerald-400', 'text-sky-400', 'text-rose-400']

function BarRow({ item, colorIdx, delay }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const vmax = item.vmax || 1

  return (
    <div className="mb-8">
      <div className={`text-xl mb-2 ${ROW_TEXTS[colorIdx % 3]}`}>
        {item.sentence}
      </div>

      {/* 중앙선 기준 위아래로 뻗는 막대 */}
      <div className="relative h-24 flex items-center gap-[3px]">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700" />

        {item.values.map((v, i) => {
          const pct = (Math.abs(v) / vmax) * 50  // 최대 절반 높이
          const positive = v >= 0
          return (
            <div key={i} className="relative flex-1 h-full">
              <div
                className={`absolute left-0 right-0 ${ROW_COLORS[colorIdx % 3]} rounded-sm
                            transition-all duration-700 ease-out`}
                style={{
                  height: shown ? `${pct}%` : '0%',
                  [positive ? 'bottom' : 'top']: '50%',
                  opacity: shown ? 1 : 0,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function VectorBars({ title, caption, data = [], dims }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-10">
      <h2 className="text-5xl font-bold mb-4 text-white">{title}</h2>
      <p className="text-lg text-slate-500 mb-10">
        768차원 중 앞 {dims || data[0]?.values.length || 32}개
      </p>

      {data.map((item, i) => (
        <BarRow key={item.sentence} item={item} colorIdx={i} delay={400 + i * 500} />
      ))}

      {caption && (
        <p className="mt-8 text-xl text-slate-400 leading-relaxed">{caption}</p>
      )}
    </div>
  )
}