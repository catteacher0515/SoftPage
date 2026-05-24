'use client'

import html2canvas from 'html2canvas'
import JSZip from 'jszip'

const EXPORT_SCALE = 2

export async function exportPagesAsPng(pageElements: HTMLElement[]) {
  return exportPagesAsPngZip(pageElements)
}

export async function exportPagesAsPngZip(pageElements: HTMLElement[]) {
  if (pageElements.length === 0) {
    throw new Error('当前没有可导出的页面。')
  }

  const zip = new JSZip()

  for (let index = pageElements.length - 1; index >= 0; index -= 1) {
    const pageElement = pageElements[index]
    try {
      const canvas = await html2canvas(pageElement, {
        backgroundColor: null,
        scale: EXPORT_SCALE,
        useCORS: true,
      })
      const blob = await canvasToBlob(canvas)
      const exportIndex = pageElements.length - index

      zip.file(
        `softpage-page-${String(exportIndex).padStart(2, '0')}.png`,
        blob,
      )
    } catch (error) {
      throw new Error(
        `第 ${index + 1} 页导出失败，请重试。`,
        { cause: error },
      )
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'softpage-export.zip'
  link.click()
  URL.revokeObjectURL(url)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('无法生成 PNG 文件。'))
    }, 'image/png')
  })
}
