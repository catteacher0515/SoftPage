'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  doesAssetPathMatchReference,
  extractLocalImageReferences,
  parseMarkdownDocument,
} from './markdown'
import { exportCoverAsPng } from '../export/export-cover'
import { exportCoverAndPagesAsPngZip, exportPagesAsPng } from '../export/export-pages'
import { CoverCanvas } from '../preview/CoverCanvas'
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
    coverDraft,
    mode,
    replaceBlocks,
    setCoverHeroImage,
    setMode,
    setSourceStatusError,
    setUploadStatusError,
    sourceError,
    sourceName,
    uploadError,
    typography,
    updateCoverTitle,
    updateCoverTitleFontSize,
    updateTypographyFieldFromInput,
  } = useEditorState()
  const measureRootRef = useRef<HTMLDivElement | null>(null)
  const pageElementsRef = useRef(new Map<string, HTMLElement>())
  const coverElementRef = useRef<HTMLElement | null>(null)
  const [measuredSegments, setMeasuredSegments] = useState<MeasuredSegment[]>([])
  const [previewWidth, setPreviewWidth] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [missingAssets, setMissingAssets] = useState<string[]>([])
  const [markdownSource, setMarkdownSource] = useState<{ name: string; content: string } | null>(null)
  const [assetMap, setAssetMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const measureRoot = measureRootRef.current

    if (!measureRoot) return

    const updateMeasurements = () => {
      const nextSegments: MeasuredSegment[] = []
      const measureElements = Array.from(
        measureRoot.querySelectorAll<HTMLElement>('[data-measure-segment]'),
      )

      measureElements.forEach((element) => {
        const segmentId = element.dataset.segmentId ?? ''
        const blockId = element.dataset.blockId ?? ''
        const block = blocks.find((currentBlock) => currentBlock.id === blockId)

        if (!block) {
          return
        }

        if (block.type !== 'text') {
          nextSegments.push({
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
                    : 'divider',
            text: element.dataset.segmentText ?? '',
            height: element.getBoundingClientRect().height,
          })
          return
        }

        const lines = measureParagraphLines(element)

        if (lines.length === 0) {
          nextSegments.push({
            id: `${segmentId}-line-0`,
            blockId,
            block,
            kind: 'paragraph',
            text: element.dataset.segmentText ?? '',
            height: element.getBoundingClientRect().height,
            paragraphId: segmentId,
            lineIndex: 0,
            lineCount: 1,
          })
          return
        }

        lines.forEach((lineText, index) => {
          nextSegments.push({
            id: `${segmentId}-line-${index}`,
            blockId,
            block,
            kind: 'paragraph',
            text: lineText,
            height: getComputedLineHeight(element),
            paragraphId: segmentId,
            lineIndex: index,
            lineCount: lines.length,
          })
        })
      })

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

  const handleCoverExport = async () => {
    if (isExporting) return

    setExportError(null)

    if (!coverElementRef.current) {
      setExportError('封面预览还未准备完成，请稍后重试。')
      return
    }

    setIsExporting(true)

    try {
      await exportCoverAsPng(coverElementRef.current)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : '封面导出失败，请重试。',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleCompleteExport = async () => {
    if (isExporting) return

    setExportError(null)

    if (pages.length === 0) {
      setExportError('当前没有可导出的页面。')
      return
    }

    if (!coverElementRef.current) {
      setExportError('封面预览还未准备完成，请稍后重试。')
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
      await exportCoverAndPagesAsPngZip(coverElementRef.current, pageElements)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : '完整打包失败，请重试。',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const applyParsedMarkdown = (markdown: string, sourceName: string, nextAssetMap: Record<string, string>) => {
    const parsed = parseMarkdownDocument(markdown, nextAssetMap)

    replaceBlocks(parsed.blocks, sourceName, parsed.title)
    setMissingAssets(parsed.missingAssetPaths)

    if (parsed.missingAssetPaths.length > 0) {
      setUploadStatusError(`有 ${parsed.missingAssetPaths.length} 张图片未匹配到本地附件。`)
      return
    }

    clearUploadError()
  }

  const handleMarkdownImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const markdownFile = event.target.files?.[0]

    if (!markdownFile) return

    clearUploadError()
    clearSourceError()
    setExportError(null)

    if (!isMarkdownFile(markdownFile)) {
      setSourceStatusError('请选择一个 Markdown 文件。')
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
      setMarkdownSource({
        name: markdownFile.name,
        content: markdown,
      })
      applyParsedMarkdown(markdown, markdownFile.name, assetMap)
    } catch (error) {
      setSourceStatusError(
        error instanceof Error ? error.message : 'Markdown 导入失败，请重试。',
      )
    } finally {
      event.target.value = ''
    }
  }

  const handleAttachmentsImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) return

    clearUploadError()
    setExportError(null)

    try {
      const assetEntries = await Promise.all(
        files.map(async (file) => {
          if (!isAcceptedImageFile(file)) {
            throw new Error(`只支持 JPEG、PNG、WebP 和 GIF 图片：${file.name}`)
          }

          if (file.size > MAX_ASSET_SIZE_BYTES) {
            throw new Error(`图片不能超过 8MB：${file.name}`)
          }

          const relativePath = getRelativePathFromFile(file)

          return [relativePath, await readFileAsDataUrl(file)] as const
        }),
      )

      const nextAssetMap = {
        ...assetMap,
        ...Object.fromEntries(assetEntries),
      }

      setAssetMap(nextAssetMap)

      if (markdownSource) {
        applyParsedMarkdown(markdownSource.content, markdownSource.name, nextAssetMap)
      }
    } catch (error) {
      setUploadStatusError(
        error instanceof Error ? error.message : '附件导入失败，请重试。',
      )
    } finally {
      event.target.value = ''
    }
  }

  const handleSearchScopeImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) return

    clearUploadError()
    setExportError(null)

    if (!markdownSource) {
      setUploadStatusError('请先导入 Markdown 原稿，再选择 Obsidian 搜索目录。')
      event.target.value = ''
      return
    }

    const references = extractLocalImageReferences(markdownSource.content)

    if (references.length === 0) {
      setUploadStatusError('当前 Markdown 没有检测到本地图片引用。')
      event.target.value = ''
      return
    }

    try {
      const matchedAssets: Array<readonly [string, string]> = []
      const remainingReferences = new Set(references)
      const skippedOversizedMatches: string[] = []

      for (const file of files) {
        if (!isAcceptedImageFile(file)) continue

        const relativePath = getRelativePathFromFile(file)
        const matchedReference = Array.from(remainingReferences).find((reference) =>
          doesAssetPathMatchReference(relativePath, reference),
        )

        if (!matchedReference) continue

        if (file.size > MAX_ASSET_SIZE_BYTES) {
          skippedOversizedMatches.push(file.name)
          continue
        }

        matchedAssets.push([relativePath, await readFileAsDataUrl(file)] as const)
        remainingReferences.delete(matchedReference)

        if (remainingReferences.size === 0) break
      }

      if (matchedAssets.length === 0) {
        setUploadStatusError('在所选目录中没有找到当前 Markdown 引用到的图片。')
        event.target.value = ''
        return
      }

      const nextAssetMap = {
        ...assetMap,
        ...Object.fromEntries(matchedAssets),
      }

      setAssetMap(nextAssetMap)
      applyParsedMarkdown(markdownSource.content, markdownSource.name, nextAssetMap)

      if (skippedOversizedMatches.length > 0) {
        setUploadStatusError(`以下命中图片超过 8MB，已跳过：${skippedOversizedMatches.join('，')}`)
      }
    } catch (error) {
      setUploadStatusError(
        error instanceof Error ? error.message : '搜索目录导入失败，请重试。',
      )
    } finally {
      event.target.value = ''
    }
  }

  const handleCoverImageImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const coverImage = event.target.files?.[0]

    if (!coverImage) return

    clearUploadError()

    try {
      if (!isAcceptedImageFile(coverImage)) {
        throw new Error(`只支持 JPEG、PNG、WebP 和 GIF 图片：${coverImage.name}`)
      }

      if (coverImage.size > MAX_ASSET_SIZE_BYTES) {
        throw new Error(`图片不能超过 8MB：${coverImage.name}`)
      }

      const src = await readFileAsDataUrl(coverImage)
      setCoverHeroImage(src, coverImage.name)
    } catch (error) {
      setUploadStatusError(
        error instanceof Error ? error.message : '封面主图导入失败，请重试。',
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
            把一篇长文整理成适合发布的 9:16 阅读页面。
          </p>
        </div>

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">工作区</p>
            <h2>编辑模式</h2>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button
              type="button"
              className="primary-action"
              style={{ opacity: mode === 'body' ? 1 : 0.72 }}
              onClick={() => setMode('body')}
              disabled={isExporting}
            >
              正文排版
            </button>
            <button
              type="button"
              className="primary-action"
              style={{ opacity: mode === 'cover' ? 1 : 0.72 }}
              onClick={() => setMode('cover')}
              disabled={isExporting}
            >
              封面制作
            </button>
          </div>
        </section>

        {mode === 'body' ? (
          <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">内容来源</p>
            <h2>原稿导入</h2>
          </div>
          <label className="upload-field">
            <span className="upload-copy">导入 Markdown 原稿</span>
            <span className="upload-hint">
              先选择一个 `.md` 文件，系统会按正文结构生成预览。
            </span>
            <input
              aria-label="导入 Markdown 原稿"
              type="file"
              accept=".md,text/markdown,text/plain"
              disabled={isExporting}
              onChange={(event) => {
                void handleMarkdownImport(event)
              }}
            />
          </label>
          <label className="upload-field">
            <span className="upload-copy">导入图片附件</span>
            <span className="upload-hint">
              可单独补传 Obsidian 附件目录或图片文件，导入后会自动重新匹配缺图。
            </span>
            <input
              aria-label="导入图片附件"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isExporting}
              onChange={(event) => {
                void handleAttachmentsImport(event)
              }}
            />
          </label>
          <label className="upload-field">
            <span className="upload-copy">选择 Obsidian 搜索目录</span>
            <span className="upload-hint">
              如果你不知道图片在哪个子目录，可以直接选择整个 Obsidian 文件夹，系统会只按当前 Markdown 的图片引用定向查找。
            </span>
            <input
              aria-label="选择 Obsidian 搜索目录"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={isExporting}
              {...{
                webkitdirectory: '',
                directory: '',
              }}
              onChange={(event) => {
                void handleSearchScopeImport(event)
              }}
            />
          </label>
          <div className="source-summary">
            <p className="source-summary__label">当前原稿</p>
            <p className="source-summary__value">{sourceName}</p>
          </div>
          <div className="source-summary">
            <p className="source-summary__label">已导入附件</p>
            <p className="source-summary__value">{Object.keys(assetMap).length} 个</p>
          </div>
          <div className="source-summary">
            <p className="source-summary__label">内容块</p>
            <p className="source-summary__value">{blocks.length} 个</p>
          </div>
          </section>
        ) : (
          <section className="panel-card">
            <div className="panel-head">
              <p className="panel-eyebrow">封面输入</p>
              <h2>封面内容</h2>
            </div>
            <label className="field-stack field-full">
              <span className="field-label">封面标题</span>
              <textarea
                aria-label="封面标题"
                value={coverDraft.title}
                disabled={isExporting}
                onChange={(event) => updateCoverTitle(event.target.value)}
                rows={4}
                style={{ resize: 'vertical', minHeight: 120 }}
              />
            </label>
            <label className="field-stack field-full">
              <span className="field-label">标题字号</span>
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  aria-label="标题字号"
                  type="range"
                  min={28}
                  max={56}
                  step={1}
                  value={coverDraft.titleFontSize}
                  disabled={isExporting}
                  onChange={(event) => updateCoverTitleFontSize(Number(event.target.value))}
                />
                <input
                  aria-label="标题字号数值"
                  type="number"
                  min={28}
                  max={56}
                  step={1}
                  value={coverDraft.titleFontSize}
                  disabled={isExporting}
                  onChange={(event) =>
                    updateCoverTitleFontSize(
                      event.target.value === '' ? Number.NaN : Number(event.target.value),
                    )
                  }
                />
              </div>
            </label>
            <label className="field-stack field-full">
              <span className="field-label">作者</span>
              <input aria-label="作者" type="text" value={coverDraft.author} readOnly />
            </label>
            <label className="upload-field">
              <span className="upload-copy">上传封面主图</span>
              <span className="upload-hint">封面主图需要单独上传，不复用正文图片。</span>
              <input
                aria-label="上传封面主图"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isExporting}
                onChange={(event) => {
                  void handleCoverImageImport(event)
                }}
              />
            </label>
          </section>
        )}

        {mode === 'body' ? (
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
        ) : null}

        {mode === 'body' ? (
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
        ) : null}

        <section className="panel-card">
          <div className="panel-head">
            <p className="panel-eyebrow">导出</p>
            <h2>成品输出</h2>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => void handleCompleteExport()}
            disabled={isExporting}
          >
            {isExporting ? '打包中…' : '封面+正文一键打包'}
          </button>
          {mode === 'body' ? (
            <>
              <button
                type="button"
                className="primary-action"
                onClick={() => void handleExportPages()}
                disabled={isExporting}
              >
                {exportButtonLabel}
              </button>
              <p className="export-note">按页生成 PNG，并打包成一个 ZIP 下载。</p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="primary-action"
                onClick={() => void handleCoverExport()}
                disabled={isExporting}
              >
                导出封面 PNG
              </button>
              <p className="export-note">单独导出 1 张封面 PNG。</p>
            </>
          )}
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
            <p className="panel-eyebrow">{mode === 'body' ? '内容预览' : '封面预览'}</p>
            <h2>{mode === 'body' ? '9:16 阅读页面' : '封面实时预览'}</h2>
          </div>
          <div className="preview-stage__meta">
            <span>{mode === 'body' ? `${pageCount} 页` : '1 张'}</span>
            <span>{isExporting ? '导出锁定中' : '可继续编辑'}</span>
          </div>
        </header>

        <div className="preview-stage__canvas">
          {mode === 'cover' ? (
            <CoverCanvas
              ref={coverElementRef}
              title={coverDraft.title}
              author={coverDraft.author}
              titleFontSize={coverDraft.titleFontSize}
              heroImageSrc={coverDraft.heroImageSrc}
              heroImageAlt={coverDraft.heroImageAlt || '封面主图'}
              hasDivider={coverDraft.hasDivider}
            />
          ) : pages.length === 0 ? (
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
              fontFamily: 'var(--font-reading-stack)',
              textRendering: 'optimizeLegibility',
              fontFeatureSettings: '"liga" 1, "kern" 1',
              fontSize: typography.fontSize,
              lineHeight: typography.lineHeight,
              fontWeight: typography.fontWeight,
              display: 'grid',
              gap: typography.paragraphSpacing,
              width: '100%',
              maxWidth: '30ch',
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
                    letterSpacing: '0.01em',
                  }}
                >
                  {paragraph === '' ? '\u00a0' : paragraph}
                </p>
              ))
            })}
          </article>
        </div>
        {mode === 'body' ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -10000,
              top: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <CoverCanvas
              ref={coverElementRef}
              title={coverDraft.title}
              author={coverDraft.author}
              titleFontSize={coverDraft.titleFontSize}
              heroImageSrc={coverDraft.heroImageSrc}
              heroImageAlt={coverDraft.heroImageAlt || '封面主图'}
              hasDivider={coverDraft.hasDivider}
            />
          </div>
        ) : null}
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

function getComputedLineHeight(element: HTMLElement) {
  const computedLineHeight = window.getComputedStyle(element).lineHeight

  if (computedLineHeight.endsWith('px')) {
    return Number.parseFloat(computedLineHeight)
  }

  const fontSize = Number.parseFloat(window.getComputedStyle(element).fontSize)
  const numericLineHeight = Number.parseFloat(computedLineHeight)

  return Number.isFinite(numericLineHeight) && Number.isFinite(fontSize)
    ? numericLineHeight * fontSize
    : element.getBoundingClientRect().height
}

function measureParagraphLines(element: HTMLElement) {
  const text = element.textContent ?? ''

  if (text.trim() === '') {
    return [text]
  }

  const documentRange = element.ownerDocument.createRange()
  const textNode = element.firstChild

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return [text]
  }

  if (typeof documentRange.getClientRects !== 'function') {
    return [text]
  }

  const rawLines: string[] = []
  let currentTop: number | null = null
  let currentLineStart = 0

  for (let index = 1; index <= text.length; index += 1) {
    documentRange.setStart(textNode, currentLineStart)
    documentRange.setEnd(textNode, index)

    const rects = Array.from(documentRange.getClientRects())

    if (rects.length === 0) {
      continue
    }

    const latestRect = rects[rects.length - 1]

    if (!latestRect) {
      continue
    }

    if (currentTop === null) {
      currentTop = latestRect.top
      continue
    }

    if (Math.abs(latestRect.top - currentTop) > 1) {
      rawLines.push(text.slice(currentLineStart, index - 1))
      currentLineStart = index - 1
      currentTop = latestRect.top
    }
  }

  rawLines.push(text.slice(currentLineStart))

  return rawLines.map((line) => line.trimEnd())
}

function isMarkdownFile(file: File) {
  return file.name.toLowerCase().endsWith('.md') || ACCEPTED_MARKDOWN_TYPES.has(file.type)
}

function isAcceptedImageFile(file: File) {
  return ACCEPTED_IMAGE_TYPES.has(file.type)
}

function getRelativePathFromFile(file: File) {
  const pathLike = 'webkitRelativePath' in file ? file.webkitRelativePath : ''

  return typeof pathLike === 'string' && pathLike !== '' ? pathLike : file.name
}
