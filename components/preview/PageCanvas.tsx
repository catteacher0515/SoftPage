import { type RefCallback } from 'react'
import type { TypographyConfig } from '../editor/types'
import { PAGE_ASPECT_RATIO, PAGE_HEADER_HEIGHT, PAGE_MAX_WIDTH } from './constants'
import type { PaginatedPage } from './pagination'

type PageCanvasProps = {
  pages: PaginatedPage[]
  typography: TypographyConfig
  onPageRef?: (pageId: string, element: HTMLElement | null) => void
}

export function PageCanvas({ pages, typography, onPageRef }: PageCanvasProps) {
  const createPageRef =
    (pageId: string): RefCallback<HTMLElement> =>
    (element) => {
      onPageRef?.(pageId, element)
    }

  return (
    <div
      style={{
        display: 'grid',
        gap: 28,
        justifyItems: 'center',
      }}
    >
      {pages.map((page, index) => (
        <article
          key={page.id}
          ref={createPageRef(page.id)}
          data-preview-page={page.id}
          style={{
            width: `min(100%, ${PAGE_MAX_WIDTH}px)`,
            aspectRatio: '3 / 4',
            background: '#F6F1E8',
            padding: typography.pagePadding,
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'grid',
            alignContent: 'start',
            justifyItems: 'start',
            color: '#111',
            boxShadow: '0 24px 70px rgba(17, 11, 6, 0.26)',
            border: '1px solid rgba(17, 17, 17, 0.08)',
            borderRadius: 10,
            fontSize: typography.fontSize,
            lineHeight: typography.lineHeight,
            fontWeight: typography.fontWeight,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              minHeight: PAGE_HEADER_HEIGHT,
              marginBottom: 18,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(35, 28, 22, 0.54)',
            }}
          >
            <span>SoftPage Draft</span>
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
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
                    maxWidth: '100%',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
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
