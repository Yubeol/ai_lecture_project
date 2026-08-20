import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Activity, AlertTriangle } from 'lucide-react'
import { getLogs } from '../api/lectures'

const SOURCE_LABEL = {
  prefetch: '선행 생성',
  realtime: '실시간',
  cache: '캐시 폴백',
  skip: '건너뜀',
  unmatched: '매칭 실패',
}

const SOURCE_COLOR = {
  prefetch: 'text-emerald-400',
  realtime: 'text-sky-400',
  cache: 'text-amber-400',
  skip: 'text-slate-500',
  unmatched: 'text-rose-400',
}

export default function LogReview({ lectureId, title, onBack }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getLogs(lectureId)
      .then(setRows)
      .catch((e) => { setError(e.message); setRows([]) })
  }, [lectureId])

  // 매칭 점수와 지연의 분포를 요약한다. 어디를 고쳐야 할지 보인다.
  const stats = useMemo(() => {
    if (!rows?.length) return null

    const scored = rows.filter((r) => r.match_score != null)
    const timed = rows.filter((r) => r.llm_ms != null && r.llm_ms > 0)
    const weak = scored.filter((r) => r.match_score < 0.8)

    const bySource = {}
    for (const r of rows) {
      const k = r.source ?? 'unknown'
      bySource[k] = (bySource[k] ?? 0) + 1
    }

    return {
      total: rows.length,
      avgScore: scored.length
        ? scored.reduce((s, r) => s + r.match_score, 0) / scored.length
        : null,
      minScore: scored.length ? Math.min(...scored.map((r) => r.match_score)) : null,
      avgLlm: timed.length
        ? timed.reduce((s, r) => s + r.llm_ms, 0) / timed.length
        : null,
      weak,
      bySource,
    }
  }, [rows])

  return (
    <div className="min-h-screen px-8 py-14">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-8 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={15} /> 돌아가기
        </button>

        <p className="text-sm tracking-[0.2em] text-emerald-400 mb-3">SESSION LOG</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">강의 기록</h1>
        <p className="text-slate-500 mb-10">{title}</p>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-rose-900/60
                          bg-rose-950/20 text-sm text-rose-300">
            불러오기 실패: {error}
          </div>
        )}

        {rows === null ? (
          <div className="flex items-center gap-2 text-slate-600 py-10">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Activity size={34} className="text-slate-700 mb-4" strokeWidth={1.5} />
            <p className="text-slate-500 mb-1">아직 기록이 없습니다</p>
            <p className="text-sm text-slate-600">
              강의를 한 번 진행하면 발화별 처리 결과가 쌓입니다
            </p>
          </div>
        ) : (
          <>
            {/* 요약 */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                ['발화', stats.total, ''],
                ['평균 매칭', stats.avgScore?.toFixed(3) ?? '—', ''],
                ['최저 매칭', stats.minScore?.toFixed(3) ?? '—',
                 stats.minScore != null && stats.minScore < 0.75 ? 'text-amber-400' : ''],
                ['평균 LLM', stats.avgLlm ? `${(stats.avgLlm / 1000).toFixed(1)}s` : '—', ''],
              ].map(([label, value, color]) => (
                <div key={label}
                     className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4">
                  <div className="text-sm text-slate-500 mb-1.5">{label}</div>
                  <div className={`text-2xl tnum ${color || 'text-slate-100'}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* 소스 분포 */}
            <div className="flex flex-wrap gap-2 mb-8">
              {Object.entries(stats.bySource).map(([k, n]) => (
                <span key={k}
                      className="px-3 py-1.5 rounded-lg text-sm bg-slate-900/50
                                 border border-slate-800">
                  <span className={SOURCE_COLOR[k] ?? 'text-slate-400'}>
                    {SOURCE_LABEL[k] ?? k}
                  </span>
                  <span className="text-slate-600 ml-2 tnum">{n}</span>
                </span>
              ))}
            </div>

            {/* 매칭이 약했던 발화 */}
            {stats.weak.length > 0 && (
              <div className="mb-8 rounded-xl border border-amber-900/50
                              bg-amber-950/15 px-5 py-4">
                <div className="flex items-center gap-2 text-amber-400 mb-3">
                  <AlertTriangle size={16} />
                  <span className="text-sm">매칭이 약했던 발화</span>
                </div>
                <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                  0.8 미만은 STT 인식이 흔들렸거나 대본 표현이 애매하다는 뜻입니다.
                  해당 대본 문장을 더 특징적으로 바꾸면 안정됩니다.
                </p>
                {stats.weak.slice(0, 5).map((r, i) => (
                  <div key={i} className="text-sm text-slate-400 mb-1.5">
                    <span className="tnum text-amber-400">
                      {r.match_score.toFixed(3)}
                    </span>
                    <span className="text-slate-700 mx-2">·</span>
                    {r.heard}
                  </div>
                ))}
              </div>
            )}

            {/* 전체 목록 */}
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i}
                     className="flex items-center gap-4 px-5 py-3.5 rounded-xl
                                border border-slate-800 bg-slate-900/25">
                  <span className="w-8 text-sm text-slate-600 tnum shrink-0">
                    {r.matched_seq != null ? r.matched_seq + 1 : '—'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 truncate">{r.heard}</div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {r.component ?? '—'}
                      <span className="text-slate-800 mx-2">·</span>
                      {new Date(r.created_at).toLocaleTimeString('ko-KR')}
                    </div>
                  </div>

                  {r.match_score != null && (
                    <span className={`text-sm tnum shrink-0 ${
                      r.match_score >= 0.8 ? 'text-emerald-400'
                      : r.match_score >= 0.65 ? 'text-amber-400'
                      : 'text-rose-400'
                    }`}>
                      {r.match_score.toFixed(3)}
                    </span>
                  )}

                  <span className={`text-sm shrink-0 w-20 text-right ${
                    SOURCE_COLOR[r.source] ?? 'text-slate-600'
                  }`}>
                    {SOURCE_LABEL[r.source] ?? r.source ?? '—'}
                  </span>

                  <span className="text-sm text-slate-600 tnum shrink-0 w-14 text-right">
                    {r.llm_ms ? `${(r.llm_ms / 1000).toFixed(1)}s` : '0s'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}