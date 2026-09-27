import type { MetadataRoute } from 'next'

/** PWA 매니페스트 (/manifest.webmanifest). 약달력과 같은 구성: 홈 화면 설치 + standalone (2026-09-09) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '선소방문기록',
    short_name: '선소방문기록',
    description: '누가 언제 놀러왔는지 기록하는 곳',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#EA580C',
    background_color: '#FFF8F0',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
