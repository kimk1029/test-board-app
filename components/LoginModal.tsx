'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

const LoginModal = ({ open, onClose, onLoginSuccess }: LoginModalProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleLogin = async () => {
    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      if (data.loginBonus > 0) {
        alert(`로그인 보너스로 ${data.loginBonus} 포인트를 받았습니다!`)
      }

      onLoginSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error during login:', error)
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '인증 코드 발송에 실패했습니다.')
        setLoading(false)
        return
      }

      setIsEmailSent(true)
      setCodeSent(true)
      setCountdown(600) // 10분 = 600초

      // 개발 환경에서 코드 표시
      if (data.code) {
        alert(`개발 모드: 인증 코드는 ${data.code} 입니다.`)
      } else {
        alert('인증 코드가 발송되었습니다. 이메일을 확인해주세요.')
      }

      // 카운트다운 시작
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setLoading(false)
    } catch (error) {
      console.error('Error sending verification code:', error)
      setError('인증 코드 발송 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!verificationCode) {
      setError('인증 코드를 입력해주세요.')
      return
    }

    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '인증 코드가 올바르지 않습니다.')
        setLoading(false)
        return
      }

      setIsEmailVerified(true)
      alert('이메일 인증이 완료되었습니다.')
      setLoading(false)
    } catch (error) {
      console.error('Error verifying email:', error)
      setError('이메일 인증 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleSignUpSubmit = async () => {
    if (!isEmailVerified) {
      setError('이메일 인증을 완료해주세요.')
      return
    }

    if (!nickname || nickname.trim() === '') {
      setError('닉네임을 입력해주세요.')
      return
    }

    if (!password || password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nickname: nickname.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '회원가입에 실패했습니다.')
        setLoading(false)
        return
      }

      alert('회원가입이 완료되었습니다. 로그인해주세요.')
      handleClose()
    } catch (error) {
      console.error('Error during registration:', error)
      setError('회원가입 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setIsSignUp(false)
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
    setNickname('')
    setVerificationCode('')
    setIsEmailSent(false)
    setIsEmailVerified(false)
    setCodeSent(false)
    setCountdown(0)
    setError('')
    setLoading(false)
  }

  const handleGoogleLogin = () => {
    try {
      // 구글 로그인 페이지로 리다이렉트
      const googleAuthUrl = `/api/auth/google`
      window.location.href = googleAuthUrl
    } catch (error) {
      console.error('Google login error:', error)
      setError('구글 로그인을 시작하는데 실패했습니다.')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#0a0a0c]/95 border-white/10 backdrop-blur-xl text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">{isSignUp ? 'JOIN US' : 'WELCOME BACK'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {isSignUp
              ? '새로운 계정으로 여정을 시작하세요'
              : '다시 오신 것을 환영합니다'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-900/30 border border-red-500/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {!isSignUp ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin()
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin()
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-signup" className="text-slate-300">이메일</Label>
                <div className="flex gap-2">
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="name@example.com"
                    className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isEmailSent}
                  />
                  {!isEmailSent && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendVerificationCode}
                      disabled={loading || !email}
                      className="bg-violet-600 border-none hover:bg-violet-700 text-white"
                    >
                      인증
                    </Button>
                  )}
                </div>
              </div>
              {isEmailSent && !isEmailVerified && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="verification-code" className="text-slate-300">인증 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="000000"
                      className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors tracking-widest text-center font-bold"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyEmail}
                      disabled={loading || !verificationCode}
                      className="bg-emerald-600 border-none hover:bg-emerald-700 text-white"
                    >
                      확인
                    </Button>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    {countdown > 0 ? (
                      <span className="text-violet-400">
                        남은 시간: {formatTime(countdown)}
                      </span>
                    ) : (
                      codeSent && <span className="text-red-400">시간 초과</span>
                    )}
                    {countdown === 0 && codeSent && (
                      <button
                        onClick={handleSendVerificationCode}
                        className="text-slate-400 hover:text-white underline"
                      >
                        재발송
                      </button>
                    )}
                  </div>
                </div>
              )}
              {isEmailVerified && (
                <div className="rounded-md bg-emerald-900/30 border border-emerald-500/30 p-3 text-sm text-emerald-300 animate-in fade-in">
                  ✓ 이메일 인증 완료
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password-signup" className="text-slate-300">비밀번호</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="최소 6자 이상"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isEmailVerified}
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
                  disabled={!isEmailVerified}
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-slate-300">닉네임 <span className="text-red-400">*</span></Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  className="bg-black/30 border-white/10 text-white focus:border-violet-500 transition-colors"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={!isEmailVerified}
                  required
                />
              </div>
            </>
          )}

          <div className="pt-2">
            {isSignUp ? (
              <Button
                onClick={handleSignUpSubmit}
                disabled={loading || !isEmailVerified || !nickname.trim() || password !== passwordConfirm || password.length < 6}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
              >
                {loading ? '처리 중...' : '계정 생성하기'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-slate-200 font-bold h-11 mb-3"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0a0a0c] px-2 text-slate-500">또는</span>
                  </div>
                </div>
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white text-gray-700 hover:bg-gray-100 font-bold h-11 mt-3 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google로 로그인
                </Button>
              </>
            )}
          </div>

          <div className="text-center text-sm pt-2">
            {isSignUp ? (
              <span className="text-slate-500">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-violet-400 hover:text-violet-300 font-bold ml-1"
                >
                  로그인
                </button>
              </span>
            ) : (
              <span className="text-slate-500">
                계정이 없으신가요?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-violet-400 hover:text-violet-300 font-bold ml-1"
                >
                  회원가입
                </button>
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LoginModal
