// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const withUserId = searchParams.get('with')
  if (!withUserId) return NextResponse.json({ error: 'Missing with param' }, { status: 400 })

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: withUserId },
        { senderId: withUserId, receiverId: session.user.id },
      ],
    },
    include: { sender: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: 'asc' },
  })

  // Mark received messages as read
  await prisma.message.updateMany({
    where: { senderId: withUserId, receiverId: session.user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, receiverId } = await req.json()
  if (!content?.trim() || !receiverId) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      senderId: session.user.id,
      receiverId,
    },
    include: { sender: { select: { id: true, name: true, color: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
