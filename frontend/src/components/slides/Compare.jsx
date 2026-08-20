import { useEffect, useState } from 'react'

const SIDES = {
  left: {
    dot: 'bg-sky-400',
    head: 'text-sky-400',
    border: 'border-sky-500/25',
    bg: 'bg-sky-950/15',
  },
  right: {
    dot: 'bg-emerald-400',
    head: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-950/15',
  },
}

function Side({ side, data, shown, offset }) {
  const c = SIDES[side]

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} px-8 py-7`}>
      <div className={`text-2xl mb-6 ${c.head}`}>{data.heading}</div>

      <div className="space-y-4">
        {data.points.map((p, i) => (
          <div
            key={p}
            className="flex items-start gap-3"
            style={{
              opacity: offset + i < shown ? 1 : 0,
              transform: offset + i < shown ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 450ms ease-out, transform 450ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <span className={`shrink-0 mt-3 w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <p className="text-2xl text-slate-100 leading-snug break-keep">{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Compare({ title, caption, left, right }) {
  const [shown, setShown] = useState(0)

  const total = (left?.points.length ?? 0) + (right?.points.length ?? 0)

  // 왼쪽을 먼저 다 채우고 오른쪽으로 넘어간다. 대비가 순서로 드러난다.
  useEffect(() => {
    setShown(0)
    const timers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 400 + i * 380)
    )
    return () => timers.forEach(clearTimeout)
  }, [total, left, right])

  if (!left || !right) return null

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-10">
      <h2 className="text-5xl font-bold mb-12 text-white tracking-tight">{title}</h2>

      <div className="grid grid-cols-2 gap-6 items-start">
        <Side side="left" data={left} shown={shown} offset={0} />
        <Side side="right" data={right} shown={shown} offset={left.points.length} />
      </div>

      {caption && (
        <p className="mt-12 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}