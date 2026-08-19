import { AnimatePresence, motion } from 'framer-motion'
import SimilarityGauge from './slides/SimilarityGauge'
import VectorBars from './slides/VectorBars'
import Scatter2D from './slides/Scatter2D'
import KeyPoints from './slides/KeyPoints'
import Scatter2DLive from './slides/Scatter2DLive'

const REGISTRY = {
  SimilarityGauge,
  VectorBars,
  Scatter2D,
  Scatter2DLive,
  KeyPoints,
}
/** 화면이 교체될 때마다 새 key를 만든다. 같은 컴포넌트라도 내용이 바뀌면 다시 그린다. */
function keyOf(payload) {
  if (!payload) return 'empty'
  // Live 산점도는 점이 추가될 때마다 다시 그려야 한다
  if (payload.component === 'Scatter2DLive') {
    return `live|${payload.data?.length ?? 0}`
  }
  return `${payload.component}|${payload.title ?? ''}`
}

const variants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
}

export default function Stage({ payload }) {
  const Component = payload ? REGISTRY[payload.component] : null

  let content
  if (!payload) {
    content = (
      <p className="text-3xl text-slate-600">강의를 시작하세요</p>
    )
  } else if (!Component) {
    // 아직 안 만든 컴포넌트가 오면 조용히 넘어간다. 강의는 계속되어야 한다.
    content = (
      <p className="text-2xl text-slate-600">
        준비되지 않은 자료입니다 ({payload.component})
      </p>
    )
  } else {
    content = <Component {...payload} />
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-12 pb-48">
      <AnimatePresence mode="wait">
        <motion.div
          key={keyOf(payload)}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
                    transition={{
            duration: payload?.component === 'Scatter2DLive' ? 0.15 : 0.35,
            ease: 'easeOut',
          }}
          className="w-full flex items-center justify-center"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}