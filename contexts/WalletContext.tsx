'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface WalletContextValue {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
})

const STORAGE_KEY = 'genseer_wallet'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    // Silently verify MetaMask still has the account
    const eth = (window as any).ethereum
    if (!eth) { localStorage.removeItem(STORAGE_KEY); return }
    eth.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setAddress(accounts[0].toLowerCase())
        else localStorage.removeItem(STORAGE_KEY)
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
  }, [])

  // Handle MetaMask account changes
  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null)
        localStorage.removeItem(STORAGE_KEY)
      } else {
        setAddress(accounts[0].toLowerCase())
        localStorage.setItem(STORAGE_KEY, accounts[0].toLowerCase())
      }
    }
    eth.on('accountsChanged', handleAccountsChanged)
    return () => eth.removeListener('accountsChanged', handleAccountsChanged)
  }, [])

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum
    if (!eth) {
      setError('MetaMask not detected. Please install MetaMask to connect.')
      return
    }
    try {
      setIsConnecting(true)
      setError(null)
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
      const addr = accounts[0].toLowerCase()
      setAddress(addr)
      localStorage.setItem(STORAGE_KEY, addr)
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected. Please accept the MetaMask request.')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <WalletContext.Provider value={{
      address,
      isConnected: !!address,
      isConnecting,
      error,
      connect,
      disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
