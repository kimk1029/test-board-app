'use client'

import { useEffect, useRef } from 'react'

type Props = {
  dataAdSlot: string
  dataAdFormat?: string
  dataFullWidthResponsive?: boolean
}

const AdBanner = ({
  dataAdSlot,
  dataAdFormat = 'auto',
  dataFullWidthResponsive = true,
}: Props) => {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      // 광고가 이미 로드되었는지 확인하는 로직이 필요할 수 있음
      // 여기서는 간단하게 푸시만 시도
      if (adRef.current && adRef.current.innerHTML === '') {
          // @ts-ignore
          if (window.adsbygoogle) {
            // @ts-ignore
            ;(window.adsbygoogle = window.adsbygoogle || []).push({})
          }
      }
    } catch (err: any) {
      // 광고 차단기로 인한 오류는 조용히 처리
      // 콘솔에 에러가 표시되지 않도록 함
      if (process.env.NODE_ENV === 'development') {
        console.debug('AdSense error (likely blocked by ad blocker):', err.message)
      }
    }
  }, [])

  return (
    <div className="my-4 text-center overflow-hidden w-full flex justify-center">
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', minWidth: '300px' }}
          data-ad-client={`ca-pub-${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
          data-ad-slot={dataAdSlot}
          data-ad-format={dataAdFormat}
          data-full-width-responsive={dataFullWidthResponsive.toString()}
        />
    </div>
  )
}

export default AdBanner

