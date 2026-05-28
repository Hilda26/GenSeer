import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import { WalletProvider } from '@/contexts/WalletContext'

export const metadata: Metadata = {
  title: 'GenSeer — Turn Internet Debates into GenLayer-Settled Markets',
  description: 'GenLayer-native parimutuel prediction market for subjective internet-native outcomes. No OpenAI. GenLayer judges and accounts.',
  keywords: ['prediction market', 'GenLayer', 'parimutuel', 'subjective markets', 'web3'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <AppShell>{children}</AppShell>
        </WalletProvider>
      </body>
    </html>
  )
}
