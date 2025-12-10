import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KH플레이그라운드',
  description: '게시판 및 게임 애플리케이션',
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

