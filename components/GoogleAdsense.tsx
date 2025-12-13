import Script from 'next/script'

type Props = {
  pId: string
}

const GoogleAdsense = ({ pId }: Props) => {
  // 개발 환경에서는 광고 스크립트를 로드하지 않음 (선택 사항)
  // if (process.env.NODE_ENV !== 'production') {
  //   return null
  // }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${pId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}

export default GoogleAdsense

