import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FocusSync — 실시간 같이 공부',
    template: '%s | FocusSync',
  },
  description: '친구들과 함께 집중하고, 포모도로 타이머로 레벨업하고, 랭킹을 경쟁하세요.',
  keywords: ['공부', '포모도로', '집중', '스터디', '게임화', '랭킹'],
  authors: [{ name: 'FocusSync Team' }],
  openGraph: {
    title: 'FocusSync — 실시간 같이 공부',
    description: '친구들과 함께 집중하고, 포모도로 타이머로 레벨업하세요.',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FocusSync',
    description: '실시간 같이 공부 + 집중력 게임화 플랫폼',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
