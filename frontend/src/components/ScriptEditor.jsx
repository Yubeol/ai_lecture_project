import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Upload, Download,
  AlertTriangle, Check, X,
} from 'lucide-react'
import { parseScript, downloadScript } from '../lib/script'
import { checkAmbiguity } from '../api/prefetch'

export default function ScriptEditor({ script, onSave, onCancel }) {
  const [title, setTitle] = useState(script.title)
  const [lines, setLines] = useState(script.utterances)
  const [warnings, setWarnings] = useState([])
  const [checking, setChecking] = useState(false)
  const fileRef = useRef(null)

  // 대본이 바뀌면 헷갈리는 줄이 있는지 검사한다.
  // 두 줄이 지나치게 비슷하면 음성 매칭이 엉뚱한 곳으로 간다.
  useEffect(() => {
    const valid = lines.map((l) => l.trim()).filter(Boolean)
    if (valid.length < 2) { setWarnings([]); return }

    setChecking(true)
    const t = setTimeout(async () => {
      const res = await checkAmbiguity(valid)
      setWarnings(res?.pairs ?? [])
      setChecking(false)
    }, 700)
    return () => { clearTimeout(t); setChecking(false) }
  }, [lines])

  function update(i, value) {
    setLines((ls) => ls.map((l, k) => (k === i ? value : l)))
  }

  function add(at) {
    setLines((ls) => [...ls.slice(0, at + 1), '', ...ls.slice(at + 1)])
  }

  function remove(i) {
    setLines((ls) => ls.filter((_, k) => k !== i))
  }

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= lines.length) return
    setLines((ls) => {
      const next = [...ls]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseScript(text)
    if (parsed.title) setTitle(parsed.title)
    if (parsed.utterances.length) setLines(parsed.utterances)
    e.target.value = ''   // 같은 파일을 다시 골라도 이벤트가 오도록
  }

  function save() {
    const cleaned = lines.map((l) => l.trim()).filter(Boolean)
    if (!cleaned.length) return
    onSave({ title: title.trim() || '제목 없는 강의', utterances: cleaned })
  }

  const warnIdx = new Set(warnings.flatMap((w) => [w.i, w.j]))

  return (
    <div className="min-h-screen px-8 py-14">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm tracking-[0.2em] text-emerald-400 mb-3">SCRIPT</p>
            <h1 className="text-4xl font-bold text-white tracking-tight">대본 편집</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                         border border-slate-800 text-slate-300 hover:border-slate-600"
            >
              <Upload size={15} /> 불러오기
            </button>
            <button
              onClick={() => downloadScript(title, lines.filter((l) => l.trim()))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                         border border-slate-800 text-slate-300 hover:border-slate-600"
            >
              <Download size={15} /> 내보내기
            </button>
            <input
              ref={fileRef} type="file" accept=".txt,.md"
              onChange={onFile} className="hidden"
            />
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="강의 제목"
          className="w-full mb-7 px-4 py-3 rounded-lg bg-slate-900/50 text-xl text-slate-100
                     border border-slate-800 outline-none focus:border-slate-600"
        />

        <div className="space-y-2 mb-6">
          {lines.map((line, i) => (
            <div key={i} className="group flex items-center gap-2">
              <span className={`w-7 text-right text-sm tnum shrink-0 ${
                warnIdx.has(i) ? 'text-amber-400' : 'text-slate-600'
              }`}>
                {i + 1}
              </span>

              <input
                value={line}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); add(i) }
                  if (e.key === 'Backspace' && !line && lines.length > 1) {
                    e.preventDefault(); remove(i)
                  }
                }}
                placeholder="발화를 입력하세요"
                className={`flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 text-slate-100
                            border outline-none focus:border-slate-600 ${
                              warnIdx.has(i) ? 'border-amber-800/70' : 'border-slate-800'
                            }`}
              />

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                        className="p-1.5 text-slate-600 hover:text-slate-300 disabled:opacity-25">
                  <ArrowUp size={15} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === lines.length - 1}
                        className="p-1.5 text-slate-600 hover:text-slate-300 disabled:opacity-25">
                  <ArrowDown size={15} />
                </button>
                <button onClick={() => remove(i)} disabled={lines.length === 1}
                        className="p-1.5 text-slate-600 hover:text-rose-400 disabled:opacity-25">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => add(lines.length - 1)}
          className="flex items-center gap-2 mb-8 ml-9 text-sm text-slate-500 hover:text-slate-300"
        >
          <Plus size={15} /> 발화 추가
        </button>

        {/* 매칭이 헷갈릴 만한 줄 경고 */}
        {warnings.length > 0 && (
          <div className="mb-8 rounded-lg border border-amber-900/60 bg-amber-950/20 px-5 py-4">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <AlertTriangle size={16} />
              <span className="text-sm">서로 너무 비슷한 발화가 있습니다</span>
            </div>
            <p className="text-sm text-slate-500 mb-3 leading-relaxed">
              음성 매칭이 두 줄을 구분하지 못할 수 있습니다.
              표현을 더 다르게 바꾸는 것이 좋습니다.
            </p>
            {warnings.slice(0, 4).map((w) => (
              <div key={`${w.i}-${w.j}`} className="text-sm text-slate-400 mb-1.5">
                <span className="tnum text-amber-400">{w.score.toFixed(3)}</span>
                <span className="text-slate-600 mx-2">·</span>
                {w.i + 1}번 ↔ {w.j + 1}번
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="flex items-center gap-2 px-7 py-3 rounded-lg bg-emerald-600
                       hover:bg-emerald-500 text-white font-medium"
          >
            <Check size={18} /> 저장
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-3 rounded-lg
                       text-slate-400 hover:text-slate-200"
          >
            <X size={18} /> 취소
          </button>

          <span className="ml-auto text-sm text-slate-600">
            {checking
              ? '검사 중...'
              : `${lines.filter((l) => l.trim()).length}개 발화`}
          </span>
        </div>
      </div>
    </div>
  )
}