import { useEffect, useState } from 'react'

/** 값에 따라 색을 정한다. 양수는 초록, 음수는 장미색. */
function tone(v) {
  if (v > 0.0005) return 'text-emerald-400'
  if (v < -0.0005) return 'text-rose-400'
  return 'text-slate-500'
}

function Cell({ value, delay, shown, big, digits = 3 }) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900/40
                  flex items-center justify-center tnum
                  ${big ? 'h-14 text-lg' : 'h-11 text-base'} ${tone(value)}`}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`,
      }}
    >
      {value.toFixed(digits)}
    </div>
  )
}

export default function ComputeFlow({ title, caption, data }) {
  const [step, setStep] = useState(0)

  // 0: 벡터 A → 1: 벡터 B → 2: 곱셈 → 3: 합계
  useEffect(() => {
    setStep(0)
    const timers = [1, 2, 3].map((s) =>
      setTimeout(() => setStep((n) => Math.max(n, s)), 500 + (s - 1) * 900)
    )
    return () => timers.forEach(clearTimeout)
  }, [data])

  if (!data) return null

  const {
    a, b, va, vb, products, shown_sum, rest_sum, score,
    dims, total_dims, indices = [],
  } = data
  const cols = `repeat(${dims}, minmax(0, 1fr))`

  return (
    <div className="w-full max-w-5xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-8">
        <span className="tnum text-slate-400">{total_dims}</span>개 차원 중
        기여가 큰 <span className="tnum text-slate-400">{dims}</span>개 ·
        정규화된 벡터라 내적이 곧 코사인 유사도입니다
      </p>

      <div className="space-y-3">
        {/* 차원 번호 */}
        <div className="flex items-center gap-5 mb-1">
          <div className="w-64 shrink-0 text-right text-sm text-slate-600">
            기여도가 큰 차원
          </div>
          <div className="flex-1 grid gap-2 text-center text-sm text-slate-600 tnum"
               style={{ gridTemplateColumns: cols }}>
            {indices.map((d, i) => (
              <span key={i}>d{d}</span>
            ))}
          </div>
        </div>

        {/* 벡터 A */}
        <div className="flex items-center gap-5">
          <div className="w-64 shrink-0 text-right text-lg text-sky-300 leading-snug">
            {a}
          </div>
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: cols }}>
            {va.map((v, i) => (
              <Cell key={i} value={v} delay={i * 60} shown={step >= 0} />
            ))}
          </div>
        </div>

        {/* 곱셈 기호 */}
        <div className="flex items-center gap-5">
          <div className="w-64 shrink-0" />
          <div className="flex-1 grid gap-2 text-center text-slate-600"
               style={{ gridTemplateColumns: cols }}>
            {va.map((_, i) => (
              <span key={i}
                    style={{
                      opacity: step >= 1 ? 1 : 0,
                      transition: `opacity 300ms ease ${i * 60}ms`,
                    }}>
                ×
              </span>
            ))}
          </div>
        </div>

        {/* 벡터 B */}
        <div className="flex items-center gap-5">
          <div className="w-64 shrink-0 text-right text-lg text-emerald-300 leading-snug">
            {b}
          </div>
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: cols }}>
            {vb.map((v, i) => (
              <Cell key={i} value={v} delay={i * 60} shown={step >= 1} />
            ))}
          </div>
        </div>

        {/* 화살표 */}
        <div className="flex items-center gap-5 py-1">
          <div className="w-64 shrink-0" />
          <div className="flex-1 grid gap-2 text-center text-slate-600"
               style={{ gridTemplateColumns: cols }}>
            {va.map((_, i) => (
              <span key={i}
                    style={{
                      opacity: step >= 2 ? 1 : 0,
                      transition: `opacity 300ms ease ${i * 60}ms`,
                    }}>
                ↓
              </span>
            ))}
          </div>
        </div>

        {/* 곱셈 결과 */}
        <div className="flex items-center gap-5">
          <div className="w-64 shrink-0 text-right text-base text-slate-500">
            각 자리를 곱하면
          </div>
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: cols }}>
            {products.map((v, i) => (
              <Cell key={i} value={v} delay={i * 60} shown={step >= 2} big digits={4} />
            ))}
          </div>
        </div>
      </div>

      {/* 합계 */}
      <div
        className="mt-9 flex items-center gap-6"
        style={{
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div className="w-64 shrink-0 text-right">
          <div className="text-base text-slate-500">768개를 모두 더하면</div>
          <div className="text-sm text-slate-600 mt-1 tnum">
            위 {dims}개 {shown_sum >= 0 ? '+' : ''}{shown_sum.toFixed(3)}
            <span className="text-slate-700 mx-1.5">/</span>
            나머지 {rest_sum >= 0 ? '+' : ''}{rest_sum.toFixed(3)}
          </div>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-6xl font-bold tnum text-emerald-400">
            {score.toFixed(3)}
          </span>
          <span className="text-lg text-slate-500">코사인 유사도</span>
        </div>
      </div>

      {caption && (
        <p className="mt-8 text-xl text-slate-400 leading-relaxed
                      border-l-2 border-slate-700 pl-5">
          {caption}
        </p>
      )}
    </div>
  )
}