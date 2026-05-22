'use client'

import type { ChangeEvent } from 'react'
import { useEditorState } from './use-editor-state'

export function SoftPageEditor() {
  const {
    activeTextBlock,
    activeTextBlockId,
    blocks,
    insertImageBlockAfterActiveTextBlock,
    selectTextBlock,
    typography,
    updateTextBlock,
    updateTypographyFieldFromInput,
  } = useEditorState()

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    const src = await readFileAsDataUrl(file)

    insertImageBlockAfterActiveTextBlock({
      src,
      alt: file.name,
    })

    event.target.value = ''
  }

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
          插入图片
          <input
            aria-label="插入图片"
            type="file"
            accept="image/*"
            onChange={(event) => {
              void handleImageUpload(event)
            }}
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
            display: 'grid',
            gap: typography.paragraphSpacing,
          }}
        >
          {blocks.map((block) => {
            if (block.type === 'image') {
              return (
                <img
                  key={block.id}
                  src={block.src}
                  alt={block.alt}
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              )
            }

            const paragraphs = block.value.split('\n')

            return (
              <div
                key={block.id}
                onClick={() => selectTextBlock(block.id)}
                style={{
                  outline:
                    block.id === activeTextBlockId ? '2px solid #111' : '2px solid transparent',
                  outlineOffset: 6,
                  cursor: 'text',
                }}
              >
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${block.id}-${index}-${paragraph}`}
                    style={{
                      margin: 0,
                      marginBottom:
                        index === paragraphs.length - 1 ? 0 : typography.paragraphSpacing,
                    }}
                  >
                    {paragraph === '' ? '\u00a0' : paragraph}
                  </p>
                ))}
              </div>
            )
          })}
        </article>
      </section>
    </main>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Failed to read image file as data URL.'))
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read image file.'))
    }

    reader.readAsDataURL(file)
  })
}
