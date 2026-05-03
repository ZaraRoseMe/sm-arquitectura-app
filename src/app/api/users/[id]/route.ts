// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const { name, email, role, password, color } = body

  const data: any = {
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role }),
    ...(color && { color }),
  }
  if (password) {
    data.password = await bcrypt.hash(password, 12)
  }

  const user = await prisma.user.update({ where: { id }, data })
  const { password: _, ...userWithoutPassword } = user
  return NextResponse.json(userWithoutPassword)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
