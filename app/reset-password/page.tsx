'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import HeaderNavigator from '@/components/HeaderNavigator'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('유효하지 않은 링크입니다.')
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!token) {
      setError('유효하지 않은 토큰입니다.')
      return
    }

    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '비밀번호 재설정에 실패했습니다.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error('Error during password reset:', error)
      setError('비밀번호 재설정 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  if (!token && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <HeaderNavigator />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-white">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <HeaderNavigator />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md bg-[#0a0a0c]/95 border border-white/10 backdrop-blur-xl rounded-lg shadow-2xl p-8 text-slate-100">
          <h1 className="text-2xl font-black text-white mb-2">비밀번호 재설정</h1>
          <p className="text-slate-400 mb-6">새로운 비밀번호를 입력해주세요.</p>

          {error && (
            <div className="rounded-md bg-red-900/30 border border-red-500/30 p-3 text-sm text-red-300 mb-4">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-emerald-900/30 border border-emerald-500/30 p-3 text-sm text-emerald-300">
                비밀번호가 성공적으로 재설정되었습니다. 잠시 후 메인 페이지로 이동합니다.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">새 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="최소 6자 이상"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-confirm" className="text-slate-300">비밀번호 확인</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                  }}
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || !password || password.length < 6 || password !== passwordConfirm}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
              >
                {loading ? '처리 중...' : '비밀번호 재설정'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <HeaderNavigator />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-white">로딩 중...</div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

