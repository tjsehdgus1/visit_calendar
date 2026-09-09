/* 우리집 방문일지 PWA 서비스워커 — 설치 가능 요건 충족 + 정적 자원 캐시
   로그인이 필요한 앱이라 페이지·API·인증 요청은 항상 네트워크로 보내고,
   해시가 붙은 정적 자원(/_next/static)과 아이콘·매니페스트만 캐시한다. 오프라인 화면은 두지 않는다. */
const CACHE = 'visit-static-v1'
const STATIC_PREFIXES = ['/_next/static/', '/icon-', '/apple-touch-icon.png', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (!STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) return // 페이지·API는 네트워크 직행

  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(req, clone))
          }
          return res
        }),
    ),
  )
})
