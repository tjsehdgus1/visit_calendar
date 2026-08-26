import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readPhoto } from '@/lib/storage'
import { currentUser } from '@/lib/auth/guard'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const photo = await prisma.visitPhoto.findUnique({ where: { id } })
  if (!photo) return new NextResponse('Not Found', { status: 404 })

  try {
    const buffer = await readPhoto(photo.filePath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
