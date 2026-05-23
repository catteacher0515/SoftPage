'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { parseMarkdownDocument } from './markdown'
import { exportPagesAsPng } from '../export/export-pages'
import { PageCanvas } from '../preview/PageCanvas'
import {
  PAGE_ASPECT_RATIO,
  PAGE_BOTTOM_SAFE_SPACE,
  PAGE_MAX_WIDTH,
} from '../preview/constants'
import { paginateSegments, type MeasuredSegment } from '../preview/pagination'
import { useEditorState } from './use-editor-state'

const MAX_MARKDOWN_SIZE_BYTES = 2 * 1024 * 1024
const MAX_ASSET_SIZE_BYTES = 8 * 1024 * 1024
const ACCEPTED_MARKDOWN_TYPES = new Set([
  'text/markdown',
  'text/plain',
  'application/octet-stream',
  '',
])
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function SoftPageEditor() {
  const {
    clearUploadError,
    blocks,
    clearSourceError,
    replaceBlocks,
    setSourceStatusError,
    setUploadStatusError,
    sourceError,
    sourceName,
    uploadError,
    typography,
    updateTypographyFieldFromInput,
  } = useEditorState()
  const measureRootRef = useRef<HTMLDivElement | null>(null)
  const pageElementsRef = useRef(new Map<string, HTMLElement>())
  const [measuredSegments, setMeasuredSegments] = useState<MeasuredSegment[]>([])
  const [previewWidth, setPreviewWidth] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [missingAssets, setMissingAssets] = useState<string[]>([])

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
              kind:
                block.type === 'image'
                  ? 'image'
                  : block.type === 'table'
                    ? 'table'
                    : block.type === 'missing-image'
                      ? 'missing-image'
                      : block.type === 'divider'
                        ? 'divider'
                      : 'paragraph',
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
        ? pageWidth * PAGE_ASPECT_RATIO - typography.pagePadding * 2 - PAGE_BOTTOM_SAFE_SPACE
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

  const handleMarkdownImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) return

    clearUploadError()
    clearSourceError()
    setExportError(null)
    setMissingAssets([])

    const markdownFile = files.find((file) => isMarkdownFile(file))

    if (!markdownFile) {
      setSourceStatusError('请至少选择一个 Markdown 文件。')
      event.target.value = ''
      return
    }

    if (markdownFile.size > MAX_MARKDOWN_SIZE_BYTES) {
      setSourceStatusError('Markdown 文件不能超过 2MB。')
      event.target.value = ''
      return
    }

    try {
      const markdown = await markdownFile.text()
      const assetFiles = files.filter((file) => file !== markdownFile)
      const assetEntries = await Promise.all(
        assetFiles.map(async (file) => {
          if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            throw new Error(`只支持 JPEG、PNG、WebP 和 GIF 图片：${file.name}`)
          }

          if (file.size > MAX_ASSET_SIZE_BYTES) {
            throw new Error(`图片不能超过 8MB：${file.name}`)
          }

          const relativePath = getRelativePathFromFile(file)

          return [relativePath, await readFileAsDataUrl(file)] as const
        }),
      )
      const assetMap = Object.fromEntries(assetEntries)
      const parsed = parseMarkdownDocument(markdown, assetMap)

      replaceBlocks(parsed.blocks, markdownFile.name)
      setMissingAssets(parsed.missingAssetPaths)

      if (parsed.missingAssetPaths.length > 0) {
        setUploadStatusError(
          `有 ${parsed.missingAssetPaths.length} 张图片未匹配到本地附件。`,
        )
      }
    } catch (error) {
      setSourceStatusError(
        error instanceof Error ? error.message : 'Markdown 导入失败，请重试。',
      )
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
            <p className="panel-eyebrow">内容来源</p>
            <h2>原稿导入</h2>
          </div>
          <label className="upload-field">
            <span className="upload-copy">导入 Markdown 和附件</span>
            <span className="upload-hint">
              选择一个 `.md` 文件，可同时附带同目录图片附件。
            </span>
            <input
              aria-label="导入 Markdown"
              type="file"
              multiple
              accept=".md,text/markdown,text/plain,image/jpeg,image/png,image/webp,image/gif"
              disabled={isExporting}
              onChange={(event) => {
                void handleMarkdownImport(event)
              }}
            />
          </label>
          <div className="source-summary">
            <p className="source-summary__label">当前原稿</p>
            <p className="source-summary__value">{sourceName}</p>
          </div>
          <div className="source-summary">
            <p className="source-summary__label">内容块</p>
            <p className="source-summary__value">{blocks.length} 个</p>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">内容结构</p>
            <h2>解析结果</h2>
          </div>
          <div className="content-outline">
            {blocks.map((block, index) => (
              <div key={block.id} className="content-outline__item">
                <span className="content-outline__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="content-outline__text">
                  {block.type === 'image'
                    ? `图片 · ${block.alt || '未命名图片'}`
                    : block.type === 'missing-image'
                      ? `缺图 · ${block.path}`
                      : block.type === 'divider'
                        ? '分割线'
                      : block.type === 'table'
                        ? `表格 · ${block.rows.length} 行`
                        : block.value.slice(0, 28) || '空白段落'}
                </span>
              </div>
            ))}
          </div>
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
        {sourceError ? <p role="alert" className="status-banner status-banner-danger">{sourceError}</p> : null}
        {exportError ? <p role="alert" className="status-banner status-banner-danger">{exportError}</p> : null}
        {missingAssets.length > 0 ? (
          <p role="status" className="status-banner">
            未匹配附件：{missingAssets.join('，')}
          </p>
        ) : null}
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
              <p className="empty-state__copy">先导入 Markdown 原稿，右侧会自动生成分页画布。</p>
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
              fontFamily: 'var(--font-body-stack)',
              textRendering: 'optimizeLegibility',
              fontFeatureSettings: '"liga" 1, "kern" 1',
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
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      width: '100%',
                      height: 'auto',
                      borderRadius: 6,
                    }}
                  />,
                ]
              }

              if (block.type === 'missing-image') {
                return [
                  <div
                    key={block.id}
                    data-measure-segment
                    data-segment-id={`${block.id}-missing-image`}
                    data-block-id={block.id}
                    data-segment-text={block.path}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px dashed rgba(157, 61, 48, 0.45)',
                      background: 'rgba(157, 61, 48, 0.08)',
                      color: '#8f382c',
                      fontFamily: 'var(--font-ui-stack)',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 6 }}>图片缺失</strong>
                    <span style={{ overflowWrap: 'anywhere' }}>{block.path}</span>
                  </div>,
                ]
              }

              if (block.type === 'table') {
                return [
                  <div
                    key={block.id}
                    data-measure-segment
                    data-segment-id={`${block.id}-table`}
                    data-block-id={block.id}
                    data-segment-text={`表格 ${block.rows.length} 行`}
                    style={{
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
                        {block.rows.map((row, rowIndex) => (
                          <tr key={`${block.id}-row-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${block.id}-cell-${rowIndex}-${cellIndex}`}
                                style={{
                                  borderBottom:
                                    rowIndex === block.rows.length - 1
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
                  </div>,
                ]
              }

              if (block.type === 'divider') {
                return [
                  <div
                    key={block.id}
                    data-measure-segment
                    data-segment-id={`${block.id}-divider`}
                    data-block-id={block.id}
                    data-segment-text="divider"
                    style={{
                      height: 1,
                      background: 'rgba(35, 28, 22, 0.22)',
                      margin: '10px 0 12px',
                    }}
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
                  style={{
                    margin: 0,
                    maxWidth: '100%',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
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

function isMarkdownFile(file: File) {
  return file.name.toLowerCase().endsWith('.md') || ACCEPTED_MARKDOWN_TYPES.has(file.type)
}

function getRelativePathFromFile(file: File) {
  const pathLike = 'webkitRelativePath' in file ? file.webkitRelativePath : ''

  return typeof pathLike === 'string' && pathLike !== '' ? pathLike : file.name
}
