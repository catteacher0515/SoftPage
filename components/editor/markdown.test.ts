import { expect, test } from 'vitest'
import { parseMarkdownDocument } from './markdown'

test('parses markdown paragraphs and image syntaxes into blocks', () => {
  const result = parseMarkdownDocument(
    [
      '# 标题',
      '',
      '第一段内容',
      '',
      '![](https://example.com/cover.png)',
      '',
      '![[assets/inline-image.png]]',
      '',
      '- 列表项',
    ].join('\n'),
    {
      'assets/inline-image.png': 'data:image/png;base64,inline-image',
    },
  )

  expect(result.blocks).toEqual([
    { id: 'text-1', type: 'text', value: '标题' },
    { id: 'text-2', type: 'text', value: '第一段内容' },
    {
      id: 'image-1',
      type: 'image',
      src: 'https://example.com/cover.png',
      alt: 'cover',
    },
    {
      id: 'image-2',
      type: 'image',
      src: 'data:image/png;base64,inline-image',
      alt: 'inline-image',
    },
    { id: 'text-3', type: 'text', value: '列表项' },
  ])
  expect(result.missingAssetPaths).toEqual([])
})

test('reports missing local markdown image assets', () => {
  const result = parseMarkdownDocument('![[attachments/missing-cover.png]]')

  expect(result.blocks).toEqual([
    {
      id: 'missing-image-1',
      type: 'missing-image',
      path: 'attachments/missing-cover.png',
    },
  ])
  expect(result.missingAssetPaths).toEqual(['attachments/missing-cover.png'])
})

test('matches obsidian assets by file name when folder differs', () => {
  const result = parseMarkdownDocument('![[Pasted image 20260522150957.png]]', {
    'assets/Pasted image 20260522150957.png': 'data:image/png;base64,pasted-image',
  })

  expect(result.blocks).toEqual([
    {
      id: 'image-1',
      type: 'image',
      src: 'data:image/png;base64,pasted-image',
      alt: 'Pasted image 20260522150957',
    },
  ])
})

test('parses markdown tables into table blocks', () => {
  const result = parseMarkdownDocument(
    [
      '| 设备 | 机身重量 | 充电器 | 总重量 |',
      '| --- | --- | --- | --- |',
      '| MacBook Air | 1.23 kg | 0.18 kg | 约 1.4 kg |',
      '| 天选 4 | 2.1 kg | 0.6 kg | 约 2.7 kg |',
    ].join('\n'),
  )

  expect(result.blocks).toEqual([
    {
      id: 'table-1',
      type: 'table',
      rows: [
        ['设备', '机身重量', '充电器', '总重量'],
        ['MacBook Air', '1.23 kg', '0.18 kg', '约 1.4 kg'],
        ['天选 4', '2.1 kg', '0.6 kg', '约 2.7 kg'],
      ],
    },
  ])
})

test('parses markdown horizontal rules into divider blocks', () => {
  const result = parseMarkdownDocument(
    ['第一段', '', '---', '', '第二段'].join('\n'),
  )

  expect(result.blocks).toEqual([
    { id: 'text-1', type: 'text', value: '第一段' },
    { id: 'divider-1', type: 'divider' },
    { id: 'text-2', type: 'text', value: '第二段' },
  ])
})
