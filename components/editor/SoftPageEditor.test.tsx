import React from 'react'
import { afterEach, test, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SoftPageEditor } from './SoftPageEditor'
import html2canvas from 'html2canvas'
import { CoverCanvas } from '../preview/CoverCanvas'
import { exportCoverAsPng } from '../export/export-cover'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('renders editorial workspace sections and export action', () => {
  render(<SoftPageEditor />)

  expect(screen.getByText('SoftPage')).toBeInTheDocument()
  expect(screen.getByText('内容来源')).toBeInTheDocument()
  expect(screen.getByText('内容结构')).toBeInTheDocument()
  expect(screen.getByText('页面设置')).toBeInTheDocument()
  expect(screen.getByText('内容预览')).toBeInTheDocument()
  expect(screen.getByText('原稿导入')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '导出 ZIP' })).toBeInTheDocument()
})

test('uses the updated default typography controls', () => {
  render(<SoftPageEditor />)

  expect(screen.getAllByLabelText('fontSize')[0]).toHaveValue(15)
  expect(screen.getAllByLabelText('lineHeight')[0]).toHaveValue(1.62)
  expect(screen.getAllByLabelText('paragraphSpacing')[0]).toHaveValue(15)
  expect(screen.getAllByLabelText('fontWeight')[0]).toHaveValue(400)
})

test('re-parses markdown when attachments are imported after the source file', async () => {
  render(<SoftPageEditor />)

  const markdownInput = screen.getAllByLabelText('导入 Markdown 原稿')[0]
  const attachmentsInput = screen.getAllByLabelText('导入图片附件')[0]
  const markdownFile = new File(
    ['![[assets/Pasted image 20260522150957.png]]'],
    'article.md',
    { type: 'text/markdown' },
  )
  const attachmentFile = new File(
    ['image-binary'],
    'Pasted image 20260522150957.png',
    { type: 'image/png' },
  )

  Object.defineProperty(attachmentFile, 'webkitRelativePath', {
    value: 'vault/assets/Pasted image 20260522150957.png',
  })
  Object.defineProperty(markdownFile, 'text', {
    value: vi.fn(async () => '![[assets/Pasted image 20260522150957.png]]'),
  })

  fireEvent.change(markdownInput, {
    target: {
      files: [markdownFile],
    },
  })

  expect(await screen.findByText('article.md')).toBeInTheDocument()
  expect(await screen.findByText(/未匹配附件：assets\/Pasted image 20260522150957\.png/)).toBeInTheDocument()
  expect(screen.getByText(/缺图 · assets\/Pasted image 20260522150957\.png/)).toBeInTheDocument()

  fireEvent.change(attachmentsInput, {
    target: {
      files: [attachmentFile],
    },
  })

  await waitFor(() => {
    expect(screen.queryByText(/未匹配附件：assets\/Pasted image 20260522150957\.png/)).not.toBeInTheDocument()
  })

  expect(screen.getByText('图片 · Pasted image 20260522150957')).toBeInTheDocument()
})

test('matches markdown image references from a broad search scope without loading unrelated files', async () => {
  render(<SoftPageEditor />)

  const markdownInput = screen.getAllByLabelText('导入 Markdown 原稿')[0]
  const scopeInput = screen.getAllByLabelText('选择 Obsidian 搜索目录')[0]
  const markdownFile = new File(
    ['![[assets/Pasted image 20260521145142.png]]'],
    'article.md',
    { type: 'text/markdown' },
  )
  const unrelatedFile = new File(['other'], 'something-else.png', { type: 'image/png' })
  const matchedFile = new File(['image-binary'], 'Pasted image 20260521145142.png', {
    type: 'image/png',
  })

  Object.defineProperty(markdownFile, 'text', {
    value: vi.fn(async () => '![[assets/Pasted image 20260521145142.png]]'),
  })
  Object.defineProperty(unrelatedFile, 'webkitRelativePath', {
    value: 'vault/random/something-else.png',
  })
  Object.defineProperty(matchedFile, 'webkitRelativePath', {
    value: 'vault/assets/Pasted image 20260521145142.png',
  })

  fireEvent.change(markdownInput, {
    target: {
      files: [markdownFile],
    },
  })

  expect(await screen.findByText(/未匹配附件：assets\/Pasted image 20260521145142\.png/)).toBeInTheDocument()

  fireEvent.change(scopeInput, {
    target: {
      files: [unrelatedFile, matchedFile],
    },
  })

  await waitFor(() => {
    expect(screen.queryByText(/未匹配附件：assets\/Pasted image 20260521145142\.png/)).not.toBeInTheDocument()
  })

  expect(screen.getByText('图片 · Pasted image 20260521145142')).toBeInTheDocument()
})

test('ignores oversized unrelated images while still matching referenced images from the search scope', async () => {
  render(<SoftPageEditor />)

  const markdownInput = screen.getAllByLabelText('导入 Markdown 原稿')[0]
  const scopeInput = screen.getAllByLabelText('选择 Obsidian 搜索目录')[0]
  const markdownFile = new File(
    ['![[assets/Pasted image 20260521145142.png]]'],
    'article.md',
    { type: 'text/markdown' },
  )
  const largeUnrelatedFile = new File(['oversized'], 'f05bc4f434b07534e234a78c2e23e1c6.png', {
    type: 'image/png',
  })
  const matchedFile = new File(['image-binary'], 'Pasted image 20260521145142.png', {
    type: 'image/png',
  })

  Object.defineProperty(markdownFile, 'text', {
    value: vi.fn(async () => '![[assets/Pasted image 20260521145142.png]]'),
  })
  Object.defineProperty(largeUnrelatedFile, 'webkitRelativePath', {
    value: 'vault/random/f05bc4f434b07534e234a78c2e23e1c6.png',
  })
  Object.defineProperty(matchedFile, 'webkitRelativePath', {
    value: 'vault/assets/Pasted image 20260521145142.png',
  })
  Object.defineProperty(largeUnrelatedFile, 'size', {
    value: 9 * 1024 * 1024,
  })

  fireEvent.change(markdownInput, {
    target: {
      files: [markdownFile],
    },
  })

  expect(await screen.findByText('article.md')).toBeInTheDocument()

  fireEvent.change(scopeInput, {
    target: {
      files: [largeUnrelatedFile, matchedFile],
    },
  })

  await waitFor(() => {
    expect(screen.getByText('图片 · Pasted image 20260521145142')).toBeInTheDocument()
  })

  expect(screen.queryByText(/图片不能超过 8MB：f05bc4f434b07534e234a78c2e23e1c6\.png/)).not.toBeInTheDocument()
})

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(new Blob(['png'], { type: 'image/png' })),
  })),
}))

vi.mock('../export/export-cover', () => ({
  exportCoverAsPng: vi.fn(async () => undefined),
}))

vi.mock('jszip', () => {
  return {
    default: class FakeZip {
      static instances: FakeZip[] = []
      files = new Map<string, Blob>()

      constructor() {
        FakeZip.instances.push(this)
      }

      file(name: string, blob: Blob) {
        this.files.set(name, blob)
      }

      async generateAsync() {
        return new Blob(['zip'], { type: 'application/zip' })
      }
    },
  }
})

test('exports all pages as a zip package', async () => {
  const { exportPagesAsPngZip } = await import('../export/export-pages')
  const JSZipModule = await import('jszip')
  const FakeZip = JSZipModule.default as unknown as {
    instances: Array<{ files: Map<string, Blob> }>
  }
  const clickSpy = vi.fn()
  const originalCreateElement = document.createElement.bind(document)
  const createElementSpy = vi.spyOn(document, 'createElement')
  const anchor = originalCreateElement('a')

  anchor.click = clickSpy

  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:softpage-export'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  })
  createElementSpy.mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === 'a') {
      return anchor
    }

    return originalCreateElement(tagName)
  })

  const pages = [document.createElement('article'), document.createElement('article')]
  pages[0]?.setAttribute('data-page', 'page-1')
  pages[1]?.setAttribute('data-page', 'page-2')
  await exportPagesAsPngZip(pages)

  const latestZip = FakeZip.instances.at(-1)

  expect(Array.from(latestZip?.files.keys() ?? [])).toEqual([
    'softpage-page-01.png',
    'softpage-page-02.png',
  ])
  expect(vi.mocked(html2canvas).mock.calls.map(([element]) => element.getAttribute('data-page'))).toEqual([
    'page-2',
    'page-1',
  ])
  expect(anchor.download).toBe('softpage-export.zip')
  expect(anchor.href).toBe('blob:softpage-export')
  expect(clickSpy).toHaveBeenCalledTimes(1)
})

test('exports pages with their live background instead of forcing the old beige fill', async () => {
  const { exportPagesAsPngZip } = await import('../export/export-pages')
  const page = document.createElement('article')

  await exportPagesAsPngZip([page])

  expect(html2canvas).toHaveBeenCalledWith(
    page,
    expect.objectContaining({
      backgroundColor: null,
    }),
  )
})

test('prefills cover title from markdown title and uses fixed default author', async () => {
  render(<SoftPageEditor />)

  const markdownInput = screen.getAllByLabelText('导入 Markdown 原稿')[0]
  const markdownFile = new File(['# 我的封面标题\n\n正文'], 'article.md', {
    type: 'text/markdown',
  })

  Object.defineProperty(markdownFile, 'text', {
    value: vi.fn(async () => '# 我的封面标题\n\n正文'),
  })

  fireEvent.change(markdownInput, {
    target: {
      files: [markdownFile],
    },
  })

  expect(await screen.findByText('article.md')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '封面制作' }))

  expect(screen.getByLabelText('封面标题')).toHaveValue('我的封面标题')
  expect(screen.getByLabelText('作者')).toHaveValue('花萍雨')
})

test('switches to cover mode and shows cover controls', async () => {
  render(<SoftPageEditor />)

  fireEvent.click(screen.getAllByRole('button', { name: '封面制作' })[0]!)

  expect(screen.getByLabelText('封面标题')).toBeInTheDocument()
  expect(screen.getByLabelText('上传封面主图')).toBeInTheDocument()
  expect(screen.getByText('封面实时预览')).toBeInTheDocument()
})

test('renders fixed cover layout with hero image, title, author and divider', () => {
  const { container } = render(
    <CoverCanvas
      title="封面标题"
      author="花萍雨"
      heroImageSrc="data:image/png;base64,abc"
      heroImageAlt="封面主图"
      hasDivider
    />,
  )

  const cover = within(container)

  expect(cover.getByRole('heading', { name: '封面标题' })).toBeInTheDocument()
  expect(cover.getByText('| 作者：花萍雨')).toBeInTheDocument()
  expect(cover.getByAltText('封面主图')).toBeInTheDocument()
  expect(cover.getByTestId('cover-divider')).toBeInTheDocument()
})

test('uploads one cover hero image and updates preview', async () => {
  render(<SoftPageEditor />)

  fireEvent.click(screen.getAllByRole('button', { name: '封面制作' })[0]!)

  const file = new File(['cover'], 'cover.png', { type: 'image/png' })

  fireEvent.change(screen.getByLabelText('上传封面主图'), {
    target: { files: [file] },
  })

  expect(await screen.findByAltText('cover.png')).toBeInTheDocument()
})

test('exports cover png separately', async () => {
  render(<SoftPageEditor />)

  fireEvent.click(screen.getAllByRole('button', { name: '封面制作' })[0]!)
  fireEvent.click(screen.getByRole('button', { name: '导出封面 PNG' }))

  await waitFor(() => {
    expect(exportCoverAsPng).toHaveBeenCalledTimes(1)
  })
})
