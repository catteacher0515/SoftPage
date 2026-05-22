# SoftPage MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fixed `3:4` article editor that supports text input, manual image insertion, automatic pagination, and multi-page PNG export.

**Architecture:** Use a single Next.js app with one editing surface and one preview surface. Keep content as an ordered block list (`text` and `image`) so pagination and export can operate on a predictable document model. Measure rendered block heights before page assembly, then render each page independently for preview and `html2canvas` export.

**Tech Stack:** Next.js, React, TypeScript, `html2canvas`

---

### Task 1: Bootstrap the app shell

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Write the failing test**

No automated test yet. Verify the repo has no runnable app by checking that `npm run dev` fails before files exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: fail because the Next.js app is not bootstrapped yet.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "name": "softpage",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "html2canvas": "^1.4.1",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "typescript": "^5.0.0"
  }
}
```

```tsx
// app/layout.tsx
import './globals.css'

export const metadata = {
  title: 'SoftPage',
  description: 'Fixed-ratio article editor',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// app/page.tsx
export default function Page() {
  return <main>SoftPage</main>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install && npm run dev`
Expected: app starts and shows `SoftPage`.

- [ ] **Step 5: Commit**

```bash
git add package.json next.config.ts tsconfig.json app
git commit -m "chore: bootstrap nextjs app shell"
```

### Task 2: Build the editor state model and layout

**Files:**
- Create: `components/editor/types.ts`
- Create: `components/editor/use-editor-state.ts`
- Create: `components/editor/SoftPageEditor.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing test**

No automated test yet. Add a temporary render assertion in `app/page.tsx` by wiring the editor component and confirm the page does not yet have the expected controls.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: the page still shows placeholder content, not the editor layout.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/editor/types.ts
export type TextBlock = {
  id: string
  type: 'text'
  value: string
}

export type ImageBlock = {
  id: string
  type: 'image'
  src: string
  alt: string
}

export type Block = TextBlock | ImageBlock

export type TypographyConfig = {
  fontSize: number
  lineHeight: number
  fontWeight: number
  paragraphSpacing: number
  pagePadding: number
}
```

```ts
// components/editor/use-editor-state.ts
import { useMemo, useState } from 'react'
import type { Block, TypographyConfig } from './types'

const defaultTypography: TypographyConfig = {
  fontSize: 22,
  lineHeight: 1.7,
  fontWeight: 400,
  paragraphSpacing: 16,
  pagePadding: 40,
}

const initialBlocks: Block[] = [
  { id: 'text-1', type: 'text', value: '在这里输入正文。' },
]

export function useEditorState() {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [typography, setTypography] = useState(defaultTypography)

  return useMemo(
    () => ({ blocks, setBlocks, typography, setTypography }),
    [blocks, typography],
  )
}
```

```tsx
// components/editor/SoftPageEditor.tsx
'use client'

import { useEditorState } from './use-editor-state'

export function SoftPageEditor() {
  const { blocks } = useEditorState()

  return (
    <div>
      <aside>编辑区</aside>
      <section>预览区</section>
      <div>{blocks.length}</div>
    </div>
  )
}
```

```tsx
// app/page.tsx
import { SoftPageEditor } from '@/components/editor/SoftPageEditor'

export default function Page() {
  return <SoftPageEditor />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: the app renders the two-pane editor shell.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/editor
git commit -m "feat: add editor state shell"
```

### Task 3: Implement text editing and typography controls

**Files:**
- Modify: `components/editor/SoftPageEditor.tsx`
- Modify: `components/editor/use-editor-state.ts`
- Modify: `components/editor/types.ts`

- [ ] **Step 1: Write the failing test**

Manually verify the current shell cannot yet edit text or typography.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: there are no textarea or typography inputs yet.

- [ ] **Step 3: Write minimal implementation**

Add a `textarea` for the active text block and numeric inputs for font size, line height, font weight, paragraph spacing, and page padding. Update the first text block directly from the textarea and keep state local to the editor hook.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: typing updates the editable block and the controls change the typography state.

- [ ] **Step 5: Commit**

```bash
git add components/editor
git commit -m "feat: add text and typography controls"
```

### Task 4: Add manual image upload and insertion

**Files:**
- Modify: `components/editor/SoftPageEditor.tsx`
- Modify: `components/editor/use-editor-state.ts`
- Modify: `components/editor/types.ts`

- [ ] **Step 1: Write the failing test**

Manually verify there is no way to upload an image or insert it into the block list.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: no image upload control exists yet.

- [ ] **Step 3: Write minimal implementation**

Implement file input upload, store the uploaded image as a `data:` URL, and insert an `image` block after the currently selected text block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: uploaded images appear in the editor flow after insertion.

- [ ] **Step 5: Commit**

```bash
git add components/editor
git commit -m "feat: add image upload and insertion"
```

### Task 5: Render paginated preview pages

**Files:**
- Create: `components/preview/PageCanvas.tsx`
- Create: `components/preview/pagination.ts`
- Modify: `components/editor/SoftPageEditor.tsx`

- [ ] **Step 1: Write the failing test**

Manually verify there is no fixed `3:4` page preview yet.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: the preview area does not show page cards.

- [ ] **Step 3: Write minimal implementation**

Split blocks into pages by measuring text/image block height against the available page height. Render each page in a `3:4` canvas with the `#F6F1E8` background and left-aligned content.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: long content is shown as multiple page previews.

- [ ] **Step 5: Commit**

```bash
git add components/preview components/editor
git commit -m "feat: render paginated preview"
```

### Task 6: Export each page as PNG

**Files:**
- Create: `components/export/export-pages.ts`
- Modify: `components/editor/SoftPageEditor.tsx`
- Modify: `components/preview/PageCanvas.tsx`

- [ ] **Step 1: Write the failing test**

Manually verify the preview cannot yet export PNG files.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: the export button is present but inactive or missing.

- [ ] **Step 3: Write minimal implementation**

Use `html2canvas` to capture each rendered page node one by one and trigger a download for each PNG.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: exporting a multi-page article downloads multiple PNG files.

- [ ] **Step 5: Commit**

```bash
git add components/export components/editor components/preview
git commit -m "feat: export paginated pages as png"
```

### Task 7: Polish errors and empty states

**Files:**
- Modify: `components/editor/SoftPageEditor.tsx`
- Modify: `components/export/export-pages.ts`

- [ ] **Step 1: Write the failing test**

Manually verify image upload failures and export failures are not surfaced clearly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: there is no visible error state yet.

- [ ] **Step 3: Write minimal implementation**

Show upload and export errors inline without clearing content. Keep the editor usable after a failure.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: errors are visible and the current article stays intact.

- [ ] **Step 5: Commit**

```bash
git add components/editor components/export
git commit -m "feat: add upload and export error states"
```

## Self-Review

### Spec coverage
- 米白色背景: Task 5
- 正文输入: Task 3
- 行高/字号/字重/段间距/页边距: Task 3
- 手动上传图片并插入正文流: Task 4
- 自动分页到多个 `3:4` 画布: Task 5
- 按页导出多张 PNG: Task 6
- 左对齐默认: Task 5

### Placeholder scan
- No `TBD`, `TODO`, or vague task descriptions remain.

### Type consistency
- `Block`, `TextBlock`, `ImageBlock`, and `TypographyConfig` are used consistently across tasks.
- Pagination and export both operate on the same rendered block model.

