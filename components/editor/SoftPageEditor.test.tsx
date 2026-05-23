import React from 'react'
import { afterEach, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SoftPageEditor } from './SoftPageEditor'
import html2canvas from 'html2canvas'

afterEach(() => {
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

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(new Blob(['png'], { type: 'image/png' })),
  })),
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
  await exportPagesAsPngZip(pages)

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
