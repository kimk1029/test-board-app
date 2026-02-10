'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { questions, type MBTIType } from './data'

export default function MBTITestPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [scores, setScores] = useState<Record<MBTIType, number>>({
    E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
  })
  const [fade, setFade] = useState(false)

  const handleAnswer = (type: MBTIType) => {
    const newScores = { ...scores, [type]: scores[type] + 1 }
    setScores(newScores)

    setFade(true)
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1)
        setFade(false)
      } else {
        finishTest(newScores)
      }
    }, 300)
  }

  const finishTest = (finalScores: Record<MBTIType, number>) => {
    const r1 = finalScores.E >= finalScores.I ? 'E' : 'I'
    const r2 = finalScores.S >= finalScores.N ? 'S' : 'N'
    const r3 = finalScores.T >= finalScores.F ? 'T' : 'F'
    const r4 = finalScores.J >= finalScores.P ? 'J' : 'P'
    const resultType = `${r1}${r2}${r3}${r4}`
    router.push(`/mbti/result/${resultType}`)
  }

  const progress = ((currentStep + 1) / questions.length) * 100
  const currentQ = questions[currentStep]

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden">
      <HeaderNavigator />

      {/* 상단 프로그레스 바 */}
      <div className="fixed top-16 left-0 right-0 h-1.5 bg-white/5 z-40">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          {/* 질문 카운터 */}
          <div className="text-center">
            <span className="inline-block px-3 py-1.5 rounded-full bg-white/5 text-violet-400 text-xs font-bold tracking-widest border border-white/10">
              QUESTION {currentStep + 1} / {questions.length}
            </span>
          </div>

          {/* 질문 카드 */}
          <div className={`transition-opacity duration-300 ${fade ? 'opacity-0' : 'opacity-100'}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-center leading-relaxed break-keep min-h-[100px] flex items-center justify-center text-white">
              {currentQ.text}
            </h2>

            <div className="mt-10 space-y-4">
              <button
                onClick={() => handleAnswer(currentQ.agree)}
                className="w-full py-5 px-6 rounded-2xl bg-[#18181b] hover:bg-violet-600 border border-white/10 hover:border-violet-500 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] text-white"
              >
                그렇다
              </button>
              <button
                onClick={() => handleAnswer(currentQ.disagree)}
                className="w-full py-5 px-6 rounded-2xl bg-[#18181b] hover:bg-pink-600 border border-white/10 hover:border-pink-500 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-pink-500/20 active:scale-[0.98] text-white"
              >
                아니다
              </button>
            </div>
          </div>

          {/* 심리테스트로 돌아가기 */}
          <div className="text-center pt-4">
            <Link
              href="/psychology"
              className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
            >
              ← 심리테스트 메인으로
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
