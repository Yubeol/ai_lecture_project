import scenarioCache from '../fixtures/scenario.json'

const TIMEOUT_MS = 8000

/** 현재 강의의 대본. App이 시작할 때 넣어준다. */
let order = []

export function setScriptOrder(list) {
  order = list ?? []
}

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
 * 대본 순서를 알고 있으므로, 한 화면을 띄운 직후
 * 다음 발화를 백그라운드에서 미리 만들어 둔다.
 */
const store = new Map()   // utterance → Promise<result>

/** 백그라운드 생성 예약. 이미 있으면 아무것도 안 한다. */
export function prefetch(utterance) {
  const key = utterance?.trim()
  if (!key || store.has(key)) return
  // 실패해도 조용히 넘어간다. 어차피 본 호출에서 다시 시도한다.
  store.set(key, callApi(key).catch(() => null))
}

/** 현재 발화 다음 순서를 미리 만든다. */
export function prefetchNext(utterance) {
  const i = order.indexOf(utterance.trim())
  if (i < 0 || i + 1 >= order.length) return
  prefetch(order[i + 1])
}

/** 대본 첫 발화를 미리 만든다. 강의 시작 시 1회. */
export function prefetchFirst() {
  if (order.length) prefetch(order[0])
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

/**
 * 발화가 대본 몇 번째인지 판정한다.
 * STT는 조사·어미를 자주 흘리므로 문자열 일치가 아니라 임베딩 유사도로 맞춘다.
 */
export async function matchScript(utterance, script) {
  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterance, script }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 대본 줄끼리 얼마나 헷갈리는지 검사한다. */
export async function checkAmbiguity(script) {
  try {
    const res = await fetch('/api/ambiguity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}