/**
 * 대본 파일 형식
 *   # 강의 제목        (첫 줄, 선택)
 *   빈 줄은 무시
 *   나머지는 한 줄이 한 발화
 */

export function parseScript(text) {
  const lines = text.split(/\r?\n/)
  let title = ''
  const utterances = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) {
      if (!title) title = line.replace(/^#+\s*/, '')
      continue
    }
    utterances.push(line)
  }

  return { title, utterances }
}

export function serializeScript(title, utterances) {
  const head = title ? `# ${title}\n\n` : ''
  return head + utterances.join('\n') + '\n'
}

export function downloadScript(title, utterances) {
  const text = serializeScript(title, utterances)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title || 'script'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

/** 기본 대본. 처음 켰을 때 이걸로 시작한다. */
export const DEFAULT_SCRIPT = {
  title: '임베딩과 코사인 유사도',
  utterances: [
    '오늘은 임베딩이라는 걸 다뤄보겠습니다',
    '컴퓨터는 글자를 그대로 이해하지 못해서 문장을 숫자로 바꿔야 합니다',
    '이 숫자들이 각각 무슨 뜻인지는 사람이 알 수 없습니다',
    '이 숫자로 두 문장이 얼마나 비슷한지 잴 수 있습니다',
    '표현이 완전히 달라도 의미가 같으면 가까운 걸로 판단해요',
    '반대로 아무 상관 없는 문장이면 점수가 확 떨어지겠죠',
    '여기까지 질문 있으신가요',
    '이걸 평면에 찍어보면 비슷한 문장끼리 모여 있는 게 보입니다',
    '지금 이 강의 화면도 임베딩으로 만들어지고 있습니다',
  ],
}