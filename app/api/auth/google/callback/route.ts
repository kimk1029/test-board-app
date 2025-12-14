import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

function getBaseUrl(request: NextRequest): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) return baseUrl
  
  // Fallback to request URL
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || request.nextUrl.host
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    const baseUrl = getBaseUrl(request)

    if (error) {
      const errorUrl = new URL('/', baseUrl)
      errorUrl.searchParams.set('error', '구글 로그인이 취소되었습니다.')
      return NextResponse.redirect(errorUrl)
    }

    if (!code) {
      const errorUrl = new URL('/', baseUrl)
      errorUrl.searchParams.set('error', '인증 코드가 없습니다.')
      return NextResponse.redirect(errorUrl)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials missing:', { hasClientId: !!clientId, hasClientSecret: !!clientSecret })
      const errorUrl = new URL('/', baseUrl)
      errorUrl.searchParams.set('error', '구글 OAuth 설정이 완료되지 않았습니다.')
      return NextResponse.redirect(errorUrl)
    }

    // 1. 액세스 토큰 교환
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(new URL('/?error=토큰 교환에 실패했습니다.', request.url))
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 2. 사용자 정보 가져오기
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json().catch(() => ({}))
      console.error('User info fetch error:', errorData)
      const errorUrl = new URL('/', baseUrl)
      errorUrl.searchParams.set('error', '사용자 정보를 가져오는데 실패했습니다.')
      return NextResponse.redirect(errorUrl)
    }

    const googleUser = await userInfoResponse.json()
    const { email, name, picture } = googleUser

    if (!email) {
      console.error('No email in Google user info:', googleUser)
      const errorUrl = new URL('/', baseUrl)
      errorUrl.searchParams.set('error', '이메일 정보를 가져올 수 없습니다.')
      return NextResponse.redirect(errorUrl)
    }

    // 3. 기존 사용자 확인 또는 생성
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // 새 사용자 생성 (구글 로그인은 비밀번호 없음)
      // 닉네임은 구글 이름 또는 이메일 앞부분 사용
      const nickname = name || email.split('@')[0]
      
      user = await prisma.user.create({
        data: {
          email,
          password: '', // 구글 로그인은 비밀번호 없음
          nickname,
          points: 100, // 신규 가입 보너스
        },
      })
    }

    // 4. JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 5. 로그인 보너스 (하루에 한 번)
    let loginBonus = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (!user.lastLoginDate || new Date(user.lastLoginDate) < today) {
      loginBonus = 10
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: loginBonus },
          lastLoginDate: new Date(),
        },
      })
    }

    // 6. 리다이렉트 (토큰을 쿠키나 URL 파라미터로 전달)
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('token', token)
    redirectUrl.searchParams.set('user', JSON.stringify({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      points: user.points + loginBonus,
      level: user.level,
      userType: user.userType,
    }))
    
    if (loginBonus > 0) {
      redirectUrl.searchParams.set('loginBonus', loginBonus.toString())
    }

    const response = NextResponse.redirect(redirectUrl)
    
    // 쿠키에도 토큰 저장
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const baseUrl = getBaseUrl(request)
    const errorUrl = new URL('/', baseUrl)
    errorUrl.searchParams.set('error', `구글 로그인 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    return NextResponse.redirect(errorUrl)
  }
}
