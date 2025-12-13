'use client'

import { useState, useEffect } from 'react'
import HeaderNavigator from '@/components/HeaderNavigator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { RefreshCcw, Save, ShieldAlert, History, Users, LayoutDashboard, Settings } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

    // History State
    const [history, setHistory] = useState<any[]>([])
    const [selectedBox, setSelectedBox] = useState<any>(null)
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)

    useEffect(() => {
        // 간단한 어드민 체크 (실제로는 서버사이드에서 검증하거나 미들웨어 사용 권장)
        const userStr = localStorage.getItem('user')
        if (userStr) {
            const user = JSON.parse(userStr)
            if (user.userType === 1) {
                setIsAdmin(true)
                fetchHistory() // Load history on init
            } else {
                window.location.href = '/'
            }
        } else {
            window.location.href = '/'
        }
    }, [])

    const fetchHistory = async () => {
        setIsHistoryLoading(true)
        try {
            const res = await fetch('/api/admin/kuji/history')
            if (res.ok) {
                const data = await res.json()
                setHistory(data.history || [])
            }
        } catch (e) {
            console.error("Failed to load history", e)
        } finally {
            setIsHistoryLoading(false)
        }
    }

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
                fetchHistory() // Refresh history after reset
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

                <Tabs defaultValue="kuji" className="w-full">
                    <TabsList className="bg-[#18181b] border border-white/10 mb-8">
                        <TabsTrigger value="kuji" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            Ichiban Kuji
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            User Management
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                            System Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="kuji">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Kuji Configuration */}
                            <Card className="bg-[#18181b] border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <RefreshCcw className="w-5 h-5 text-yellow-500" />
                                        Configuration
                                    </CardTitle>
                                    <CardDescription>
                                        각 등급별 상품명과 수량 설정 (LAST_ONE 1개 고정)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {prizes.map((prize) => (
                                            <div key={prize.rank} className="flex flex-col sm:flex-row gap-3 items-center bg-black/20 p-2 rounded-lg border border-white/5 text-sm">
                                                <div className="w-8 h-8 rounded flex items-center justify-center font-black text-sm text-white shrink-0" style={{ backgroundColor: prize.color }}>
                                                    {prize.rank}
                                                </div>

                                                <div className="flex-1 w-full">
                                                    <Input
                                                        type="text"
                                                        value={prize.name}
                                                        onChange={(e) => handleChange(prize.rank, 'name', e.target.value)}
                                                        className="bg-black/40 border-white/10 text-white h-8 text-xs"
                                                        placeholder="상품명"
                                                    />
                                                </div>

                                                <div className="w-full sm:w-20">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={prize.qty}
                                                        onChange={(e) => handleChange(prize.rank, 'qty', e.target.value)}
                                                        className="bg-black/40 border-white/10 text-white font-mono h-8 text-xs"
                                                        disabled={prize.rank === 'LAST_ONE'}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-black/40 p-3 rounded-lg mb-4 border border-white/5 flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Total Tickets</span>
                                        <span className="text-xl font-black text-white">{totalTickets}</span>
                                    </div>

                                    <Button
                                        onClick={handleReset}
                                        disabled={loading}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-sm"
                                    >
                                        {loading ? 'Processing...' : 'RESET BOX'}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Game History Section */}
                            <Card className="bg-[#18181b] border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <History className="w-5 h-5 text-indigo-500" />
                                        Game History
                                    </CardTitle>
                                    <CardDescription>
                                        종료된 게임 결과
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isHistoryLoading ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
                                    ) : history.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">No history found.</div>
                                    ) : (
                                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-white/10 hover:bg-white/5">
                                                        <TableHead className="text-slate-400 text-xs">Ended At</TableHead>
                                                        <TableHead className="text-slate-400 text-xs">ID</TableHead>
                                                        <TableHead className="text-right text-slate-400 text-xs">View</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {history.map((box) => (
                                                        <TableRow key={box.id} className="border-white/10 hover:bg-white/5">
                                                            <TableCell className="font-mono text-slate-300 text-xs">
                                                                {new Date(box.updatedAt).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-slate-300 text-xs">#{box.id}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-indigo-400 hover:text-indigo-300"
                                                                            onClick={() => setSelectedBox(box)}
                                                                        >
                                                                            <Users className="w-4 h-4" />
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="bg-[#18181b] border-white/10 text-slate-100 max-w-2xl max-h-[80vh] overflow-y-auto">
                                                                        <DialogHeader>
                                                                            <DialogTitle>Winner List (Box #{box.id})</DialogTitle>
                                                                            <DialogDescription>
                                                                                Total Sold: {box.totalSold}
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="border-white/10 hover:bg-white/5">
                                                                                    <TableHead className="text-slate-400 w-12 text-xs">Rank</TableHead>
                                                                                    <TableHead className="text-slate-400 text-xs">Prize</TableHead>
                                                                                    <TableHead className="text-slate-400 text-xs">User</TableHead>
                                                                                    <TableHead className="text-right text-slate-400 text-xs">Time</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {box.winners.map((winner: any, idx: number) => (
                                                                                    <TableRow key={idx} className="border-white/10 hover:bg-white/5">
                                                                                        <TableCell className="font-bold text-white">
                                                                                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
                                                                                                {winner.rank}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-slate-300 text-xs truncate max-w-[150px]">{winner.prizeName}</TableCell>
                                                                                        <TableCell className="font-medium text-indigo-400 text-xs">{winner.user}</TableCell>
                                                                                        <TableCell className="text-right font-mono text-slate-500 text-[10px]">
                                                                                            {new Date(winner.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                                {box.winners.length === 0 && (
                                                                                    <TableRow>
                                                                                        <TableCell colSpan={4} className="text-center py-4 text-slate-500 text-xs">
                                                                                            No winners.
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                )}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="bg-[#18181b] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">User Management</CardTitle>
                                <CardDescription>Manage user accounts and permissions.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-slate-500 text-center py-10">
                                Coming Soon...
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="bg-[#18181b] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">System Settings</CardTitle>
                                <CardDescription>Configure global system variables.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-slate-500 text-center py-10">
                                Coming Soon...
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
