import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 게시판 관리 - 게시글 목록 조회
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({ posts }, { status: 200 })
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 게시판 관리 - 게시글 삭제
export async function DELETE(request: NextRequest) {
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
    const { postId, postIds } = body

    // 단일 삭제 또는 다중 삭제 지원
    const idsToDelete = postIds || (postId ? [postId] : [])

    if (!idsToDelete || idsToDelete.length === 0) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 여러 게시글 일괄 삭제
    await prisma.post.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    })

    return NextResponse.json(
      { message: `${idsToDelete.length}개의 게시글이 삭제되었습니다.` },
      { status: 200 }
    )
  } catch (error) {
    console.error('게시글 삭제 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

