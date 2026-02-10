'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'

const sajuComments: string[] = [
  '금년에 인연이 잘 풀리는 해입니다. 적극적으로 만나보세요.',
  '재물운이 올라가는 시기입니다. 무리한 지출은 삼가세요.',
  '건강에 신경 쓰면 좋은 해입니다. 규칙적인 생활을.',
  '학업·자기계발에 유리한 흐름입니다. 도전해 보세요.',
  '주변의 도움이 큰 해입니다. 혼자 끙끙대지 마세요.',
  '변화가 많은 해입니다. 유연하게 받아들이면 좋아요.',
  '안정을 추구하기 좋은 시기입니다. 무리한 도전은 잠시 미뤄도 돼요.',
]

function getSajuResult(birthStr: string): string {
  let hash = 0
  for (let i = 0; i < birthStr.length; i++) hash = (hash * 31 + birthStr.charCodeAt(i)) >>> 0
  return sajuComments[hash % sajuComments.length]
}

export default function SajuPage() {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')

  const result = useMemo(() => {
    const y = year.trim()
    const m = month.trim()
    const d = day.trim()
    if (!y || !m || !d) return null
    return getSajuResult(`${y}-${m}-${d}`)
  }, [year, month, day])

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">사주</h1>
        <p className="text-slate-400 mb-8">생년월일을 입력하면 간단한 해석을 보여드려요. (가벼운 재미용)</p>

        <div className="max-w-md space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 text-sm mb-1">년</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1990"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">월</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="01"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">일</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="15"
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>
          {result && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <p className="text-amber-200 leading-relaxed">{result}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
