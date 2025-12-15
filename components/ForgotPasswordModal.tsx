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

interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
}

const ForgotPasswordModal = ({ open, onClose }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    try {
      setError('')
      setLoading(true)
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '비밀번호 찾기 요청에 실패했습니다.')
        setLoading(false)
        return
      }

      setSuccess(true)
      
      // 개발 모드에서 토큰이 반환되면 알림 표시
      if (data.token) {
        alert(`개발 모드: 비밀번호 재설정 링크\n${data.resetUrl}`)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error during forgot password:', error)
      setError('요청 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setEmail('')
    setError('')
    setSuccess(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#0a0a0c]/95 border-white/10 backdrop-blur-xl text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">비밀번호 찾기</DialogTitle>
          <DialogDescription className="text-slate-400">
            등록하신 이메일로 비밀번호 재설정 링크를 보내드립니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-900/30 border border-red-500/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-emerald-900/30 border border-emerald-500/30 p-3 text-sm text-emerald-300">
                비밀번호 재설정 링크가 발송되었습니다. 이메일을 확인해주세요.
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
              >
                확인
              </Button>
            </div>
          ) : (
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
                    if (e.key === 'Enter') handleSubmit()
                  }}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || !email}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
              >
                {loading ? '전송 중...' : '재설정 링크 보내기'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ForgotPasswordModal

