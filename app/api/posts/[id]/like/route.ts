import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const postId = parseInt(idParam)
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.userId

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    })

    const LIKE_REWARD = 1

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({
          where: {
            userId_postId: {
              userId,
              postId,
            },
          },
        }),
        // Decrement author's points
        prisma.user.update({
          where: { id: post.authorId },
          data: { points: { decrement: LIKE_REWARD } },
        }),
        // Log the deduction (optional, but good for tracking)
        prisma.gameLog.create({
          data: {
            userId: post.authorId,
            gameType: 'community',
            betAmount: 0,
            payout: 0,
            profit: -LIKE_REWARD,
            result: 'LIKE_CANCELLED',
            metadata: { type: 'like_cancelled', postId, likerId: userId }
          }
        })
      ])

      return NextResponse.json({ liked: false }, { status: 200 })
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            postId,
          },
        }),
        // Increment author's points
        prisma.user.update({
          where: { id: post.authorId },
          data: { points: { increment: LIKE_REWARD } },
        }),
        // Log the reward
        prisma.gameLog.create({
          data: {
            userId: post.authorId,
            gameType: 'community',
            betAmount: 0,
            payout: LIKE_REWARD,
            profit: LIKE_REWARD,
            result: 'LIKE_RECEIVED',
            metadata: { type: 'like_received', postId, likerId: userId }
          }
        })
      ])

      return NextResponse.json({ liked: true }, { status: 200 })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

