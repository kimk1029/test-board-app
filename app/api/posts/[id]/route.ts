import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 게시글 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다.' },
        { status: 400 }
      )
    }

    const post = await prisma.post.findUnique({
      where: { id },
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

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        bbs_uid: post.id,
        title: post.title,
        author: post.author.nickname || post.author.email,
        authorId: post.authorId,
        creation_date: post.createdAt.toISOString(),
        contents: post.content,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('게시글 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 게시글 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다.' },
        { status: 400 }
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

    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 작성자 확인
    if (post.authorId !== payload.userId) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content: contents,
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

    return NextResponse.json(
      {
        bbs_uid: updatedPost.id,
        title: updatedPost.title,
        author: updatedPost.author.nickname || updatedPost.author.email,
        creation_date: updatedPost.createdAt.toISOString(),
        contents: updatedPost.content,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('게시글 수정 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 게시글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다.' },
        { status: 400 }
      )
    }

    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 작성자 확인
    if (post.authorId !== payload.userId) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: '게시글이 삭제되었습니다.' },
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
