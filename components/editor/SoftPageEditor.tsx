'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { exportPagesAsPng } from '../export/export-pages'
import { PageCanvas } from '../preview/PageCanvas'
import { paginateSegments, type MeasuredSegment } from '../preview/pagination'
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
  const pageElementsRef = useRef(new Map<string, HTMLElement>())
  const [measuredSegments, setMeasuredSegments] = useState<MeasuredSegment[]>([])
  const [previewWidth, setPreviewWidth] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    const measureRoot = measureRootRef.current

    if (!measureRoot) return

    const updateMeasurements = () => {
      const items = Array.from(
        measureRoot.querySelectorAll<HTMLElement>('[data-measure-segment]'),
      ).map((element) => {
        const segmentId = element.dataset.segmentId ?? ''
        const blockId = element.dataset.blockId ?? ''
        const block = blocks.find((currentBlock) => currentBlock.id === blockId)

        return block
          ? {
              id: segmentId,
              blockId,
              block,
              kind: block.type === 'image' ? 'image' : 'paragraph',
              text: element.dataset.segmentText ?? '',
              height: element.getBoundingClientRect().height,
            }
          : null
      })

      const nextSegments = items.filter((item): item is MeasuredSegment => item !== null)

      setMeasuredSegments(nextSegments)
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
    const pageWidth = previewWidth > 0 ? Math.min(previewWidth, 360) : 0
    const availableHeight = pageWidth > 0 ? (pageWidth * 4) / 3 - typography.pagePadding * 2 : 0

    return availableHeight > 0
      ? paginateSegments(measuredSegments, availableHeight, typography.paragraphSpacing)
      : []
  }, [measuredSegments, previewWidth, typography.paragraphSpacing, typography.pagePadding])

  const handlePageRef = (pageId: string, element: HTMLElement | null) => {
    if (element) {
      pageElementsRef.current.set(pageId, element)
      return
    }

    pageElementsRef.current.delete(pageId)
  }

  const handleExportPages = async () => {
    if (isExporting) return

    setExportError(null)

    if (pages.length === 0) {
      setExportError('当前没有可导出的页面。')
      return
    }

    const pageElements = pages
      .map((page) => pageElementsRef.current.get(page.id))
      .filter((element): element is HTMLElement => element !== undefined)

    if (pageElements.length !== pages.length) {
      setExportError('预览页面还未准备完成，请稍后重试。')
      return
    }

    setIsExporting(true)

    try {
      await exportPagesAsPng(pageElements)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : '导出失败，请重试。',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    clearUploadError()
    setExportError(null)

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
            disabled={isExporting}
            style={{ display: 'block', width: '100%', minHeight: 160 }}
          />
        </label>
        <label>
          插入图片
          <input
            aria-label="插入图片"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isExporting}
            onChange={(event) => {
              void handleImageUpload(event)
            }}
          />
        </label>
        {uploadError ? <p role="alert">{uploadError}</p> : null}
        {exportError ? <p role="alert">{exportError}</p> : null}
        <label>
          fontSize
          <input
            aria-label="fontSize"
            type="number"
            value={typography.fontSize}
            disabled={isExporting}
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
            disabled={isExporting}
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
            disabled={isExporting}
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
            disabled={isExporting}
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
            disabled={isExporting}
            onChange={(event) =>
              updateTypographyFieldFromInput(
                'pagePadding',
                event.target.value === '' ? Number.NaN : Number(event.target.value),
              )
            }
          />
        </label>
        <button type="button" onClick={() => void handleExportPages()} disabled={isExporting}>
          {isExporting ? '导出中…' : '导出 PNG'}
        </button>
      </aside>
      <section style={{ padding: typography.pagePadding }}>
        {pages.length === 0 ? (
          <p role="status">暂无可预览内容，请先输入正文或插入图片。</p>
        ) : null}
        <PageCanvas pages={pages} typography={typography} onPageRef={handlePageRef} />
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
            {blocks.flatMap((block) => {
              if (block.type === 'image') {
                return [
                  <img
                    key={block.id}
                    data-measure-segment
                    data-segment-id={`${block.id}-image`}
                    data-block-id={block.id}
                    src={block.src}
                    alt={block.alt}
                    style={{ display: 'block', maxWidth: '100%', width: '100%', height: 'auto' }}
                  />,
                ]
              }

              const paragraphs = block.value.split('\n')

              return paragraphs.map((paragraph, index) => (
                <p
                  key={`${block.id}-${index}-${paragraph}`}
                  data-measure-segment
                  data-segment-id={`${block.id}-paragraph-${index}`}
                  data-block-id={block.id}
                  data-segment-text={paragraph === '' ? '\u00a0' : paragraph}
                  onClick={() => selectTextBlock(block.id)}
                  style={{
                    margin: 0,
                    marginBottom:
                      index === paragraphs.length - 1 ? 0 : typography.paragraphSpacing,
                    outline:
                      block.id === activeTextBlockId
                        ? '2px solid #111'
                        : '2px solid transparent',
                    outlineOffset: 6,
                    cursor: 'text',
                  }}
                >
                  {paragraph === '' ? '\u00a0' : paragraph}
                </p>
              ))
            })}
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
