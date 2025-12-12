import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🎰 잭팟 & 무한의 계단 | 미니게임 천국',
  description: '지금 접속하면 100포인트 무료! 실시간 랭킹 1위에 도전하세요.',
  icons: {
    icon: [
      { url: '/arcade-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/arcade-icon.svg',
  },
  openGraph: {
    title: '🎰 잭팟 & 무한의 계단 | 미니게임 천국',
    description: '지금 접속하면 100포인트 무료! 실시간 랭킹 1위에 도전하세요.',
    url: 'https://dopamine-ground.vercel.app',
    siteName: 'Dopamine Ground',
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Dopamine Ground Main Preview',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

