import scenarioCache from '../fixtures/scenario.json'

const TIMEOUT_MS = 6000

/**
 * 실시간 생성이 기본. 실패하거나 느리면 사전 생성분으로 폴백한다.
 * 강의는 어떤 경우에도 끊기지 않아야 한다.
 */
export async function generate(utterance) {
  const key = utterance.trim()
  const cached = scenarioCache[key]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterance }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    clearTimeout(timer)

    // 캐시가 있으면 조용히 대체한다
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