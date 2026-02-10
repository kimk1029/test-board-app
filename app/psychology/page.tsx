'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'

type TabKey = 'mbti' | 'tendency' | 'dream' | 'fortune'

type MbtiQuestion = {
  text: string
  a: { label: string; type: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P' }
  b: { label: string; type: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P' }
}

const mbtiQuestions: MbtiQuestion[] = [
  { text: '새로운 모임에 가면?', a: { label: '먼저 말 건다', type: 'E' }, b: { label: '상황을 보고 천천히', type: 'I' } },
  { text: '일할 때 더 중요한 건?', a: { label: '현실적 디테일', type: 'S' }, b: { label: '큰 그림과 아이디어', type: 'N' } },
  { text: '갈등이 생기면?', a: { label: '논리적으로 판단', type: 'T' }, b: { label: '관계를 먼저 고려', type: 'F' } },
  { text: '여행 스타일은?', a: { label: '미리 계획 촘촘히', type: 'J' }, b: { label: '즉흥적으로 자유롭게', type: 'P' } },
  { text: '쉬는 날 에너지 충전은?', a: { label: '사람들과 활동', type: 'E' }, b: { label: '혼자 조용히', type: 'I' } },
  { text: '정보를 볼 때?', a: { label: '사실/경험 중심', type: 'S' }, b: { label: '의미/가능성 중심', type: 'N' } },
  { text: '결정 직전 기준은?', a: { label: '원칙과 효율', type: 'T' }, b: { label: '감정과 공감', type: 'F' } },
  { text: '마감 관리 방식은?', a: { label: '일찍 끝내고 정리', type: 'J' }, b: { label: '유연하게 맞추기', type: 'P' } },
]

const tendencyQuestions = [
  {
    text: '관계에서 나는 보통',
    a: '안정감과 약속이 중요하다',
    b: '설렘과 새로움이 중요하다',
  },
  {
    text: '감정을 표현할 때',
    a: '천천히 신중하게 표현한다',
    b: '바로 솔직하게 표현한다',
  },
  {
    text: '갈등 상황에서',
    a: '시간을 두고 대화한다',
    b: '즉시 풀고 넘어간다',
  },
  {
    text: '데이트/약속은',
    a: '계획형이 편하다',
    b: '즉흥형이 재밌다',
  },
]

const dreamMap: Record<string, string> = {
  물: '감정의 흐름과 정화의 신호예요. 마음을 정리하기 좋은 시기입니다.',
  비행: '성장 욕구와 자유에 대한 갈망이 커진 상태예요.',
  추락: '통제감이 흔들리는 불안이 반영될 수 있어요. 휴식이 필요합니다.',
  이빨: '자신감/대인관계 관련 스트레스를 나타내는 경우가 많아요.',
  시험: '압박감과 성취 욕구가 동시에 커진 상태를 의미할 수 있어요.',
  뱀: '변화, 경계심, 직감이 강해지는 시기일 수 있어요.',
  아기: '새로운 시작, 아이디어, 책임감의 탄생을 상징합니다.',
  죽음: '끝이 아니라 전환의 상징인 경우가 많아요. 삶의 변화 신호입니다.',
}

function getFortune(seedText: string) {
  const fortunes = [
    '작은 선택이 큰 기회를 만들어요. 오늘은 빠른 실행이 행운 포인트!',
    '주변의 조언에 힌트가 있습니다. 대화 속에서 답을 찾게 돼요.',
    '무리하지 말고 페이스 조절이 중요해요. 꾸준함이 승리합니다.',
    '의외의 연락, 의외의 제안이 들어올 수 있어요. 열린 태도가 좋아요.',
    '금전/소비는 계획적으로. 필요한 지출과 욕구 지출을 분리해보세요.',
    '오늘은 정리의 날! 책상/메모 정리가 운을 올려줘요.',
    '감정 기복이 있을 수 있어요. 산책 10분이 흐름을 바꿉니다.',
  ]

  let hash = 0
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0
  }
  return fortunes[hash % fortunes.length]
}

export default function PsychologyPage() {
  const [tab, setTab] = useState<TabKey>('mbti')
  const [mbtiAnswers, setMbtiAnswers] = useState<Record<number, 'a' | 'b'>>({})
  const [tendencyAnswers, setTendencyAnswers] = useState<Record<number, 'a' | 'b'>>({})
  const [dreamInput, setDreamInput] = useState('')
  const [fortuneName, setFortuneName] = useState('')

  const mbtiResult = useMemo(() => {
    if (Object.keys(mbtiAnswers).length !== mbtiQuestions.length) return null
    const score = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    mbtiQuestions.forEach((q, idx) => {
      const selected = mbtiAnswers[idx]
      if (!selected) return
      const type = selected === 'a' ? q.a.type : q.b.type
      score[type] += 1
    })
    return `${score.E >= score.I ? 'E' : 'I'}${score.S >= score.N ? 'S' : 'N'}${score.T >= score.F ? 'T' : 'F'}${score.J >= score.P ? 'J' : 'P'}`
  }, [mbtiAnswers])

  const tendencyResult = useMemo(() => {
    if (Object.keys(tendencyAnswers).length !== tendencyQuestions.length) return null
    const aCount = Object.values(tendencyAnswers).filter((v) => v === 'a').length
    if (aCount >= 3) return '안정형: 신뢰와 일관성을 중요하게 여기는 타입'
    if (aCount === 2) return '균형형: 상황에 따라 유연하게 맞추는 타입'
    return '탐험형: 설렘, 자극, 새로운 경험을 선호하는 타입'
  }, [tendencyAnswers])

  const dreamResult = useMemo(() => {
    const trimmed = dreamInput.trim()
    if (!trimmed) return null
    const hit = Object.keys(dreamMap).find((k) => trimmed.includes(k))
    return hit ? dreamMap[hit] : '지금의 꿈은 최근 스트레스/소망의 반영일 가능성이 커요. 최근 감정 상태를 기록해 보세요.'
  }, [dreamInput])

  const today = new Date().toISOString().slice(0, 10)
  const fortuneResult = useMemo(() => {
    if (!fortuneName.trim()) return null
    return getFortune(`${fortuneName.trim()}-${today}`)
  }, [fortuneName, today])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'mbti', label: '엠비티아이' },
    { key: 'tendency', label: '성 성향테스트' },
    { key: 'dream', label: '꿈해몽' },
    { key: 'fortune', label: '오늘의 운세' },
  ]

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 pb-20">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">심리테스트</h1>
        <p className="text-slate-400 mb-8">가볍게 즐기는 성향/운세 컨텐츠입니다.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-2 text-sm font-bold border transition ${
                tab === t.key ? 'bg-violet-600 border-violet-500 text-white' : 'bg-[#18181b] border-white/10 text-slate-300 hover:bg-[#202023]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'mbti' && (
          <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5 space-y-4">
            <Link
              href="/mbti"
              className="block mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/30 hover:border-violet-400/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">밤일 성향 MBTI 테스트</h3>
                  <p className="text-sm text-slate-400 mt-1">16문항 · 결과 공유 가능</p>
                </div>
                <span className="text-violet-400">→</span>
              </div>
            </Link>
            <p className="text-slate-500 text-sm mb-4">아래는 간단 8문항 버전입니다.</p>
            {mbtiQuestions.map((q, idx) => (
              <div key={idx} className="border border-white/10 rounded-xl p-4">
                <p className="font-semibold mb-3">{idx + 1}. {q.text}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <button onClick={() => setMbtiAnswers((prev) => ({ ...prev, [idx]: 'a' }))} className={`px-3 py-2 rounded-lg border text-left ${mbtiAnswers[idx] === 'a' ? 'bg-violet-600 border-violet-500' : 'bg-black/20 border-white/10'}`}>{q.a.label}</button>
                  <button onClick={() => setMbtiAnswers((prev) => ({ ...prev, [idx]: 'b' }))} className={`px-3 py-2 rounded-lg border text-left ${mbtiAnswers[idx] === 'b' ? 'bg-violet-600 border-violet-500' : 'bg-black/20 border-white/10'}`}>{q.b.label}</button>
                </div>
              </div>
            ))}
            {mbtiResult && <div className="text-center font-bold text-xl text-violet-300">당신의 결과: {mbtiResult}</div>}
          </section>
        )}

        {tab === 'tendency' && (
          <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5 space-y-4">
            {tendencyQuestions.map((q, idx) => (
              <div key={idx} className="border border-white/10 rounded-xl p-4">
                <p className="font-semibold mb-3">{idx + 1}. {q.text}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <button onClick={() => setTendencyAnswers((prev) => ({ ...prev, [idx]: 'a' }))} className={`px-3 py-2 rounded-lg border text-left ${tendencyAnswers[idx] === 'a' ? 'bg-cyan-600 border-cyan-500' : 'bg-black/20 border-white/10'}`}>{q.a}</button>
                  <button onClick={() => setTendencyAnswers((prev) => ({ ...prev, [idx]: 'b' }))} className={`px-3 py-2 rounded-lg border text-left ${tendencyAnswers[idx] === 'b' ? 'bg-cyan-600 border-cyan-500' : 'bg-black/20 border-white/10'}`}>{q.b}</button>
                </div>
              </div>
            ))}
            {tendencyResult && <div className="text-center font-bold text-lg text-cyan-300">{tendencyResult}</div>}
          </section>
        )}

        {tab === 'dream' && (
          <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-slate-300">꿈 키워드를 입력해 보세요. 예: 물, 추락, 뱀, 아기</p>
            <input
              value={dreamInput}
              onChange={(e) => setDreamInput(e.target.value)}
              placeholder="꿈 내용을 간단히 입력..."
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500"
            />
            {dreamResult && <div className="bg-black/20 border border-white/10 rounded-xl p-4 text-slate-200">{dreamResult}</div>}
          </section>
        )}

        {tab === 'fortune' && (
          <section className="bg-[#18181b] border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-slate-300">이름(닉네임)을 입력하면 오늘의 운세를 보여드립니다.</p>
            <input
              value={fortuneName}
              onChange={(e) => setFortuneName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500"
            />
            {fortuneResult && <div className="bg-black/20 border border-yellow-500/30 rounded-xl p-4 text-yellow-200">{fortuneResult}</div>}
          </section>
        )}
      </main>
    </div>
  )
}
