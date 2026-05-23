import { type RefCallback } from 'react'
import type { TypographyConfig } from '../editor/types'
import { PAGE_ASPECT_RATIO, PAGE_MAX_WIDTH } from './constants'
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
      {pages.map((page) => (
        <article
          key={page.id}
          ref={createPageRef(page.id)}
          data-preview-page={page.id}
          style={{
            width: `min(100%, ${PAGE_MAX_WIDTH}px)`,
            aspectRatio: `${1 / PAGE_ASPECT_RATIO}`,
            background: '#FFFFFF',
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
            fontFamily: "var(--font-body-stack)",
            textRendering: 'optimizeLegibility',
            fontFeatureSettings: '"liga" 1, "kern" 1',
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

              if (segment.kind === 'missing-image') {
                const missingImageBlock = segment.block as Extract<
                  typeof segment.block,
                  { type: 'missing-image' }
                >

                return (
                  <div
                    key={segment.id}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px dashed rgba(157, 61, 48, 0.45)',
                      background: 'rgba(157, 61, 48, 0.08)',
                      color: '#8f382c',
                      fontFamily: 'var(--font-ui-stack)',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 6 }}>图片缺失</strong>
                    <span style={{ overflowWrap: 'anywhere' }}>{missingImageBlock.path}</span>
                  </div>
                )
              }

              if (segment.kind === 'table') {
                const tableBlock = segment.block as Extract<typeof segment.block, { type: 'table' }>

                return (
                  <div
                    key={segment.id}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(35, 28, 22, 0.12)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'rgba(255, 252, 247, 0.72)',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                        fontFamily: 'var(--font-ui-stack)',
                      }}
                    >
                      <tbody>
                        {tableBlock.rows.map((row, rowIndex) => (
                          <tr key={`${tableBlock.id}-row-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${tableBlock.id}-cell-${rowIndex}-${cellIndex}`}
                                style={{
                                  borderBottom:
                                    rowIndex === tableBlock.rows.length - 1
                                      ? 'none'
                                      : '1px solid rgba(35, 28, 22, 0.08)',
                                  borderRight:
                                    cellIndex === row.length - 1
                                      ? 'none'
                                      : '1px solid rgba(35, 28, 22, 0.08)',
                                  padding: '10px 12px',
                                  verticalAlign: 'top',
                                  overflowWrap: 'anywhere',
                                  fontWeight: rowIndex === 0 ? 600 : 500,
                                  lineHeight: 1.55,
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }

              if (segment.kind === 'divider') {
                return (
                  <div
                    key={segment.id}
                    style={{
                      width: '100%',
                      height: 1,
                      background: 'rgba(35, 28, 22, 0.22)',
                      margin: '10px 0 12px',
                    }}
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
                    whiteSpace: 'pre-wrap',
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
