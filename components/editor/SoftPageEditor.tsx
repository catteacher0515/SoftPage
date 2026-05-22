'use client'

import { useEditorState } from './use-editor-state'

export function SoftPageEditor() {
  const {
    activeTextBlock,
    typography,
    updateTextBlock,
    updateTypographyFieldFromInput,
  } = useEditorState()
  const paragraphs = (activeTextBlock?.value ?? '').split('\n')

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: '280px minmax(0, 1fr)',
        minHeight: '100vh',
      }}
    >
      <aside style={{ padding: 16, display: 'grid', gap: 12 }}>
        <label>
          正文
          <textarea
            aria-label="正文"
            value={activeTextBlock?.value ?? ''}
            onChange={(event) => updateTextBlock(event.target.value)}
            style={{ display: 'block', width: '100%', minHeight: 160 }}
          />
        </label>
        <label>
          fontSize
          <input
            aria-label="fontSize"
            type="number"
            value={typography.fontSize}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'fontSize',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
        <label>
          lineHeight
          <input
            aria-label="lineHeight"
            type="number"
            step="0.1"
            value={typography.lineHeight}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'lineHeight',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
        <label>
          fontWeight
          <input
            aria-label="fontWeight"
            type="number"
            value={typography.fontWeight}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'fontWeight',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
        <label>
          paragraphSpacing
          <input
            aria-label="paragraphSpacing"
            type="number"
            value={typography.paragraphSpacing}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'paragraphSpacing',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
        <label>
          pagePadding
          <input
            aria-label="pagePadding"
            type="number"
            value={typography.pagePadding}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'pagePadding',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
      </aside>
      <section style={{ padding: typography.pagePadding }}>
        <article
          style={{
            fontSize: typography.fontSize,
            lineHeight: typography.lineHeight,
            fontWeight: typography.fontWeight,
          }}
        >
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph}`}
              style={{
                margin: 0,
                marginBottom:
                  index === paragraphs.length - 1 ? 0 : typography.paragraphSpacing,
              }}
            >
              {paragraph === '' ? '\u00a0' : paragraph}
            </p>
          ))}
        </article>
      </section>
    </main>
  )
}
