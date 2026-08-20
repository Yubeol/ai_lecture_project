import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Plus, Pencil, Trash2, Search, Loader2, Check, BookOpen,
} from 'lucide-react'
import { listLectures, deleteLecture } from '../api/lectures'

export default function LectureManager({
  currentId, onPick, onEdit, onNew, onBack,
}) {
  const [items, setItems] = useState(null)
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(null)   // 삭제 확인 중인 id
  const [error, setError] = useState(null)

  async function reload() {
    try {
      setItems(await listLectures())
    } catch (e) {
      setError(`불러오기 실패: ${e.message}`)
      setItems([])
    }
  }

  useEffect(() => { reload() }, [])

  async function remove(id) {
    try {
      await deleteLecture(id)
      setConfirming(null)
      reload()
    } catch (e) {
      setError(`삭제 실패: ${e.message}`)
    }
  }

  // 주제별로 묶는다. 주제가 없으면 '미분류'.
  const groups = useMemo(() => {
    if (!items) return []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            (l.topic ?? '').toLowerCase().includes(q)
        )
      : items

    const map = new Map()
    for (const l of filtered) {
      const key = l.topic || '미분류'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(l)
    }
    return [...map.entries()]
  }, [items, query])

  return (
    <div className="min-h-screen px-8 py-14">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-8 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={15} /> 돌아가기
        </button>

        <div className="flex items-end justify-between mb-9">
          <div>
            <p className="text-sm tracking-[0.2em] text-emerald-400 mb-3">LECTURES</p>
            <h1 className="text-4xl font-bold text-white tracking-tight">강의 관리</h1>
          </div>

          <button
            onClick={onNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg
                       bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <Plus size={17} /> 새 강의
          </button>
        </div>

        <div className="relative mb-8">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목이나 주제로 검색"
            className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 text-slate-100
                       border border-slate-800 outline-none focus:border-slate-600"
          />
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-rose-900/60
                          bg-rose-950/20 text-sm text-rose-300">
            {error}
          </div>
        )}

        {items === null ? (
          <div className="flex items-center gap-2 text-slate-600 py-10">
            <Loader2 size={16} className="animate-spin" /> 불러오는 중
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <BookOpen size={34} className="text-slate-700 mb-4" strokeWidth={1.5} />
            <p className="text-slate-500 mb-1">
              {query ? '검색 결과가 없습니다' : '저장된 강의가 없습니다'}
            </p>
            {!query && (
              <p className="text-sm text-slate-600">
                새 강의를 만들어 대본을 등록하세요
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map(([topic, list]) => (
              <div key={topic}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-slate-400">{topic}</span>
                  <span className="text-sm text-slate-700 tnum">{list.length}</span>
                  <div className="flex-1 h-px bg-slate-800/70" />
                </div>

                <div className="space-y-2">
                  {list.map((l) => (
                    <div
                      key={l.id}
                      className={`group flex items-center gap-4 px-5 py-4 rounded-xl
                                  border transition-colors ${
                        currentId === l.id
                          ? 'border-emerald-500/50 bg-emerald-950/25'
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => onPick(l.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg text-slate-100">{l.title}</span>
                          {currentId === l.id && (
                            <span className="flex items-center gap-1 text-xs
                                             text-emerald-400">
                              <Check size={12} /> 선택됨
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 tnum">
                          발화 {l.count}개
                          <span className="text-slate-700 mx-2">·</span>
                          {new Date(l.updated_at).toLocaleDateString('ko-KR')}
                        </div>
                      </button>

                      {confirming === l.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-rose-400">삭제할까요?</span>
                          <button
                            onClick={() => remove(l.id)}
                            className="px-3 py-1.5 rounded text-sm bg-rose-600
                                       hover:bg-rose-500 text-white"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setConfirming(null)}
                            className="px-3 py-1.5 rounded text-sm text-slate-400
                                       hover:text-slate-200"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100
                                        transition-opacity">
                          <button
                            onClick={() => onEdit(l.id)}
                            title="편집"
                            className="p-2 text-slate-600 hover:text-slate-300"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirming(l.id)}
                            title="삭제"
                            className="p-2 text-slate-600 hover:text-rose-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}