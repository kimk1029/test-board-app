'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import HeaderNavigator from '@/components/HeaderNavigator'
import { fortuneCategories, fortuneData, getSeedIndex } from './data'

export default function FortunePage() {
  const [name, setName] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const results = useMemo(() => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const seed = `${trimmed}-${today}`

    return fortuneCategories.map((cat) => {
      const list = fortuneData[cat.key]
      const index = getSeedIndex(seed + cat.key, list.length)
      return { ...cat, text: list[index] }
    })
  }, [name, today])

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100">
      <HeaderNavigator />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-20">
        <Link href="/psychology" className="inline-flex items-center text-slate-500 hover:text-slate-400 text-sm mb-6">← 심리테스트</Link>
        <h1 className="text-2xl font-bold text-white mb-2">오늘의 운세</h1>
        <p className="text-slate-400 mb-8">이름(닉네임)을 입력하면 오늘의 운세를 카테고리별로 보여드려요.</p>

        <div className="max-w-xl space-y-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="닉네임 입력"
            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-yellow-500"
          />
          {results && (
            <div className="space-y-4">
              {results.map((item) => (
                <div
                  key={item.key}
                  className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5"
                >
                  <p className="text-yellow-400 font-bold text-sm mb-2">{item.label}</p>
                  <p className="text-slate-200 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
