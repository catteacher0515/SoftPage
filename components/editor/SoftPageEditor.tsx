'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { exportPagesAsPng } from '../export/export-pages'
import { PageCanvas } from '../preview/PageCanvas'
import {
  PAGE_ASPECT_RATIO,
  PAGE_HEADER_HEIGHT,
  PAGE_MAX_WIDTH,
} from '../preview/constants'
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
    const pageWidth = previewWidth > 0 ? Math.min(previewWidth, PAGE_MAX_WIDTH) : 0
    const availableHeight =
      pageWidth > 0
        ? pageWidth * PAGE_ASPECT_RATIO - typography.pagePadding * 2 - PAGE_HEADER_HEIGHT - 18
        : 0

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

  const pageCount = pages.length
  const exportButtonLabel = isExporting ? '打包中…' : '导出 ZIP'

  return (
    <main className="workspace-shell">
      <aside className="control-rail">
        <div className="brand-lockup">
          <p className="brand-kicker">Editorial Canvas</p>
          <h1>SoftPage</h1>
          <p className="brand-copy">
            把一篇稿子整理成适合发布的 3:4 图文页面。
          </p>
        </div>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">文字设置</p>
            <h2>正文编辑</h2>
          </div>
          <label className="field-stack">
            <span className="field-label">正文</span>
            <textarea
              aria-label="正文"
              value={activeTextBlock?.value ?? ''}
              onChange={(event) => updateTextBlock(event.target.value)}
              disabled={isExporting}
              className="editor-textarea"
            />
          </label>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">内容素材</p>
            <h2>图片插入</h2>
          </div>
          <label className="upload-field">
            <span className="upload-copy">插入图片</span>
            <span className="upload-hint">JPEG / PNG / WebP / GIF，8MB 以内</span>
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
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">页面设置</p>
            <h2>版式参数</h2>
          </div>
          <div className="field-grid">
            <label className="field-stack">
              <span className="field-label">字号</span>
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
            <label className="field-stack">
              <span className="field-label">行高</span>
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
            <label className="field-stack">
              <span className="field-label">字重</span>
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
            <label className="field-stack">
              <span className="field-label">段距</span>
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
            <label className="field-stack field-full">
              <span className="field-label">页边距</span>
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
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">导出</p>
            <h2>成品输出</h2>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => void handleExportPages()}
            disabled={isExporting}
          >
            {exportButtonLabel}
          </button>
          <p className="export-note">按页生成 PNG，并打包成一个 ZIP 下载。</p>
        </section>

        {uploadError ? <p role="alert" className="status-banner status-banner-danger">{uploadError}</p> : null}
        {exportError ? <p role="alert" className="status-banner status-banner-danger">{exportError}</p> : null}
      </aside>

      <section className="preview-stage">
        <header className="preview-stage__head">
          <div>
            <p className="panel-eyebrow">内容预览</p>
            <h2>3:4 页面舞台</h2>
          </div>
          <div className="preview-stage__meta">
            <span>{pageCount} 页</span>
            <span>{isExporting ? '导出锁定中' : '可继续编辑'}</span>
          </div>
        </header>

        <div className="preview-stage__canvas">
          {pages.length === 0 ? (
            <div className="empty-state" role="status">
              <p className="empty-state__title">暂无可预览内容</p>
              <p className="empty-state__copy">先输入正文或插入图片，右侧会自动生成分页画布。</p>
            </div>
          ) : (
            <PageCanvas pages={pages} typography={typography} onPageRef={handlePageRef} />
          )}
        </div>

        <div
          ref={measureRootRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -10000,
            top: 0,
            width: `min(100%, ${PAGE_MAX_WIDTH}px)`,
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
