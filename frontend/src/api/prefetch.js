import scenarioCache from '../fixtures/scenario.json'
import scenarioOrder from '../fixtures/scenarioOrder.json'

const TIMEOUT_MS = 8000

/** 실제 API 호출. 타임아웃만 걸어둔다. */
async function callApi(utterance) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterance }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 선행 생성 저장소.
 * 시나리오 순서를 알고 있으므로, 한 화면을 띄운 직후
 * 다음 발화를 백그라운드에서 미리 만들어 둔다.
 */
const store = new Map()   // utterance → Promise<result>

/** 발화의 시나리오 인덱스. 없으면 -1 */
function indexOf(utterance) {
  return scenarioOrder.indexOf(utterance.trim())
}

/** 백그라운드 생성 예약. 이미 있으면 아무것도 안 한다. */
export function prefetch(utterance) {
  const key = utterance?.trim()
  if (!key || store.has(key)) return

  // 실패해도 조용히 넘어간다. 어차피 본 호출에서 다시 시도한다.
  const p = callApi(key).catch(() => null)
  store.set(key, p)
}

/** 현재 발화 다음 순서를 미리 만든다. */
export function prefetchNext(utterance) {
  const i = indexOf(utterance)
  if (i < 0 || i + 1 >= scenarioOrder.length) return
  prefetch(scenarioOrder[i + 1])
}

/** 시나리오 첫 발화를 미리 만든다. 앱 시작 시 1회. */
export function prefetchFirst() {
  if (scenarioOrder.length) prefetch(scenarioOrder[0])
}

/**
 * 발화를 결과로 바꾼다.
 * 우선순위: 선행 생성 → 실시간 호출 → 사전 생성 캐시
 */
export async function generate(utterance) {
  const key = utterance.trim()

  // 1) 선행 생성이 있으면 그것부터
  if (store.has(key)) {
    const hit = await store.get(key)
    store.delete(key)
    if (hit) return { ...hit, prefetched: true }
  }

  // 2) 실시간 호출
  try {
    return await callApi(key)
  } catch (e) {
    // 3) 사전 생성 캐시로 폴백
    const cached = scenarioCache[key]
    if (cached) {
      return {
        ok: true,
        payload: cached,
        cached: true,
        timing: { llm: 0, embed: 0, total: 0 },
      }
    }
    throw e
  }
}