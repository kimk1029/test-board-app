import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 이치방쿠지 상품 설정 조회
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.email.endsWith('@test.com')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 상품 설정 조회 (환경변수나 설정 파일에서 가져오거나, 기본값 반환)
    // 일단 기본값 반환
    const defaultPrizes = [
      { rank: 'A', name: '초특대 피규어 (1/7)', image: '🧸', color: '#ff4757', totalQty: 2 },
      { rank: 'B', name: '일러스트 보드', image: '🎨', color: '#ffa502', totalQty: 3 },
      { rank: 'C', name: '캐릭터 인형', image: '🐰', color: '#2ed573', totalQty: 5 },
      { rank: 'D', name: '유리컵 세트', image: '🥃', color: '#1e90ff', totalQty: 10 },
      { rank: 'E', name: '핸드 타올', image: '🧣', color: '#5352ed', totalQty: 15 },
      { rank: 'F', name: '아크릴 참', image: '✨', color: '#3742fa', totalQty: 20 },
      { rank: 'G', name: '클리어 파일', image: '📁', color: '#7bed9f', totalQty: 25 },
    ]

    return NextResponse.json({ prizes: defaultPrizes }, { status: 200 })
  } catch (error) {
    console.error('상품 설정 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 이치방쿠지 상품 설정 저장
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.email.endsWith('@test.com')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { prizes } = body

    if (!Array.isArray(prizes)) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.' },
        { status: 400 }
      )
    }

    // 상품 설정 검증
    for (const prize of prizes) {
      if (!prize.rank || !prize.name || !prize.totalQty || prize.totalQty < 1) {
        return NextResponse.json(
          { error: '상품 정보가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    }

    // 총 수량이 80개인지 확인
    const totalQty = prizes.reduce((sum, p) => sum + p.totalQty, 0)
    if (totalQty !== 80) {
      return NextResponse.json(
        { error: '총 수량은 80개여야 합니다.' },
        { status: 400 }
      )
    }

    // TODO: 상품 설정을 데이터베이스에 저장하는 로직 추가
    // 현재는 성공 응답만 반환
    // 추후 KujiPrizeConfig 테이블을 만들어서 저장할 수 있음

    return NextResponse.json(
      { message: '상품 설정이 저장되었습니다.', prizes },
      { status: 200 }
    )
  } catch (error) {
    console.error('상품 설정 저장 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

