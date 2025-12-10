'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import LoginModal from './LoginModal'
import { getLevelProgress, getPointsForNextLevel, getPointsForCurrentLevel } from '@/lib/points'
import { Menu, X, User as UserIcon, Gamepad2, LayoutDashboard, Crown, Bell } from 'lucide-react'

interface User {
  id: number
  email: string
  nickname?: string
  points?: number
  level?: number
}

let updateUserPoints: (() => void) | null = null

export const refreshUserPoints = () => {
  if (updateUserPoints) {
    updateUserPoints()
  }
}

const HeaderNavigator = () => {
  const pathname = usePathname()
  const [isVisibleLogin, setIsVisibleLogin] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const loadUserData = async () => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        
        if (token) {
          try {
            const response = await fetch('/api/user/me', {
              headers: { Authorization: `Bearer ${token}` },
            })
            
            if (response.ok) {
              const userData = await response.json()
              setUser(userData)
              localStorage.setItem('user', JSON.stringify(userData))
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error)
          }
        }
      } catch (e) {
        console.error('Failed to parse user data')
      }
    }
  }
  
  useEffect(() => {
    updateUserPoints = loadUserData
    return () => { updateUserPoints = null }
  }, [])
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  useEffect(() => {
    loadUserData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/'
  }

  const handleLoginSuccess = () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Failed to parse user data')
      }
    }
  }

  const level = user?.level || 1
  const points = user?.points || 0
  const progress = getLevelProgress(points, level)
  const nextLevelPoints = getPointsForNextLevel(level)
  const pointsNeeded = nextLevelPoints - points
  const isTestAccount = user?.email?.endsWith('@test.com') || false

  const navLinks = [
    { href: '/', label: 'HOME', icon: LayoutDashboard },
    { href: '/game', label: 'GAME LOBBY', icon: Gamepad2 },
    { href: '/board', label: 'BOARD', icon: Crown },
    { href: '/notice', label: 'NOTICE', icon: Bell },
  ]

  if (isTestAccount) {
    navLinks.push({ href: '/admin', label: 'ADMIN', icon: UserIcon })
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          isScrolled
            ? 'bg-black/80 backdrop-blur-md border-white/10 h-16'
            : 'bg-transparent border-transparent h-20'
        }`}
      >
        <div className="container mx-auto h-full flex items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(124,58,237,0.5)] group-hover:shadow-[0_0_25px_rgba(124,58,237,0.8)] transition-all">
              K
            </div>
            <span className="text-xl font-bold tracking-tighter text-white group-hover:text-violet-300 transition-colors">
              PLAYGROUND
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                  pathname === link.href
                    ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                    : 'text-slate-400 hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User & Mobile Toggle */}
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white rounded-full pl-3 pr-4 py-2 h-auto gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {level}
                    </div>
                    <span className="font-semibold text-sm max-w-[100px] truncate">
                      {user.nickname || user.email.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-[#0f1115] border-white/10 text-slate-200 backdrop-blur-xl">
                  <DropdownMenuLabel>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-bold">My Status</span>
                        <span className="text-xs text-violet-400 font-mono">LV.{level}</span>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">EXP</span>
                            <span className="text-white">{points.toLocaleString()} / {nextLevelPoints.toLocaleString()}</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-white/10" indicatorClassName="bg-gradient-to-r from-violet-600 to-indigo-600" />
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer font-bold flex items-center gap-2 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white">
                        <UserIcon className="w-4 h-4" />
                        MY PROFILE
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer font-bold"
                  >
                    LOGOUT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => setIsVisibleLogin(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all"
              >
                LOGIN
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button 
                className="md:hidden text-white p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-white/10 p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`text-lg font-bold py-2 px-4 rounded-lg flex items-center gap-3 ${
                            pathname === link.href
                                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <link.icon className="w-5 h-5" />
                        {link.label}
                    </Link>
                ))}
                {user && (
                    <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-lg font-bold py-2 px-4 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                        <UserIcon className="w-5 h-5" />
                        MY PROFILE
                    </Link>
                )}
            </div>
        )}
      </header>
      <LoginModal
        open={isVisibleLogin}
        onClose={() => setIsVisibleLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
}

export default HeaderNavigator
