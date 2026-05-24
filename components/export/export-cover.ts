'use client'

import html2canvas from 'html2canvas'

const EXPORT_SCALE = 2

export async function exportCoverAsPng(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: EXPORT_SCALE,
    useCORS: true,
  })

  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')

  link.href = url
  link.download = 'softpage-cover.png'
  link.click()
}
