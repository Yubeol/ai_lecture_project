import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'

export default function Pipeline({ title, caption, steps = [] }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
    const timers = steps.map((_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 400 + i * 550)
    )
    return () => timers.forEach(clearTimeout)
  }, [steps])

  return (
    <div className="w-full max-w-6xl mx-auto px-12 py-10">
      <h2 className="text-5xl font-bold mb-14 text-white tracking-tight">{title}</h2>

      <div className="flex items-stretch justify-center gap-2">
        {steps.map((s, i) => {
          const on = i < shown
          const last = i === steps.length - 1
          return (
            <div key={s.label} className="flex items-stretch">
              <div
                className={`flex flex-col justify-center min-w-[170px] px-6 py-7
                            rounded-xl border transition-all duration-500 ${
                              on
                                ? 'border-emerald-500/50 bg-emerald-950/25'
                                : 'border-slate-800 bg-slate-900/30'
                            }`}
                style={{
                  opacity: on ? 1 : 0.3,
                  transform: on ? 'translateY(0)' : 'translateY(10px)',
                  boxShadow: on ? '0 0 26px rgba(52,211,153,0.12)' : 'none',
                }}
              >
                <div className={`text-sm mb-2 tnum ${
                  on ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className={`text-2xl leading-snug ${
                  on ? 'text-slate-100' : 'text-slate-500'
                }`}>
                  {s.label}
                </div>
                {s.detail && (
                  <div className="text-base text-slate-500 mt-2 leading-snug break-keep">
                    {s.detail}
                  </div>
                )}
              </div>

              {!last && (
                <div className="flex items-center px-1">
                  <ChevronRight
                    size={26}
                    className="transition-colors duration-500"
                    style={{ color: i + 1 < shown ? '#34d399' : '#334155' }}
                  />
                </div>
              )}
            </div>
          )
        })}
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