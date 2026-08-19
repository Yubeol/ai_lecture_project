import { useCallback, useEffect, useState } from 'react'
import { Mic, MicOff, Loader2, Send, Users } from 'lucide-react'
import Intro from './components/Intro'
import ScriptEditor from './components/ScriptEditor'
import Header from './components/Header'
import Stage from './components/Stage'
import {
  generate, prefetchNext, prefetchFirst, matchScript, setScriptOrder,
  scatterInit, scatterAdd,
} from './api/prefetch'
import useSpeech from './hooks/useSpeech'
import { DEFAULT_SCRIPT } from './lib/script'

// 청중 참여 구간에 미리 깔아둘 문장. 주제를 3가지로 나눠 축을 넓게 잡는다.
const LIVE_SEED = [
  '강아지가 마당에서 뛰어논다',
  '고양이가 창가에서 낮잠을 잔다',
  '김치찌개를 뚝배기에 끓였다',
  '된장국에 두부를 넣었다',
  '지하철이 역에 들어오고 있다',
  '버스가 정류장에 도착했다',
]

export default function App() {
  const [view, setView] = useState('intro')   // intro | editor | lecture
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [mode, setMode] = useState('script')
  const [payload, setPayload] = useState(null)
  const [history, setHistory] = useState([])
  const [cursor, setCursor] = useState(-1)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [matchInfo, setMatchInfo] = useState(null)
  const [liveMode, setLiveMode] = useState(false)

  const started = view === 'lecture'

  // 청중이 말한 문장을 기존 축에 투영해 점으로 추가한다.
  const addPoint = useCallback(async (sentence) => {
    if (!sentence?.trim()) return
    setLoading(true)
    try {
      const point = await scatterAdd('live', sentence.trim())
      setPayload((p) => ({ ...p, data: [...p.data, point] }))
      setLog(`추가됨 · 가장 가까운 문장과 ${point.nearest_score}`)
    } catch (e) {
      setLog(`error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const send = useCallback(async (utterance, opts = {}) => {
    if (!utterance?.trim()) return

    // 청중 참여 중이면 발화를 점으로 추가한다
    if (liveMode && !opts.exact) {
      await addPoint(utterance)
      return
    }

    setLoading(true)
    setLog(null)

    let target = utterance

    // 대본 모드: 발화를 대본 문장으로 정규화한다.
    // STT가 조사·어미를 흘려도 정확한 대본으로 바꿔 보내므로 선행 생성이 항상 적중한다.
    if (mode === 'script' && !opts.exact) {
      const m = await matchScript(utterance, script.utterances)
      setMatchInfo(m)
      if (m && m.matched) {
        target = script.utterances[m.index]
      } else {
        setLog(`대본에 없는 발화 (최고 ${m ? m.score : '?'})`)
        setLoading(false)
        return
      }
    } else {
      setMatchInfo(null)
    }

    try {
      const res = await generate(target)

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
      prefetchNext(target)
    } catch (e) {
      setLog(`error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [mode, script, liveMode, addPoint])

  // 청중 참여 구간 시작. PCA 축을 서버에 고정하고 Live 산점도로 전환한다.
  const startLive = useCallback(async () => {
    setLoading(true)
    try {
      const data = await scatterInit('live', LIVE_SEED)
      setPayload({
        component: 'Scatter2DLive',
        title: '여러분의 문장은 어디에 놓일까요',
        caption: '문장을 말하면 이 평면 위에 점이 찍힙니다',
        data,
      })
      setLiveMode(true)
      setLog('청중 참여 모드 · 문장을 입력하면 점이 추가됩니다')
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

  // 인트로에서 고른 모드로 시작한다
  const handleStart = useCallback((selectedMode) => {
    setMode(selectedMode)
    setView('lecture')
    setScriptOrder(script.utterances)
    if (selectedMode === 'script') prefetchFirst()
    if (supported) start()
  }, [supported, start, script])

  // 처음 화면으로. 리허설을 여러 번 돌릴 때 새로고침 없이 되돌린다.
  const handleReset = useCallback(() => {
    stop()
    setView('intro')
    setPayload(null)
    setHistory([])
    setCursor(-1)
    setText('')
    setLog(null)
    setMatchInfo(null)
    setLiveMode(false)
  }, [stop])

  // 방향키 수동 조작. 자동 생성이 실패해도 강의는 계속되어야 한다.
  useEffect(() => {
    if (!started) return
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'Escape') handleReset()
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
  }, [started, cursor, history, handleReset])

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
  if (view === 'editor') {
    return (
      <ScriptEditor
        script={script}
        onSave={(s) => { setScript(s); setView('intro') }}
        onCancel={() => setView('intro')}
      />
    )
  }

  if (view === 'intro') {
    return (
      <Intro
        onStart={handleStart}
        onEditScript={() => setView('editor')}
        script={script}
        micReady={supported}
      />
    )
  }

  return (
    <div className="relative min-h-screen">
      <Header
        payload={payload}
        step={cursor + 1}
        total={history.length}
        listening={listening}
        onReset={handleReset}
        mode={mode}
        matchInfo={matchInfo}
        title={script.title}
      />

      <Stage payload={payload} />

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-2xl">생성 중...</p>
          </div>
        </div>
      )}

      {/* 실시간 자막 */}
      {listening && interim && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 px-6 py-3
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
              {listening ? (
                <span className="flex items-center gap-2">
                  <MicOff size={17} /> 중지
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mic size={17} /> 시작
                </span>
              )}
            </button>

            <button
              onClick={liveMode ? () => setLiveMode(false) : startLive}
              className={`px-4 py-2 rounded font-medium ${
                liveMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users size={17} /> {liveMode ? '참여 종료' : '청중 참여'}
              </span>
            </button>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { send(text); setText('') }
              }}
              placeholder={
                liveMode
                  ? '문장을 입력하면 점이 추가됩니다'
                  : mode === 'script'
                    ? '대본 문장을 말하듯 입력하세요'
                    : '아무 발화나 입력하세요'
              }
              className="flex-1 px-4 py-2 rounded bg-slate-800 text-slate-100
                         border border-slate-700 outline-none focus:border-slate-500"
            />
            <button
              onClick={() => { send(text); setText('') }}
              disabled={loading}
              className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500
                         disabled:opacity-40 text-white font-medium"
            >
              <span className="flex items-center gap-2">
                <Send size={16} /> {liveMode ? '추가' : '생성'}
              </span>
            </button>
          </div>

          {mode === 'script' && !liveMode && (
            <div className="flex flex-wrap gap-2">
              {script.utterances.map((p, i) => (
                <button
                  key={`${i}-${p}`}
                  onClick={() => send(p, { exact: true })}
                  disabled={loading}
                  className="px-3 py-1 text-sm rounded bg-slate-800 hover:bg-slate-700
                             text-slate-300 disabled:opacity-40"
                >
                  <span className="text-slate-500 mr-1">{i + 1}</span>
                  {p.slice(0, 20)}...
                </button>
              ))}
            </div>
          )}

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