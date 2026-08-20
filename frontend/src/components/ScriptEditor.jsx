import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Upload, Download,
  AlertTriangle, Check, X, Loader2, StickyNote,
} from 'lucide-react'
import { parseScript, downloadScript } from '../lib/script'
import { checkAmbiguity } from '../api/prefetch'
import { createLecture, updateLecture } from '../api/lectures'

/** 대본 배열을 {text, note} 형태로 정규화한다. 문자열 배열도 받는다. */
function normalize(utterances) {
  return utterances.map((u) =>
    typeof u === 'string' ? { text: u, note: '' } : { text: u.text, note: u.note ?? '' }
  )
}

export default function ScriptEditor({ script, lectureId, onSaved, onCancel }) {
  const [title, setTitle] = useState(script.title)
  const [topic, setTopic] = useState(script.topic ?? '')
  const [lines, setLines] = useState(() => normalize(script.utterances))
  const [openNotes, setOpenNotes] = useState(() => new Set())
  const [warnings, setWarnings] = useState([])
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  // 대본이 바뀌면 헷갈리는 줄이 있는지 검사한다.
  // 두 줄이 지나치게 비슷하면 음성 매칭이 엉뚱한 곳으로 간다.
  useEffect(() => {
    const valid = lines.map((l) => l.text.trim()).filter(Boolean)
    if (valid.length < 2) { setWarnings([]); return }

    setChecking(true)
    const t = setTimeout(async () => {
      const res = await checkAmbiguity(valid)
      setWarnings(res?.pairs ?? [])
      setChecking(false)
    }, 700)
    return () => { clearTimeout(t); setChecking(false) }
  }, [lines])

  function update(i, field, value) {
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, [field]: value } : l)))
  }

  function add(at) {
    setLines((ls) => [...ls.slice(0, at + 1), { text: '', note: '' }, ...ls.slice(at + 1)])
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

  function toggleNote(i) {
    setOpenNotes((s) => {
      const next = new Set(s)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseScript(text)
    if (parsed.title) setTitle(parsed.title)
    if (parsed.utterances.length) setLines(normalize(parsed.utterances))
    e.target.value = ''   // 같은 파일을 다시 골라도 이벤트가 오도록
  }

  async function save() {
    const cleaned = lines
      .map((l) => ({ text: l.text.trim(), note: l.note?.trim() || null }))
      .filter((l) => l.text)
    if (!cleaned.length) return

    const payload = {
      title: title.trim() || '제목 없는 강의',
      topic: topic.trim() || null,
      utterances: cleaned,
    }

    setSaving(true)
    setError(null)
    try {
      // 기존 강의를 편집 중이면 갱신, 아니면 새로 만든다
      const saved = lectureId
        ? await updateLecture(lectureId, payload)
        : await createLecture(payload)
      onSaved(saved)
    } catch (e) {
      setError(`저장 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const warnIdx = new Set(warnings.flatMap((w) => [w.i, w.j]))
  const noteCount = lines.filter((l) => l.note?.trim()).length

  return (
    <div className="min-h-screen px-8 py-14">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm tracking-[0.2em] text-emerald-400 mb-3">SCRIPT</p>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {lectureId ? '대본 편집' : '새 강의'}
            </h1>
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
              onClick={() =>
                downloadScript(title, lines.map((l) => l.text).filter(Boolean))
              }
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

        <div className="flex gap-3 mb-7">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="강의 제목"
            className="flex-1 px-4 py-3 rounded-lg bg-slate-900/50 text-xl text-slate-100
                       border border-slate-800 outline-none focus:border-slate-600"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="주제 (임베딩, 머신러닝 …)"
            className="w-56 px-4 py-3 rounded-lg bg-slate-900/50 text-slate-300
                       border border-slate-800 outline-none focus:border-slate-600"
          />
        </div>

        <div className="space-y-2 mb-6">
          {lines.map((line, i) => {
            const noteOpen = openNotes.has(i) || !!line.note
            return (
              <div key={i}>
                <div className="group flex items-center gap-2">
                  <span className={`w-7 text-right text-sm tnum shrink-0 ${
                    warnIdx.has(i) ? 'text-amber-400' : 'text-slate-600'
                  }`}>
                    {i + 1}
                  </span>

                  <input
                    value={line.text}
                    onChange={(e) => update(i, 'text', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); add(i) }
                      if (e.key === 'Backspace' && !line.text && lines.length > 1) {
                        e.preventDefault(); remove(i)
                      }
                    }}
                    placeholder="발화를 입력하세요"
                    className={`flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 text-slate-100
                                border outline-none focus:border-slate-600 ${
                                  warnIdx.has(i) ? 'border-amber-800/70' : 'border-slate-800'
                                }`}
                  />

                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleNote(i)}
                      title="발표자 노트"
                      className={`p-1.5 transition-colors ${
                        line.note?.trim()
                          ? 'text-emerald-500'
                          : 'text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <StickyNote size={15} />
                    </button>

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
                </div>

                {/* 발표자 노트. 화면에는 안 뜨고 강사에게만 보인다. */}
                {noteOpen && (
                  <div className="flex gap-2 mt-1.5 ml-9">
                    <textarea
                      value={line.note}
                      onChange={(e) => update(i, 'note', e.target.value)}
                      placeholder="이 화면에서 할 말 (청중에게는 보이지 않습니다)"
                      rows={2}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/30
                                 text-slate-400 text-sm leading-relaxed resize-none
                                 border border-slate-800/70 outline-none focus:border-slate-700"
                    />
                  </div>
                )}
              </div>
            )
          })}
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
            disabled={saving}
            className="flex items-center gap-2 px-7 py-3 rounded-lg bg-emerald-600
                       hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> 저장 중</>
              : <><Check size={18} /> 저장</>}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-3 rounded-lg
                       text-slate-400 hover:text-slate-200"
          >
            <X size={18} /> 취소
          </button>

          {error && <span className="text-sm text-rose-400">{error}</span>}

          <span className="ml-auto text-sm text-slate-600">
            {checking
              ? '검사 중...'
              : `발화 ${lines.filter((l) => l.text.trim()).length}개 · 노트 ${noteCount}개`}
          </span>
        </div>
      </div>
    </div>
  )
}