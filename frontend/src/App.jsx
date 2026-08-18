import { useCallback, useEffect, useState } from 'react'
import Stage from './components/Stage'
import { generate, prefetchNext, prefetchFirst } from './api/prefetch'
import useSpeech from './hooks/useSpeech'
import scenarioOrder from './fixtures/scenarioOrder.json'

const PRESETS = scenarioOrder

export default function App() {
  const [payload, setPayload] = useState(null)
  const [history, setHistory] = useState([])   // 방향키 되돌리기용
  const [cursor, setCursor] = useState(-1)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState(null)

  // 앱이 뜨자마자 첫 발화를 미리 만들어 둔다
  useEffect(() => { prefetchFirst() }, [])

  const send = useCallback(async (utterance) => {
    if (!utterance?.trim()) return
    setLoading(true)
    setLog(null)
    try {
      const res = await generate(utterance)

      if (res.ok) {
        setPayload(res.payload)
        setHistory((h) => {
          const next = [...h, res.payload]
          setCursor(next.length - 1)
          return next
        })
        const name = res.payload.component
        setLog(
          res.prefetched ? `${name} · 선행 생성 (0.0s)`
          : res.cached   ? `${name} · cached (생성 실패 → 사전 생성분)`
          : `${name} · LLM ${res.timing.llm}s · embed ${res.timing.embed}s`
        )
      } else {
        setLog(`skip: ${res.reason}`)
      }

      // 화면을 띄운 직후 다음 발화를 백그라운드에서 준비한다.
      // 강사가 한 화면에서 말하는 동안 생성이 끝난다.
      prefetchNext(utterance)
    } catch (e) {
      setLog(`error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const { listening, interim, error, start, stop, supported } = useSpeech({
    onFinal: send,
    cooldownMs: 3000,
  })

  // 방향키 수동 조작. 자동 생성이 실패해도 강의는 계속되어야 한다.
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft' && cursor > 0) {
        const i = cursor - 1
        setCursor(i)
        setPayload(history[i])
      }
      if (e.key === 'ArrowRight' && cursor < history.length - 1) {
        const i = cursor + 1
        setCursor(i)
        setPayload(history[i])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, history])

  return (
    <div className="relative min-h-screen">
      <Stage payload={payload} />

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70">
          <p className="text-2xl text-slate-300 animate-pulse">생성 중...</p>
        </div>
      )}

      {/* 실시간 자막 */}
      {listening && interim && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3
                        rounded-full bg-slate-800/90 text-slate-300 text-lg">
          {interim}
        </div>
      )}

      {/* 조작 패널 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 mb-3">
            <button
              onClick={listening ? stop : start}
              disabled={!supported}
              className={`px-5 py-2 rounded font-medium disabled:opacity-40 ${
                listening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {listening ? '● 듣는 중' : '🎤 시작'}
            </button>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(text)}
              placeholder="발화를 입력하세요"
              className="flex-1 px-4 py-2 rounded bg-slate-800 text-slate-100
                         border border-slate-700 outline-none focus:border-slate-500"
            />
            <button
              onClick={() => send(text)}
              disabled={loading}
              className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500
                         disabled:opacity-40 text-white font-medium"
            >
              생성
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="px-3 py-1 text-sm rounded bg-slate-800 hover:bg-slate-700
                           text-slate-300 disabled:opacity-40"
              >
                <span className="text-slate-500 mr-1">{i + 1}</span>
                {p.slice(0, 20)}...
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-4 text-sm font-mono text-slate-500">
            {log && <span>{log}</span>}
            {error && <span className="text-rose-400">{error}</span>}
            {history.length > 0 && (
              <span className="ml-auto">← → {cursor + 1}/{history.length}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}