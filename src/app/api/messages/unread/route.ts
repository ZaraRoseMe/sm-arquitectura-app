// src/app/api/messages/unread/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unread = await prisma.message.groupBy({
    by: ['senderId'],
    where: { receiverId: session.user.id, read: false },
    _count: { id: true },
  })

  return NextResponse.json(unread)
}
