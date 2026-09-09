'use client'

import { useEffect } from 'react'

/** PWA 서비스워커 등록. 실패해도 앱 동작에는 영향 없음 */
export default function RegisterSw() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
