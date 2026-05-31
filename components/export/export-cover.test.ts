import html2canvas from 'html2canvas'
import { expect, test, vi } from 'vitest'
import { exportCoverAsPng } from './export-cover'

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    toDataURL: () => 'data:image/png;base64,cover',
  })),
}))

test('exports cover with a white backing and high-resolution scale', async () => {
  const cover = document.createElement('article')
  const originalCreateElement = document.createElement.bind(document)
  const anchor = originalCreateElement('a')
  const createElementSpy = vi.spyOn(document, 'createElement')

  anchor.click = vi.fn()
  createElementSpy.mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === 'a') {
      return anchor
    }

    return originalCreateElement(tagName)
  })

  await exportCoverAsPng(cover)

  expect(html2canvas).toHaveBeenCalledWith(
    cover,
    expect.objectContaining({
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
    }),
  )
  expect(anchor.download).toBe('softpage-cover.png')
  expect(anchor.href).toBe('data:image/png;base64,cover')
  expect(anchor.click).toHaveBeenCalledTimes(1)
})
