import type { Metadata, Viewport } from 'next'
import { Jua, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import RegisterSw from '@/components/RegisterSw'

const jua = Jua({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-jua',
  display: 'swap',
})

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-kr',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '우리집 방문일지',
  description: '누가 언제 놀러왔는지 기록하는 곳',
  robots: { index: false, follow: false },
  // PWA (2026-09-09): 홈 화면 설치. 매니페스트는 app/manifest.ts
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '방문일지', statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#EA580C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${notoSansKr.variable}`}>
      <body className="bg-cream text-ink antialiased">
        {children}
        <RegisterSw />
      </body>
    </html>
  )
}
