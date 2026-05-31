'use client'

import html2canvas from 'html2canvas'
import JSZip from 'jszip'

const EXPORT_SCALE = 2
const COVER_EXPORT_SCALE = 3

export async function exportPagesAsPng(pageElements: HTMLElement[]) {
  return exportPagesAsPngZip(pageElements)
}

export async function exportCoverAndPagesAsPngZip(
  coverElement: HTMLElement,
  pageElements: HTMLElement[],
) {
  if (pageElements.length === 0) {
    throw new Error('当前没有可导出的页面。')
  }

  const zip = new JSZip()
  const coverCanvas = await renderCoverElementToCanvas(coverElement)
  const coverBlob = await canvasToBlob(coverCanvas)

  zip.file('softpage-cover.png', coverBlob)
  await addPagesToZip(zip, pageElements)
  await downloadZip(zip, 'softpage-complete-export.zip')
}

export async function exportPagesAsPngZip(pageElements: HTMLElement[]) {
  if (pageElements.length === 0) {
    throw new Error('当前没有可导出的页面。')
  }

  const zip = new JSZip()

  await addPagesToZip(zip, pageElements)
  await downloadZip(zip, 'softpage-export.zip')
}

async function addPagesToZip(zip: JSZip, pageElements: HTMLElement[]) {
  for (let index = pageElements.length - 1; index >= 0; index -= 1) {
    const pageElement = pageElements[index]
    try {
      const canvas = await renderElementToCanvas(pageElement)
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
}

async function downloadZip(zip: JSZip, fileName: string) {
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function renderElementToCanvas(element: HTMLElement) {
  return html2canvas(element, {
    backgroundColor: null,
    scale: EXPORT_SCALE,
    useCORS: true,
  })
}

function renderCoverElementToCanvas(element: HTMLElement) {
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: COVER_EXPORT_SCALE,
    useCORS: true,
  })
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
