import { useEffect, useState } from 'react'

const ROWS = [
  { from: '#34d399', to: '#059669', text: 'text-emerald-400', glow: 'rgba(52,211,153,0.45)' },
  { from: '#38bdf8', to: '#0284c7', text: 'text-sky-400', glow: 'rgba(56,189,248,0.45)' },
  { from: '#fb7185', to: '#e11d48', text: 'text-rose-400', glow: 'rgba(251,113,133,0.45)' },
  { from: '#c084fc', to: '#9333ea', text: 'text-purple-400', glow: 'rgba(192,132,252,0.45)' },
]

function BarRow({ item, colorIdx, delay }) {
  const [shown, setShown] = useState(false)
  const c = ROWS[colorIdx % ROWS.length]
  const vmax = item.vmax || 1

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="mb-9">
      <div className={`text-xl mb-3 ${c.text}`}>{item.sentence}</div>

      {/* 중앙선 기준 위아래로 뻗는 막대 */}
      <div className="relative h-24 flex items-center gap-[4px]">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800" />

        {item.values.map((v, i) => {
          const pct = (Math.abs(v) / vmax) * 50
          const positive = v >= 0
          return (
            <div key={i} className="relative flex-1 h-full group">
              <div
                className="absolute left-0 right-0 rounded-[3px]"
                style={{
                  height: shown ? `${pct}%` : '0%',
                  [positive ? 'bottom' : 'top']: '50%',
                  background: positive
                    ? `linear-gradient(to top, ${c.to}, ${c.from})`
                    : `linear-gradient(to bottom, ${c.to}, ${c.from})`,
                  boxShadow: shown ? `0 0 10px ${c.glow}` : 'none',
                  opacity: shown ? 1 : 0,
                  // 왼쪽부터 순차적으로 솟는다
                  transition: `height 500ms cubic-bezier(0.22,1,0.36,1) ${i * 28}ms,
                               opacity 300ms ease ${i * 28}ms,
                               box-shadow 400ms ease ${i * 28}ms`,
                }}
              />
              {/* 마우스를 올리면 실제 값 */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1
                              text-[11px] text-slate-400 tnum whitespace-nowrap
                              opacity-0 group-hover:opacity-100 transition-opacity">
                {v.toFixed(3)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function VectorBars({ title, caption, data = [], dims }) {
  const n = dims || data[0]?.values.length || 16

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-10">
        <span className="tnum text-slate-400">768</span>차원 중 앞{' '}
        <span className="tnum text-slate-400">{n}</span>개
      </p>

      {data.map((item, i) => (
        <BarRow key={item.sentence} item={item} colorIdx={i} delay={300 + i * 450} />
      ))}

      {caption && (
        <p className="mt-6 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}