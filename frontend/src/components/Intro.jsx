export default function Intro({ onStart, micReady }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="max-w-3xl w-full">
        <p className="text-sm tracking-widest text-emerald-400 mb-4">
          VOICE-DRIVEN LECTURE
        </p>

        <h1 className="text-6xl font-bold leading-tight mb-6 text-white">
          말하면,<br />강의 자료가 만들어집니다
        </h1>

        <p className="text-xl text-slate-400 leading-relaxed mb-12">
          슬라이드를 미리 만들지 않습니다. 강사의 발화를 인식해
          AI가 그 자리에서 시각 자료를 구성하고,
          화면의 모든 수치는 임베딩 모델이 실제로 계산합니다.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-14">
          {[
            ['음성 인식', 'Web Speech API'],
            ['자료 구성', 'Claude API'],
            ['수치 계산', 'ko-sroberta'],
          ].map(([label, sub]) => (
            <div key={label} className="border border-slate-800 rounded-lg px-5 py-4">
              <div className="text-slate-200 mb-1">{label}</div>
              <div className="text-sm text-slate-500 font-mono">{sub}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="px-10 py-4 rounded-lg bg-emerald-600 hover:bg-emerald-500
                     text-white text-xl font-medium transition-colors"
        >
          강의 시작
        </button>

        <p className="mt-6 text-sm text-slate-600">
          {micReady
            ? '시작하면 마이크 권한을 요청합니다'
            : '마이크가 없어도 하단 입력창으로 진행할 수 있습니다'}
        </p>
      </div>
    </div>
  )
}