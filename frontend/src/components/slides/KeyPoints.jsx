import { useEffect, useState } from 'react'

export default function KeyPoints({ title, points = [], caption }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
    const timers = points.map((_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 350 + i * 450)
    )
    return () => timers.forEach(clearTimeout)
  }, [points])

  return (
    <div className="w-full max-w-4xl mx-auto px-12 py-10">
      <h2 className="text-5xl font-bold mb-14 text-white tracking-tight leading-tight">
        {title}
      </h2>

      <div className="space-y-7">
        {points.map((p, i) => (
          <div
            key={p}
            className="flex items-start gap-6"
            style={{
              opacity: i < shown ? 1 : 0,
              transform: i < shown ? 'translateY(0)' : 'translateY(14px)',
              transition: 'opacity 500ms ease-out, transform 500ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
                        <span className="shrink-0 mt-1 w-10 h-10 rounded-full
                             flex items-center justify-center
                             bg-emerald-500/10 border border-emerald-500/40
                             text-emerald-400 text-lg leading-none">
              {i + 1}
            </span>
            <p className="text-3xl text-slate-100 leading-snug">{p}</p>
          </div>
        ))}
      </div>

      {caption && (
        <p className="mt-14 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}