/**
 * 되돌아가기 판정.
 * 강의 중 "아까 유사도 화면으로 돌아가볼게요" 같은 발화를 처리한다.
 */

const RECALL_WORDS = [
  '다시', '돌아가', '아까', '이전', '앞에서', '조금 전', '방금 그',
]

/** 컴포넌트를 부르는 말. 되돌아갈 대상을 찾는 데 쓴다. */
const COMPONENT_HINTS = {
  SimilarityGauge: ['유사도', '점수', '게이지', '비슷'],
  CosineAngle: ['각도', '방향', '코사인'],
  VectorBars: ['벡터', '막대', '숫자', '차원'],
  Scatter2D: ['평면', '산점도', '좌표', '공간', '점'],
  Scatter2DLive: ['청중', '여러분', '참여'],
  Pipeline: ['과정', '흐름', '단계'],
  Compare: ['비교', '대조', '차이'],
  KeyPoints: ['정리', '요약', '핵심'],
}

/** 발화에 되돌아가기 의도가 있는가 */
export function isRecall(utterance) {
  return RECALL_WORDS.some((w) => utterance.includes(w))
}

/**
 * 히스토리에서 되돌아갈 화면을 찾는다.
 * 발화에 담긴 힌트와 맞는 것 중 가장 최근 것.
 * 못 찾으면 -1.
 */
export function findRecallTarget(utterance, history) {
  const wanted = Object.entries(COMPONENT_HINTS)
    .filter(([, words]) => words.some((w) => utterance.includes(w)))
    .map(([name]) => name)

  if (!wanted.length) return -1

  for (let i = history.length - 1; i >= 0; i--) {
    if (wanted.includes(history[i].component)) return i
  }
  return -1
}