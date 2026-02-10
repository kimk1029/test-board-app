'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { results } from '@/app/mbti/data'
import { useState } from 'react'

export default function MBTIResultPage() {
  const params = useParams()
  const router = useRouter()
  const type = (params.type as string)?.toUpperCase()
  const resultData = type ? results[type] : null
  const [copied, setCopied] = useState(false)

  if (!resultData) {
    return (
      <div className="min-h-screen bg-[#09090b] text-slate-100">
        <HeaderNavigator />
        <main className="container mx-auto px-4 pt-24 pb-20 flex flex-col items-center justify-center min-h-[80vh]">
          <h1 className="text-2xl font-bold text-white mb-4">존재하지 않는 결과입니다.</h1>
          <div className="flex gap-3">
            <Link href="/mbti" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold text-white transition-colors">
              테스트 다시 하기
            </Link>
            <Link href="/psychology" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-slate-300 transition-colors">
              심리테스트 메인
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 overflow-x-hidden">
      <HeaderNavigator />

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20 py-12">
        <div className="max-w-md mx-auto bg-[#18181b] rounded-3xl overflow-hidden shadow-2xl border border-white/10">

          {/* 결과 헤더 영역 */}
          <div className={`w-full h-64 bg-gradient-to-br ${resultData.imageColor} flex items-center justify-center relative p-6`}>
            <div className="absolute inset-0 bg-black/20" />
            <h1 className="relative z-10 text-5xl font-extrabold text-white tracking-widest drop-shadow-md">
              {type}
            </h1>
            <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1.5 rounded-full text-xs text-white/90">
              밤일 성향 테스트
            </div>
          </div>

          {/* 결과 내용 */}
          <div className="p-8 text-center">
            <p className="text-violet-400 font-bold tracking-wider mb-2 text-sm">당신의 유형은</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white break-keep leading-tight">
              {resultData.title}
            </h2>

            <div className="bg-black/30 p-6 rounded-xl border border-white/5 mb-8">
              <p className="text-slate-300 leading-relaxed text-base sm:text-lg break-keep">
                {resultData.desc}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleShare}
                className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? '✅ 링크 복사 완료!' : '🔗 결과 공유하기'}
              </button>

              <Link
                href="/mbti"
                className="block w-full py-4 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl font-bold transition-colors text-center border border-white/10"
              >
                다시 테스트하기
              </Link>

              <Link
                href="/psychology"
                className="block w-full py-3 text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                ← 심리테스트 메인으로
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
