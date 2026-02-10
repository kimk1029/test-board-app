'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'

const tendencyQuestions = [
  { text: '관계에서 나는 보통', a: '안정감과 약속이 중요하다', b: '설렘과 새로움이 중요하다' },
  { text: '감정을 표현할 때', a: '천천히 신중하게 표현한다', b: '바로 솔직하게 표현한다' },
  { text: '갈등 상황에서', a: '시간을 두고 대화한다', b: '즉시 풀고 넘어간다' },
  { text: '데이트/약속은', a: '계획형이 편하다', b: '즉흥형이 재밌다' },
]

export default function TendencyPage() {
  const [answers, setAnswers] = useState<Record<number, 'a' | 'b'>>({})

  const result = useMemo(() => {
    if (Object.keys(answers).length !== tendencyQuestions.length) return null
    const aCount = Object.values(answers).filter((v) => v === 'a').length
    if (aCount >= 3) return { type: '안정형', desc: '신뢰와 일관성을 중요하게 여기는 타입이에요.' }
    if (aCount === 2) return { type: '균형형', desc: '상황에 따라 유연하게 맞추는 타입이에요.' }
    return { type: '탐험형', desc: '설렘, 자극, 새로운 경험을 선호하는 타입이에요.' }
  }, [answers])

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">성 성향 테스트</h1>
        <p className="text-slate-400 mb-8">관계에서의 성향을 알아보세요.</p>

        <div className="max-w-xl space-y-4">
          {tendencyQuestions.map((q, idx) => (
            <div key={idx} className="bg-[#18181b] border border-white/10 rounded-xl p-4">
              <p className="font-semibold text-white mb-3">{idx + 1}. {q.text}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setAnswers((prev) => ({ ...prev, [idx]: 'a' }))}
                  className={`px-3 py-2 rounded-lg border text-left transition ${answers[idx] === 'a' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'}`}
                >
                  {q.a}
                </button>
                <button
                  onClick={() => setAnswers((prev) => ({ ...prev, [idx]: 'b' }))}
                  className={`px-3 py-2 rounded-lg border text-left transition ${answers[idx] === 'b' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'}`}
                >
                  {q.b}
                </button>
              </div>
            </div>
          ))}
          {result && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6 text-center">
              <p className="text-cyan-400 font-bold text-xl mb-2">{result.type}</p>
              <p className="text-slate-300">{result.desc}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
