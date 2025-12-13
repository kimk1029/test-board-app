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
interface PrizeConfig {
    rank: string;
    name: string;
    qty: number;
    color: string;
}

const DEFAULT_PRIZE_CONFIG: PrizeConfig[] = [
    { rank: 'A', name: '초특대 피규어 (1/7)', qty: 2, color: '#ff4757' },
    { rank: 'B', name: '일러스트 보드', qty: 3, color: '#ffa502' },
    { rank: 'C', name: '캐릭터 인형', qty: 5, color: '#2ed573' },
    { rank: 'D', name: '유리컵 세트', qty: 10, color: '#1e90ff' },
    { rank: 'E', name: '핸드 타올', qty: 15, color: '#5352ed' },
    { rank: 'F', name: '아크릴 참', qty: 20, color: '#3742fa' },
    { rank: 'G', name: '클리어 파일', qty: 25, color: '#7bed9f' },
    { rank: 'LAST_ONE', name: '라스트원 스페셜 Ver.', qty: 1, color: '#000000' } // LAST_ONE 추가 (qty는 1 고정 권장)
]

export default function AdminPage() {
    const [prizes, setPrizes] = useState<PrizeConfig[]>(DEFAULT_PRIZE_CONFIG)
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

    const handleChange = (rank: string, field: keyof PrizeConfig, val: string) => {
        setPrizes(prev => prev.map(p => {
            if (p.rank === rank) {
                if (field === 'qty') {
                    return { ...p, qty: parseInt(val) || 0 }
                }
                return { ...p, [field]: val }
            }
            return p
        }))
    }

    // LAST_ONE 제외한 티켓 총합 (LAST_ONE은 별도)
    const totalTickets = prizes.filter(p => p.rank !== 'LAST_ONE').reduce((a, b) => a + b.qty, 0)

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
                    <Card className="bg-[#18181b] border-white/10 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <RefreshCcw className="w-5 h-5 text-yellow-500" />
                                Ichiban Kuji Settings
                            </CardTitle>
                            <CardDescription>
                                각 등급별 상품명과 티켓 수량을 설정하고 박스를 초기화합니다. (LAST_ONE은 수량 1개 고정)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 mb-6">
                                {prizes.map((prize) => (
                                    <div key={prize.rank} className="flex flex-col sm:flex-row gap-4 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                                        <div className="w-12 h-12 rounded flex items-center justify-center font-black text-lg text-white shrink-0" style={{ backgroundColor: prize.color }}>
                                            {prize.rank}
                                        </div>

                                        <div className="flex-1 w-full">
                                            <Label className="text-xs text-slate-400 mb-1 block">Product Name</Label>
                                            <Input
                                                type="text"
                                                value={prize.name}
                                                onChange={(e) => handleChange(prize.rank, 'name', e.target.value)}
                                                className="bg-black/40 border-white/10 text-white"
                                                placeholder="상품명 입력"
                                            />
                                        </div>

                                        <div className="w-full sm:w-32">
                                            <Label className="text-xs text-slate-400 mb-1 block">Quantity</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={prize.qty}
                                                onChange={(e) => handleChange(prize.rank, 'qty', e.target.value)}
                                                className="bg-black/40 border-white/10 text-white font-mono"
                                                disabled={prize.rank === 'LAST_ONE'} // LAST_ONE 수량 고정
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-black/40 p-4 rounded-lg mb-6 border border-white/5 flex justify-between items-center">
                                <span className="text-slate-400">Total Playable Tickets</span>
                                <span className="text-2xl font-black text-white">{totalTickets}</span>
                            </div>

                            <Button
                                onClick={handleReset}
                                disabled={loading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
                            >
                                {loading ? '초기화 중...' : '설정 저장 및 박스 초기화 (RESET)'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
