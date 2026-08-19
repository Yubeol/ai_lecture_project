import { useCallback, useEffect, useState } from 'react'
import Intro from './components/Intro'
import Stage from './components/Stage'
import { generate, prefetchNext, prefetchFirst } from './api/prefetch'
import useSpeech from './hooks/useSpeech'
import scenarioOrder from './fixtures/scenarioOrder.json'

const PRESETS = scenarioOrder

export default function App() {
  const [started, setStarted] = useState(false)
  const [payload, setPayload] = useState(null)
  const [history, setHistory] = useState([])
  const [cursor, setCursor] = useState(-1)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)

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

  // 시작 시 첫 발화를 미리 만들고, 마이크가 있으면 인식을 켠다
  const handleStart = useCallback(() => {
    setStarted(true)
    prefetchFirst()
    if (supported) start()
  }, [supported, start])

  // 방향키 수동 조작. 자동 생성이 실패해도 강의는 계속되어야 한다.
  useEffect(() => {
    if (!started) return
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
  }, [started, cursor, history])

  // 조작 패널은 평소 숨긴다. 강의 화면에 개발용 UI가 계속 보이면 몰입이 깨진다.
  useEffect(() => {
    if (!started) return
    let timer

    function show() {
      setPanelOpen(true)
      clearTimeout(timer)
      timer = setTimeout(() => setPanelOpen(false), 3000)
    }

    function onMove(e) {
      // 화면 아래쪽 20%에 마우스가 들어오면 표시
      if (e.clientY > window.innerHeight * 0.8) show()
    }

    show()  // 시작 직후엔 한 번 보여준다
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', show)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', show)
    }
  }, [started])

  // 훅은 전부 위에서 선언한다. 조건부 return 아래에 훅이 오면 렌더마다
  // 훅 개수가 달라져서 React가 에러를 낸다.
  if (!started) {
    return <Intro onStart={handleStart} micReady={supported} />
  }

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
      <div
        className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 p-4
                    transition-all duration-300 ${
                      panelOpen
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-full pointer-events-none'
                    }`}
      >
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