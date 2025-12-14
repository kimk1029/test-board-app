import { NextRequest, NextResponse } from 'next/server'

function getBaseUrl(request: NextRequest): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) return baseUrl
  
  // Fallback to request URL
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || request.nextUrl.host
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl = getBaseUrl(request)
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not set')
    return NextResponse.json(
      { error: 'Google OAuth가 설정되지 않았습니다. GOOGLE_CLIENT_ID 환경 변수를 확인해주세요.' },
      { status: 500 }
    )
  }

  const scope = 'openid email profile'
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`

  console.log('Google OAuth redirect:', { clientId: clientId.substring(0, 20) + '...', redirectUri })
  
  return NextResponse.redirect(authUrl)
}
