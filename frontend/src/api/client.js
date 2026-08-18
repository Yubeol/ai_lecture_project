export async function generate(utterance) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utterance }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}