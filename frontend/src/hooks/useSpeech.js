import { useCallback, useEffect, useRef, useState } from 'react'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * Chrome 음성인식은 수십 초 후 제멋대로 종료된다.
 * onend에서 재시작 루프를 돌려 강의 내내 살아있게 한다.
 */
export default function useSpeech({ onFinal, cooldownMs = 3000 }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recogRef = useRef(null)
  const wantRef = useRef(false)      // 사용자가 켜기를 원하는 상태
  const lastFireRef = useRef(0)      // 마지막 발화 처리 시각 (쿨다운)
  const onFinalRef = useRef(onFinal)

  useEffect(() => { onFinalRef.current = onFinal }, [onFinal])

  useEffect(() => {
    if (!SR) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다 (Chrome 필요)')
      return
    }

    const r = new SR()
    r.lang = 'ko-KR'
    r.continuous = true
    r.interimResults = true

    r.onstart = () => setListening(true)

    r.onresult = (e) => {
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const text = res[0].transcript.trim()

        if (res.isFinal) {
          const now = Date.now()
          // 쿨다운: 연속 발화가 쏟아질 때 API를 도배하지 않는다
          if (now - lastFireRef.current < cooldownMs) continue
          if (text.length < 2) continue
          lastFireRef.current = now
          onFinalRef.current?.(text)
        } else {
          partial = text
        }
      }
      setInterim(partial)
    }

    r.onerror = (e) => {
      // no-speech, aborted 는 정상 흐름. 진짜 에러만 표시한다.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('마이크 권한이 필요합니다')
        wantRef.current = false
      } else if (e.error === 'network') {
        setError('네트워크 오류 (음성인식은 인터넷 연결 필요)')
      }
    }

    r.onend = () => {
      setListening(false)
      setInterim('')
      // 사용자가 끈 게 아니면 즉시 재시작
      if (wantRef.current) {
        try { r.start() } catch { /* 이미 시작된 경우 무시 */ }
      }
    }

    recogRef.current = r
    return () => {
      wantRef.current = false
      try { r.stop() } catch { /* noop */ }
    }
  }, [cooldownMs])

  const start = useCallback(() => {
    if (!recogRef.current) return
    wantRef.current = true
    setError(null)
    try { recogRef.current.start() } catch { /* 이미 실행 중 */ }
  }, [])

  const stop = useCallback(() => {
    wantRef.current = false
    try { recogRef.current?.stop() } catch { /* noop */ }
  }, [])

  return { listening, interim, error, start, stop, supported: !!SR }
}