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
          nickname,
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
    setNickname('')
    setVerificationCode('')
    setIsEmailSent(false)
    setIsEmailVerified(false)
    setCodeSent(false)
    setCountdown(0)
    setError('')
    setLoading(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isSignUp ? '회원가입' : '로그인'}</DialogTitle>
          <DialogDescription>
            {isSignUp
              ? '새 계정을 만들어주세요'
              : '계정에 로그인하세요'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {!isSignUp ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin()
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-signup">이메일</Label>
                <div className="flex gap-2">
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="이메일을 입력하세요"
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
                    >
                      인증코드 발송
                    </Button>
                  )}
                </div>
              </div>
              {isEmailSent && !isEmailVerified && (
                <div className="space-y-2">
                  <Label htmlFor="verification-code">인증 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="6자리 인증 코드를 입력하세요"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyEmail}
                      disabled={loading || !verificationCode}
                    >
                      인증 확인
                    </Button>
                  </div>
                  {countdown > 0 && (
                    <p className="text-xs text-muted-foreground">
                      남은 시간: {formatTime(countdown)}
                    </p>
                  )}
                  {countdown === 0 && codeSent && (
                    <div className="flex gap-2">
                      <p className="text-xs text-red-500">인증 코드가 만료되었습니다.</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={handleSendVerificationCode}
                        className="p-0 h-auto text-xs"
                      >
                        다시 발송
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {isEmailVerified && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                  ✓ 이메일 인증이 완료되었습니다.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password-signup">비밀번호</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isEmailVerified}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">닉네임 (선택)</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={!isEmailVerified}
                />
              </div>
            </>
          )}
          <div className="flex justify-between gap-2">
            {isSignUp ? (
              <Button
                onClick={handleSignUpSubmit}
                disabled={loading || !isEmailVerified}
                className="flex-1"
              >
                {loading ? '처리 중...' : '회원가입'}
              </Button>
            ) : (
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1"
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              닫기
            </Button>
          </div>
          <div className="text-center text-sm">
            {isSignUp ? (
              <span>
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline"
                >
                  로그인
                </button>
              </span>
            ) : (
              <span>
                계정이 없으신가요?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline"
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
