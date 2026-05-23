import type { Metadata } from 'next'
import { Geist, JetBrains_Mono, Noto_Serif_SC } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoftPage',
  description: 'Fixed-ratio article editor',
}

const uiSans = Geist({
  subsets: ['latin'],
  variable: '--font-ui',
})

const bodySerif = Noto_Serif_SC({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})

const codeMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${uiSans.variable} ${bodySerif.variable} ${codeMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
