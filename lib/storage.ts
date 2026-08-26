import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const ROOT = path.resolve(process.env.UPLOAD_DIR ?? './.devdata/uploads')
const MAX_EDGE = 1600

export function photoRelPath(now: Date, id: string): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}/${m}/${id}.webp`
}

/** 볼륨 밖으로 나가는 경로를 거부한다 */
export function assertSafeRelPath(relPath: string): void {
  if (path.isAbsolute(relPath)) throw new Error('잘못된 파일 경로입니다.')
  const resolved = path.resolve(ROOT, relPath)
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error('잘못된 파일 경로입니다.')
  }
}

/** 리사이즈 + EXIF 제거 + WebP 변환 후 저장 */
export async function savePhoto(buffer: Buffer) {
  const image = sharp(buffer, { failOn: 'error' }).rotate() // rotate()가 EXIF 방향을 반영하고 메타를 떨군다
  const resized = await image
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  const relPath = photoRelPath(new Date(), randomUUID())
  assertSafeRelPath(relPath)
  const abs = path.resolve(ROOT, relPath)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, resized.data)

  return {
    filePath: relPath,
    width: resized.info.width,
    height: resized.info.height,
    byteSize: resized.data.byteLength,
  }
}

export async function readPhoto(relPath: string): Promise<Buffer> {
  assertSafeRelPath(relPath)
  return readFile(path.resolve(ROOT, relPath))
}

export async function deletePhoto(relPath: string): Promise<void> {
  assertSafeRelPath(relPath)
  await unlink(path.resolve(ROOT, relPath)).catch(() => {})
}
