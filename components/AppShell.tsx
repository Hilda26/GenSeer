'use client'

import Navbar from './Navbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
