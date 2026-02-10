'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { dreamInterpretations, dreamDefaultMessage } from './data'

export default function DreamPage() {
  const [dreamInput, setDreamInput] = useState('')

  const { matches, message } = useMemo(() => {
    const trimmed = dreamInput.trim()
    if (!trimmed) return { matches: [], message: null }

    const matched: { keyword: string; text: string }[] = []
    for (const keyword of Object.keys(dreamInterpretations)) {
      if (trimmed.includes(keyword)) {
        matched.push({ keyword, text: dreamInterpretations[keyword] })
      }
    }

    if (matched.length === 0) {
      return { matches: [], message: dreamDefaultMessage }
    }
    return { matches: matched, message: null }
  }, [dreamInput])

  const hasResult = matches.length > 0 || message !== null

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">꿈해몽</h1>
        <p className="text-slate-400 mb-8">
          꿈에 나온 키워드를 입력해 보세요. 예: 물, 뱀, 비행, 추락, 아기, 개, 꽃, 해, 집, 돈
        </p>

        <div className="max-w-xl space-y-4">
          <input
            value={dreamInput}
            onChange={(e) => setDreamInput(e.target.value)}
            placeholder="꿈 내용을 간단히 입력..."
            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500"
          />
          {hasResult && (
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-6 space-y-4">
              {matches.length > 0 && (
                <>
                  {matches.map((m) => (
                    <div key={m.keyword} className="space-y-1">
                      <span className="text-indigo-400 font-medium">[{m.keyword}]</span>
                      <p className="text-slate-200">{m.text}</p>
                    </div>
                  ))}
                </>
              )}
              {message && <p className="text-slate-300">{message}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
