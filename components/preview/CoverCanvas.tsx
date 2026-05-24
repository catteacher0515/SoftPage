type CoverCanvasProps = {
  title: string
  author: string
  heroImageSrc: string | null
  heroImageAlt: string
  hasDivider: boolean
}

export function CoverCanvas({
  title,
  author,
  heroImageSrc,
  heroImageAlt,
  hasDivider,
}: CoverCanvasProps) {
  return (
    <article
      style={{
        aspectRatio: '9 / 16',
        width: '100%',
        maxWidth: 360,
        borderRadius: 28,
        background: '#ffffff',
        padding: '28px 28px 0',
        display: 'grid',
        gridTemplateRows: '8% 46% 23% 7% 16%',
        boxShadow: '0 18px 48px rgba(31, 22, 15, 0.14)',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {heroImageSrc ? (
          <img
            alt={heroImageAlt}
            src={heroImageSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 20,
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 20,
              background: '#f4f4f2',
              border: '1px dashed #d8d4cc',
              color: '#7a7469',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            上传封面主图
          </div>
        )}
      </div>
      <div style={{ paddingTop: 22 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: '#1d1a16',
            fontFamily: 'var(--font-reading-stack)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {title || '请输入封面标题'}
        </h1>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 16,
          color: '#27211b',
          fontFamily: 'var(--font-reading-stack)',
        }}
      >
        <span>{`| 作者：${author}`}</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'end',
          paddingBottom: 20,
        }}
      >
        {hasDivider ? (
          <div
            data-testid="cover-divider"
            style={{
              width: '100%',
              height: 1,
              background: '#b9b2a8',
            }}
          />
        ) : null}
      </div>
    </article>
  )
}
