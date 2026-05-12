// src/app/api/presence/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET — devuelve IDs de usuarios conectados (lastSeen en los últimos 2 minutos)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

  const onlineUsers = await prisma.user.findMany({
    where: { lastSeen: { gte: twoMinutesAgo } },
    select: { id: true },
  })

  return NextResponse.json(onlineUsers.map(u => u.id))
}

// PATCH — actualiza lastSeen del usuario actual
export async function PATCH() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeen: new Date() },
  })

  return NextResponse.json({ ok: true })
}
