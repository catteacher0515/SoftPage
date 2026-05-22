import type { TypographyConfig } from '../editor/types'
import type { PaginatedPage } from './pagination'

type PageCanvasProps = {
  pages: PaginatedPage[]
  typography: TypographyConfig
}

export function PageCanvas({ pages, typography }: PageCanvasProps) {
  return (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
      {pages.map((page) => (
        <article
          key={page.id}
          style={{
            width: 'min(100%, 360px)',
            aspectRatio: '3 / 4',
            background: '#F6F1E8',
            padding: typography.pagePadding,
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'grid',
            alignContent: 'start',
            justifyItems: 'start',
            color: '#111',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(17, 17, 17, 0.08)',
            fontSize: typography.fontSize,
            lineHeight: typography.lineHeight,
            fontWeight: typography.fontWeight,
          }}
        >
          <div style={{ display: 'grid', gap: typography.paragraphSpacing, width: '100%' }}>
            {page.segments.map((segment) => {
              if (segment.kind === 'image') {
                const imageBlock = segment.block as Extract<typeof segment.block, { type: 'image' }>

                return (
                  <img
                    key={segment.id}
                    src={imageBlock.src}
                    alt={imageBlock.alt}
                    style={{ display: 'block', maxWidth: '100%', width: '100%', height: 'auto' }}
                  />
                )
              }

              return (
                <p
                  key={segment.id}
                  style={{
                    margin: 0,
                  }}
                >
                  {segment.text}
                </p>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}
