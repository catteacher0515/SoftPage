import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { PageCanvas } from './PageCanvas'
import { PAGE_ASPECT_RATIO } from './constants'

test('renders pages without editor header chrome', () => {
  const { container } = render(
    <PageCanvas
      typography={{
        fontSize: 15,
        lineHeight: 1.62,
        fontWeight: 400,
        paragraphSpacing: 0,
        pagePadding: 30,
      }}
      pages={[
        {
          id: 'page-1',
          segments: [
            {
              id: 'text-1',
              blockId: 'text-1',
              kind: 'paragraph',
              text: '测试正文',
              height: 48,
              block: { id: 'text-1', type: 'text', value: '测试正文' },
            },
          ],
        },
      ]}
    />,
  )

  expect(screen.getByText('测试正文')).toBeInTheDocument()
  expect(screen.queryByText('SoftPage Draft')).not.toBeInTheDocument()
  expect(container.querySelector('[data-preview-page]')).toHaveStyle({
    aspectRatio: `${1 / PAGE_ASPECT_RATIO}`,
    background: '#ffffff',
  })
  expect(container.querySelector('[data-preview-page]')).toHaveStyle({
    fontFamily: 'var(--font-reading-stack)',
  })
})

test('renders table and missing image blocks as structured content', () => {
  render(
    <PageCanvas
      typography={{
        fontSize: 15,
        lineHeight: 1.62,
        fontWeight: 400,
        paragraphSpacing: 15,
        pagePadding: 30,
      }}
      pages={[
        {
          id: 'page-1',
          segments: [
            {
              id: 'table-1',
              blockId: 'table-1',
              kind: 'table',
              text: '表格 2 行',
              height: 120,
              block: {
                id: 'table-1',
                type: 'table',
                rows: [
                  ['设备', '重量'],
                  ['MacBook Air', '1.23 kg'],
                ],
              },
            },
            {
              id: 'missing-image-1',
              blockId: 'missing-image-1',
              kind: 'missing-image',
              text: 'Pasted image.png',
              height: 80,
              block: {
                id: 'missing-image-1',
                type: 'missing-image',
                path: 'Pasted image.png',
              },
            },
          ],
        },
      ]}
    />,
  )

  expect(screen.getByText('设备')).toBeInTheDocument()
  expect(screen.getByText('MacBook Air')).toBeInTheDocument()
  expect(screen.getByText('图片缺失')).toBeInTheDocument()
  expect(screen.getByText('Pasted image.png')).toBeInTheDocument()
})

test('renders divider blocks as horizontal rules', () => {
  const { container } = render(
    <PageCanvas
      typography={{
        fontSize: 15,
        lineHeight: 1.62,
        fontWeight: 400,
        paragraphSpacing: 15,
        pagePadding: 30,
      }}
      pages={[
        {
          id: 'page-1',
          segments: [
            {
              id: 'divider-1',
              blockId: 'divider-1',
              kind: 'divider',
              text: 'divider',
              height: 1,
              block: {
                id: 'divider-1',
                type: 'divider',
              },
            },
          ],
        },
      ]}
    />,
  )

  const divider = container.querySelector('[data-preview-page] div')
  expect(divider).toBeTruthy()
})
