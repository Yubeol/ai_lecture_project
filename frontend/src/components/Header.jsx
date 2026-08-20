import { Mic, RotateCcw } from 'lucide-react'

const LABELS = {
  SimilarityGauge: '유사도 비교',
  VectorBars: '벡터 표현',
  Scatter2D: '의미 공간',
  KeyPoints: '개념 정리',
    Scatter2DLive: '청중 참여',
    CosineAngle: '각도로 보기',
    Pipeline: '처리 과정',
    Compare: '비교',
}

export default function Header({
  payload, step, total, listening, onReset, mode, matchInfo, title,
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-10 px-8 py-4
                    flex items-center justify-between
                    text-sm text-slate-500">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-slate-400">{title}</span>
        {payload && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">
              {LABELS[payload.component] ?? payload.component}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-5">
        {matchInfo && (
          <span className="tnum">
            매칭{' '}
            <span className={matchInfo.matched ? 'text-emerald-400' : 'text-rose-400'}>
              {matchInfo.score.toFixed(3)}
            </span>
          </span>
        )}

        <span className="text-slate-600">
          {mode === 'script' ? '대본' : '자유'}
        </span>

        {listening && (
          <span className="flex items-center gap-2 text-rose-400">
            <Mic size={14} className="animate-pulse" />
            듣는 중
          </span>
        )}

        {total > 0 && (
          <span className="tnum text-slate-500">
            {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        )}

        <button
          onClick={onReset}
          title="처음으로 (Esc)"
          className="text-slate-600 hover:text-slate-300 transition-colors"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  )
}