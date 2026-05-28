'use client'

import CreateMarketForm from '@/components/CreateMarketForm'

export default function CreateMarketPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>
          Create Market
        </h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          Define outcomes, set settlement criteria, and register your market on GenLayer.
        </p>
      </div>
      <CreateMarketForm />
    </div>
  )
}
