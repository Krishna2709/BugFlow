import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BugFlow - Automated Bug Bounty Report Management',
  description: 'Streamline your bug bounty program with AI-powered report analysis, duplicate detection, and automated engineer assignment.',
  keywords: ['bug bounty', 'security', 'vulnerability management', 'AI analysis'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}