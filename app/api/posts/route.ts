import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 게시글 목록 조회
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formattedPosts = posts.map((post) => ({
      bbs_uid: post.id,
      title: post.title,
      author: post.author.nickname || post.author.email,
      creation_date: post.createdAt.toISOString(),
      contents: post.content,
    }))

    return NextResponse.json(formattedPosts, { status: 200 })
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 게시글 작성
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

    const body = await request.json()
    const { title, contents } = body

    if (!title || !contents) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 게시글 작성
    const post = await prisma.post.create({
      data: {
        title,
        content: contents,
        authorId: payload.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    })

    // 게시글 작성 포인트 지급 (+10)
    const { calculateLevel } = await import('@/lib/points')
    const updatedPoints = user.points + 10
    const updatedLevel = calculateLevel(updatedPoints)

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        points: updatedPoints,
        level: updatedLevel,
      },
    })

    return NextResponse.json(
      {
        bbs_uid: post.id,
        title: post.title,
        author: post.author.nickname || post.author.email,
        creation_date: post.createdAt.toISOString(),
        pointsEarned: 10,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('게시글 작성 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

