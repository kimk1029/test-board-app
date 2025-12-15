'use client'

import { useEffect } from 'react'
import Script from 'next/script'

type Props = {
  pId: string
}

const GoogleAdsense = ({ pId }: Props) => {
  // AdSense ID가 없으면 스크립트를 로드하지 않음
  if (!pId) {
    return null
  }

  useEffect(() => {
    // 전역 에러 핸들러로 AdSense 스크립트 로드 실패를 조용히 처리
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('adsbygoogle') || 
          event.filename?.includes('googlesyndication')) {
        // 광고 차단기로 인한 에러는 조용히 무시
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    window.addEventListener('error', handleError, true)
    return () => {
      window.removeEventListener('error', handleError, true)
    }
  }, [])

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${pId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onError={() => {
        // 에러는 전역 핸들러에서 처리
      }}
    />
  )
}

export default GoogleAdsense

