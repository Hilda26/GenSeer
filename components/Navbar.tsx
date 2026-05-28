'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@/contexts/WalletContext'

const NAV_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/markets/create', label: 'Create' },
  { href: '/profile', label: 'Profile' },
  { href: '/reputation', label: 'Reputation' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16"
      style={{
        background: 'rgba(7, 10, 19, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--electric-blue))', color: 'white' }}
        >
          GS
        </div>
        <span className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>
          GenSeer
        </span>
      </Link>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              color: pathname === link.href ? 'var(--text-main)' : 'var(--text-muted)',
              background: pathname === link.href ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Wallet */}
      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--signal-green)' }} />
            <span className="font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ color: 'var(--text-faint)', border: '1px solid var(--border)' }}
            title="Disconnect wallet"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="genseer-button text-sm px-5 py-2"
          style={{ opacity: isConnecting ? 0.7 : 1 }}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </nav>
  )
}
