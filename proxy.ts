import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // API 라우트는 별도로 처리하므로 여기서는 페이지 라우트만 처리
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}

