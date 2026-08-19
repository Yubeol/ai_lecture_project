import { useEffect, useState } from 'react'

/** 점수 구간별 색상과 사람이 읽을 판정. 숫자만으론 감이 안 온다. */
function styleFor(score) {
  if (score >= 0.7) return {
    from: '#34d399', to: '#10b981', text: 'text-emerald-400',
    glow: 'rgba(52,211,153,0.55)', label: '거의 같은 뜻',
  }
  if (score >= 0.45) return {
    from: '#4ade80', to: '#22c55e', text: 'text-green-400',
    glow: 'rgba(74,222,128,0.5)', label: '비슷한 뜻',
  }
  if (score >= 0.25) return {
    from: '#fbbf24', to: '#f59e0b', text: 'text-amber-400',
    glow: 'rgba(251,191,36,0.5)', label: '조금 관련 있음',
  }
  return {
    from: '#fb7185', to: '#f43f5e', text: 'text-rose-400',
    glow: 'rgba(251,113,133,0.5)', label: '전혀 다름',
  }
}

/** 0에서 목표값까지 숫자를 세어 올린다. 게이지와 같이 움직여야 극적이다. */
function useCountUp(target, delay, duration = 1000) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    setValue(0)
    let raf
    const startAt = performance.now() + delay

    function tick(now) {
      const t = (now - startAt) / duration
      if (t < 0) { raf = requestAnimationFrame(tick); return }
      if (t >= 1) { setValue(target); return }
      // easeOutCubic — 빠르게 시작해 부드럽게 멈춘다
      setValue(target * (1 - Math.pow(1 - t, 3)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, delay, duration])

  return value
}

function GaugeRow({ item, delay }) {
  const [width, setWidth] = useState(0)
  const s = styleFor(item.score)
  const shown = useCountUp(item.score, delay)

  useEffect(() => {
    const t = setTimeout(() => setWidth(item.gauge * 100), delay)
    return () => clearTimeout(t)
  }, [item.gauge, delay])

  return (
    <div className="mb-11">
      <div className="flex items-end justify-between mb-3 gap-6">
        <div className="text-2xl leading-relaxed">
          <span className="text-slate-100">{item.a}</span>
          <span className="text-slate-600 mx-3">↔</span>
          <span className="text-slate-100">{item.b}</span>
        </div>

        <div className="shrink-0 text-right">
          <div className={`text-5xl font-bold tnum leading-none ${s.text}`}>
            {shown.toFixed(3)}
          </div>
          <div className={`text-sm mt-2 ${s.text} opacity-70`}>{s.label}</div>
        </div>
      </div>

      {/* 트랙 + 눈금 */}
      <div className="relative h-7 w-full rounded-full bg-slate-900/80
                      border border-slate-800 overflow-hidden">
        {[25, 50, 75].map((t) => (
          <div key={t}
               className="absolute top-0 h-full w-px bg-slate-700/60"
               style={{ left: `${t}%` }} />
        ))}
        <div
          className="relative h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${s.from}, ${s.to})`,
            boxShadow: `0 0 18px ${s.glow}, 0 0 4px ${s.glow}`,
          }}
        />
      </div>
    </div>
  )
}

export default function SimilarityGauge({ title, caption, data = [] }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-12 text-white tracking-tight">{title}</h2>

      {data.map((item, i) => (
        <GaugeRow key={`${item.a}|${item.b}`} item={item} delay={300 + i * 500} />
      ))}

      {caption && (
        <p className="mt-8 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}