const BASE = '/api/lectures'

export async function listLectures() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}

export async function getLecture(id) {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}

export async function createLecture(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}

export async function updateLecture(id, payload) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}

export async function deleteLecture(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return true
}

export async function startSession(lectureId) {
  const res = await fetch(`${BASE}/${lectureId}/sessions`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data.session_id
}

/**
 * 실행 기록을 남긴다.
 * 실패해도 강의는 계속되어야 하므로 결과를 기다리지 않고 에러도 삼킨다.
 */
export function logStep(entry) {
  fetch(`${BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {})
}

export async function getLogs(lectureId) {
  const res = await fetch(`${BASE}/${lectureId}/logs`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}