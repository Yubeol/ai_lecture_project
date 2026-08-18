import SimilarityGauge from './slides/SimilarityGauge'
import VectorBars from './slides/VectorBars'
import Scatter2D from './slides/Scatter2D'

const REGISTRY = {
  SimilarityGauge,
  VectorBars,
  Scatter2D,
}

export default function Stage({ payload }) {
  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-3xl text-slate-600">강의를 시작하세요</p>
      </div>
    )
  }

  const Component = REGISTRY[payload.component]

  // 아직 안 만든 컴포넌트가 오면 조용히 무시. 강의는 계속되어야 한다.
  if (!Component) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-slate-600">
          준비되지 않은 자료입니다 ({payload.component})
        </p>
      </div>
    )
  }

    return (
    <div className="min-h-screen flex items-start justify-center pt-12 pb-48">
      <Component {...payload} />
    </div>
  )
}