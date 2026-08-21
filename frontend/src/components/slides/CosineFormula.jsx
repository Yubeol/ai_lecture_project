import { useEffect, useState } from 'react'

/** 분수 한 덩어리. 분자와 분모를 가로선으로 나눈다. */
function Fraction({ top, bottom, size = 'text-3xl', color = 'text-slate-100' }) {
  return (
    <div className="inline-flex flex-col items-center">
      <div className={`${size} ${color} tnum px-4 pb-2`}>{top}</div>
      <div className="h-px w-full bg-slate-600" />
      <div className={`${size} ${color} tnum px-4 pt-2`}>{bottom}</div>
    </div>
  )
}

function Row({ children, shown, delay }) {
  return (
    <div
      className="flex items-center justify-center gap-6"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 500ms ease ${delay}ms,
                     transform 500ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function CosineFormula({ title, caption, data }) {
  const [step, setStep] = useState(0)

  // 0: 공식 → 1: 값 대입 → 2: 정리 → 3: 각도
  useEffect(() => {
    setStep(0)
    const timers = [1, 2, 3].map((s) =>
      setTimeout(() => setStep((n) => Math.max(n, s)), 600 + (s - 1) * 1000)
    )
    return () => timers.forEach(clearTimeout)
  }, [data])

  if (!data) return null

  const { a, b, dot, norm_a, norm_b, score, angle } = data

  return (
    <div className="w-full max-w-4xl mx-auto px-12 py-8">
      <h2 className="text-5xl font-bold mb-3 text-white tracking-tight">{title}</h2>
      <p className="text-lg text-slate-500 mb-10">
        두 문장의 벡터를 <span className="text-sky-300">A</span>,
        {' '}<span className="text-emerald-300">B</span> 라고 하면
      </p>

      {/* 문장 라벨 */}
      <div className="flex justify-center gap-10 mb-10 text-lg">
        <span className="text-sky-300">A · {a}</span>
        <span className="text-emerald-300">B · {b}</span>
      </div>

      <div className="space-y-8">
        {/* 공식 */}
        <Row shown={step >= 0} delay={0}>
          <span className="text-3xl text-slate-400">cos(θ) =</span>
          <Fraction top="A · B" bottom="‖A‖ × ‖B‖" color="text-slate-300" />
        </Row>

        {/* 값 대입 */}
        <Row shown={step >= 1} delay={0}>
          <span className="text-3xl text-slate-600">=</span>
          <Fraction
            top={dot.toFixed(4)}
            bottom={`${norm_a.toFixed(3)} × ${norm_b.toFixed(3)}`}
          />
        </Row>

        {/* 정리 — 분모가 1이라는 게 핵심 */}
        <Row shown={step >= 2} delay={0}>
          <span className="text-3xl text-slate-600">=</span>
          <Fraction top={dot.toFixed(4)} bottom="1.000" color="text-emerald-300" />
          <span className="text-3xl text-slate-600">=</span>
          <span className="text-6xl font-bold tnum text-emerald-400">
            {score.toFixed(3)}
          </span>
        </Row>
      </div>

      {/* 각도 */}
      <div
        className="mt-12 flex items-center justify-center gap-4 text-lg"
        style={{
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 600ms ease',
        }}
      >
        <span className="text-slate-500">
          모델이 벡터를 길이 1로 맞춰 내보내므로 분모가 1이 됩니다
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-400 tnum">각도 {angle.toFixed(1)}°</span>
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