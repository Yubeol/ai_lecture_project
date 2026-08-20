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
  topic: '임베딩',
  utterances: [
    {
      text: '검색창에 강아지 키우는 법이라고 쳤는데 반려견 양육 가이드라는 글이 나옵니다',
      note: '단어가 하나도 안 겹치는데 왜 찾아졌을까 — 청중에게 질문 던지기',
    },
    {
      text: '컴퓨터는 이 두 표현이 같은 뜻이라는 걸 어떻게 알았을까요',
      note: '화면 점수 가리키며. 0.7 vs 0.1 대비 강조',
    },
    {
      text: '사람은 글자를 읽지만 컴퓨터는 숫자만 다룰 수 있습니다',
      note: '좌우 대조. 여기서 "그래서 숫자로 바꿔야 한다"로 연결',
    },
    {
      text: '임베딩은 문장을 숫자 목록으로 바꿔서 의미를 다루는 기술입니다',
      note: '파이프라인 단계 하나씩 짚기. 토큰 분리 → 모델 → 벡터',
    },
    {
      text: '실제로 문장을 넣으면 이런 숫자들이 나옵니다',
      note: '막대가 위아래로 갈리는 게 양수/음수. 마우스 올리면 실제 값',
    },
    {
      text: '문장 하나가 768개의 숫자로 바뀝니다',
      note: '화면엔 앞 16개만. 768개를 다 보여주면 아무것도 안 보임',
    },
    {
      text: '이 숫자 하나하나가 뭘 뜻하는지 두 문장을 나란히 놓고 봐도 알 수 없습니다',
      note: '사람이 해석 불가. 의미는 개별 숫자가 아니라 전체 패턴에',
    },
    {
      text: '이 숫자로 두 문장이 얼마나 비슷한지 잴 수 있습니다',
      note: '여기서 게이지 등장. 숫자는 ko-sroberta 실측이라고 못박기',
    },
    {
      text: '표현이 완전히 달라도 의미가 같으면 가까운 걸로 판단해요',
      note: '단어가 안 겹쳐도 점수가 높은 쌍을 짚기',
    },
    {
      text: '반대로 아무 상관 없는 문장이면 점수가 확 떨어지겠죠',
      note: '음수가 나오면 "왜 음수?"로 다음 화면 연결',
    },
    {
      text: '이 점수가 사실은 두 벡터 사이의 각도입니다',
      note: '90도 넘으면 음수. 0도=1.0, 90도=0, 180도=-1',
    },
    {
      text: '여기까지 질문 있으신가요',
      note: '화면이 안 바뀜 → 잡담을 걸러낸다는 걸 시연',
    },
    {
      text: '숫자 목록을 평면 위의 좌표라고 생각해보면 이해가 쉽습니다',
      note: '768차원을 2차원으로. PCA라 정보 손실이 있다는 점도 언급',
    },
    {
      text: '이걸 평면에 찍어보면 비슷한 문장끼리 모여 있는 게 보입니다',
      note: '군집 손으로 짚기. 동물 / 음식 / 교통',
    },
    {
      text: '그럼 여러분이 문장을 하나 말해보시면 어디에 놓이는지 보겠습니다',
      note: '★ 청중 참여 버튼 누르기. 채팅으로 문장 받아 입력',
    },
    {
      text: '정리하면 임베딩은 의미를 좌표로 바꾸고 거리로 비교하는 기술입니다',
      note: '핵심 3줄 요약',
    },
    {
      text: '지금 이 강의 화면도 제 말을 임베딩으로 매칭해서 띄운 것입니다',
      note: '★ 헤더의 매칭 점수 가리키기. 도구가 자기 자신을 설명',
    },
  ],
}