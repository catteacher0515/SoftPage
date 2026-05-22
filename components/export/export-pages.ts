'use client'

import html2canvas from 'html2canvas'

const EXPORT_SCALE = 2

export async function exportPagesAsPng(pageElements: HTMLElement[]) {
  for (let index = 0; index < pageElements.length; index += 1) {
    const pageElement = pageElements[index]
    const canvas = await html2canvas(pageElement, {
      backgroundColor: '#F6F1E8',
      scale: EXPORT_SCALE,
      useCORS: true,
    })
    const link = document.createElement('a')

    link.href = canvas.toDataURL('image/png')
    link.download = `softpage-page-${index + 1}.png`
    link.click()
  }
}
