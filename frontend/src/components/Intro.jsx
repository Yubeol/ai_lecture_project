import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mic, Sparkles, Ruler, ArrowRight, ScrollText, Wand2, Pencil,
} from 'lucide-react'

const STACK = [
  { icon: Mic, label: '음성 인식', sub: 'Web Speech API', color: 'text-rose-400' },
  { icon: Sparkles, label: '자료 구성', sub: 'Claude API', color: 'text-amber-400' },
  { icon: Ruler, label: '수치 계산', sub: 'ko-sroberta', color: 'text-sky-400' },
]

const MODES = [
  {
    id: 'script',
    icon: ScrollText,
    title: '대본 모드',
    desc: '준비된 대본을 임베딩으로 매칭. 즉시 전환',
  },
  {
    id: 'free',
    icon: Wand2,
    title: '자유 모드',
    desc: '어떤 발화든 AI가 그 자리에서 구성',
  },
]

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function Intro({ onStart, onEditScript, script, micReady }) {
  const [mode, setMode] = useState('script')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-16">
      <div className="max-w-3xl w-full">
        <motion.p
          custom={0} variants={fade} initial="hidden" animate="show"
          className="text-sm tracking-[0.25em] text-emerald-400 mb-5"
        >
          VOICE-DRIVEN LECTURE
        </motion.p>

        <motion.h1
          custom={1} variants={fade} initial="hidden" animate="show"
          className="text-6xl font-bold leading-[1.15] mb-7 text-white tracking-tight"
        >
          말하면,<br />
          <span className="bg-gradient-to-r from-sky-300 via-emerald-300 to-emerald-400
                           bg-clip-text text-transparent">
            강의 자료가 만들어집니다
          </span>
        </motion.h1>

        <motion.p
          custom={2} variants={fade} initial="hidden" animate="show"
          className="text-xl text-slate-400 leading-relaxed mb-12 max-w-2xl"
        >
          슬라이드를 미리 만들지 않습니다. 강사의 발화를 인식해
          AI가 그 자리에서 시각 자료를 구성하고,
          화면의 모든 수치는 임베딩 모델이 실제로 계산합니다.
        </motion.p>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {STACK.map(({ icon: Icon, label, sub, color }, i) => (
            <motion.div
              key={label}
              custom={3 + i} variants={fade} initial="hidden" animate="show"
              className="rounded-xl px-5 py-5 bg-slate-900/40
                         border border-slate-800 backdrop-blur-sm"
            >
              <Icon size={22} className={`${color} mb-3`} strokeWidth={1.8} />
              <div className="text-slate-200 mb-1">{label}</div>
              <div className="text-sm text-slate-500 font-mono">{sub}</div>
            </motion.div>
          ))}
        </div>

        <motion.div custom={6} variants={fade} initial="hidden" animate="show">
          {/* 모드 선택 */}
          <div className="flex gap-3 mb-4">
            {MODES.map(({ id, icon: Icon, title, desc }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex-1 text-left rounded-xl px-5 py-4 border transition-all ${
                  mode === id
                    ? 'border-emerald-500/60 bg-emerald-950/30'
                    : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className={`mb-2 ${mode === id ? 'text-emerald-400' : 'text-slate-500'}`}
                />
                <div className={mode === id ? 'text-slate-100' : 'text-slate-400'}>
                  {title}
                </div>
                <div className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</div>
              </button>
            ))}
          </div>

          {/* 대본 모드일 때만 현재 대본을 보여준다 */}
          {mode === 'script' && (
            <div className="mb-9 rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">{script.title}</span>
                <button
                  onClick={onEditScript}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300"
                >
                  <Pencil size={13} /> 편집
                </button>
              </div>
              <div className="text-sm text-slate-500">
                발화 {script.utterances.length}개 · 첫 문장 “{script.utterances[0]}”
              </div>
            </div>
          )}

          <button
            onClick={() => onStart(mode)}
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-xl
                       bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-medium
                       transition-all shadow-lg shadow-emerald-900/40
                       hover:shadow-emerald-800/50 hover:-translate-y-0.5"
          >
            강의 시작
            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <p className="mt-6 text-sm text-slate-600">
            {micReady
              ? '시작하면 마이크 권한을 요청합니다'
              : '마이크가 없어도 하단 입력창으로 진행할 수 있습니다'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}