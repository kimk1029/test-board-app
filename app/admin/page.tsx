'use client'

import { useState, useEffect } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { RefreshCcw, Save, ShieldAlert } from 'lucide-react'

// 기본값
const DEFAULT_PRIZES = {
    A: 2,
    B: 3,
    C: 5,
    D: 10,
    E: 15,
    F: 20,
    G: 25
}

export default function AdminPage() {
    const [prizes, setPrizes] = useState<Record<string, number>>(DEFAULT_PRIZES)
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        // 간단한 어드민 체크 (실제로는 서버사이드에서 검증하거나 미들웨어 사용 권장)
        const userStr = localStorage.getItem('user')
        if (userStr) {
            const user = JSON.parse(userStr)
            if (user.userType === 1) {
                setIsAdmin(true)
            } else {
                window.location.href = '/'
            }
        } else {
            window.location.href = '/'
        }
    }, [])

    const handleReset = async () => {
        if (!confirm('정말로 쿠지 박스를 초기화하시겠습니까? 현재 진행 중인 박스는 종료됩니다.')) return

        setLoading(true)
        try {
            const res = await fetch('/api/admin/kuji/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prizes })
            })

            if (res.ok) {
                toast.success('쿠지 박스가 성공적으로 초기화되었습니다.')
            } else {
                toast.error('초기화 실패')
            }
        } catch (e) {
            console.error(e)
            toast.error('오류 발생')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (rank: string, val: string) => {
        const num = parseInt(val) || 0
        setPrizes(prev => ({ ...prev, [rank]: num }))
    }

    const totalTickets = Object.values(prizes).reduce((a, b) => a + b, 0)

    if (!isAdmin) return null

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-100">
            <HeaderNavigator />

            <main className="container mx-auto px-4 py-24">
                <div className="flex items-center gap-4 mb-8">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                    <div>
                        <h1 className="text-3xl font-black text-white">ADMIN DASHBOARD</h1>
                        <p className="text-slate-400">게임 설정 및 관리</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Kuji Configuration */}
                    <Card className="bg-[#18181b] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <RefreshCcw className="w-5 h-5 text-yellow-500" />
                                Ichiban Kuji Settings
                            </CardTitle>
                            <CardDescription>
                                각 등급별 티켓 수량을 설정하고 박스를 초기화합니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                {Object.keys(DEFAULT_PRIZES).map((rank) => (
                                    <div key={rank} className="space-y-2">
                                        <Label className="text-slate-300 font-bold">Rank {rank}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={prizes[rank]}
                                            onChange={(e) => handleChange(rank, e.target.value)}
                                            className="bg-black/40 border-white/10 text-white font-mono"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="bg-black/40 p-4 rounded-lg mb-6 border border-white/5 flex justify-between items-center">
                                <span className="text-slate-400">Total Tickets</span>
                                <span className="text-2xl font-black text-white">{totalTickets}</span>
                            </div>

                            <Button
                                onClick={handleReset}
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
                            >
                                {loading ? '초기화 중...' : '박스 초기화 및 적용 (RESET)'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Other Admin Features (Placeholder) */}
                    <Card className="bg-[#18181b] border-white/10 opacity-50 cursor-not-allowed">
                        <CardHeader>
                            <CardTitle className="text-white">User Management</CardTitle>
                            <CardDescription>준비 중입니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] flex items-center justify-center text-slate-500">
                            Coming Soon
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
