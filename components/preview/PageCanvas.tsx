import type { TypographyConfig } from '../editor/types'
import { BlockRenderer } from './BlockRenderer'
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
            padding: 32,
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
            {page.blocks.map(({ id, block }) => {
              return <BlockRenderer key={id} block={block} typography={typography} />
            })}
          </div>
        </article>
      ))}
    </div>
  )
}
