'use client'

import html2canvas from 'html2canvas'

const COVER_EXPORT_SCALE = 3

export async function exportCoverAsPng(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: COVER_EXPORT_SCALE,
    useCORS: true,
  })

  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')

  link.href = url
  link.download = 'softpage-cover.png'
  link.click()
}
