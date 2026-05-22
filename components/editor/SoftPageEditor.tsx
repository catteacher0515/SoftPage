'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { BlockRenderer } from '../preview/BlockRenderer'
import { PageCanvas } from '../preview/PageCanvas'
import { paginateBlocks, type MeasuredBlock } from '../preview/pagination'
import { useEditorState } from './use-editor-state'

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function SoftPageEditor() {
  const {
    clearUploadError,
    activeTextBlock,
    activeTextBlockId,
    blocks,
    insertImageBlockAfterActiveTextBlock,
    setImageUploadError,
    selectTextBlock,
    uploadError,
    typography,
    updateTextBlock,
    updateTypographyFieldFromInput,
  } = useEditorState()
  const measureRootRef = useRef<HTMLDivElement | null>(null)
  const [measuredBlocks, setMeasuredBlocks] = useState<MeasuredBlock[]>([])
  const [previewWidth, setPreviewWidth] = useState(0)

  useEffect(() => {
    const measureRoot = measureRootRef.current

    if (!measureRoot) return

    const updateMeasurements = () => {
      const items = Array.from(
        measureRoot.querySelectorAll<HTMLElement>('[data-measure-block]'),
      ).map((element) => {
        const blockId = element.dataset.blockId ?? ''
        const block = blocks.find((currentBlock) => currentBlock.id === blockId)

        return block
          ? {
              id: block.id,
              block,
              height: element.getBoundingClientRect().height,
            }
          : null
      })

      setMeasuredBlocks(items.filter((item): item is MeasuredBlock => item !== null))
      setPreviewWidth(measureRoot.getBoundingClientRect().width)
    }

    updateMeasurements()

    const resizeObserver = new ResizeObserver(updateMeasurements)
    resizeObserver.observe(measureRoot)

    return () => {
      resizeObserver.disconnect()
    }
  }, [blocks, typography])

  const pages = useMemo(() => {
    const availableHeight = previewWidth > 0 ? (previewWidth * 4) / 3 - 64 : 0

    return availableHeight > 0
      ? paginateBlocks(measuredBlocks, availableHeight)
      : []
  }, [measuredBlocks, previewWidth])

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    clearUploadError()

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setImageUploadError('只支持 JPEG、PNG、WebP 和 GIF 图片。')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageUploadError('图片不能超过 8MB。')
      event.target.value = ''
      return
    }

    try {
      const src = await readFileAsDataUrl(file)

      insertImageBlockAfterActiveTextBlock({
        src,
        alt: file.name,
      })
    } catch {
      setImageUploadError('图片读取失败，请重试。')
    } finally {
      event.target.value = ''
    }
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
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              void handleImageUpload(event)
            }}
          />
        </label>
        {uploadError ? <p role="alert">{uploadError}</p> : null}
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
        <PageCanvas pages={pages} typography={typography} />
        <div
          ref={measureRootRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -10000,
            top: 0,
            width: 'min(100%, 360px)',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <article
            style={{
              fontSize: typography.fontSize,
              lineHeight: typography.lineHeight,
              fontWeight: typography.fontWeight,
              display: 'grid',
              gap: typography.paragraphSpacing,
              width: '100%',
            }}
          >
            {blocks.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                typography={typography}
                measure
                active={block.id === activeTextBlockId}
                onSelect={() => selectTextBlock(block.id)}
              />
            ))}
          </article>
        </div>
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
