import Link from 'next/link'
import { MARKET_CATEGORIES } from '@/lib/utils/constants'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-6 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
               style={{ background: 'var(--primary)' }} />
          <div className="absolute top-20 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
               style={{ background: 'var(--electric-blue)' }} />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
               style={{ background: 'rgba(108, 92, 231, 0.15)', border: '1px solid rgba(108, 92, 231, 0.3)', color: 'var(--primary-glow)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--signal-green)' }} />
            GenLayer-Native · No OpenAI · No Solidity Escrow
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6" style={{ color: 'var(--text-main)' }}>
            Turn Internet Debates into{' '}
            <span className="glow-text" style={{ color: 'var(--primary-glow)' }}>
              GenLayer-Settled
            </span>{' '}
            Markets
          </h1>
          <p className="text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-muted)' }}>
            Stake on subjective outcomes. Evidence is organised transparently. GenLayer reasons over it.
            The same intelligent contract records pools, payouts, refunds, and claims.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/markets" className="genseer-button text-base px-8 py-4">
              Browse Markets
            </Link>
            <Link href="/markets/create"
              className="text-base px-8 py-4 rounded-full font-bold transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-main)', background: 'rgba(255,255,255,0.03)' }}>
              Create Market
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text-main)' }}>How GenSeer Works</h2>
          <p style={{ color: 'var(--text-muted)' }}>Transparent. Evidence-based. GenLayer-settled.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Create Market', desc: 'Define outcomes, set evidence rules, and register the market on GenLayer.' },
            { step: '02', title: 'Stake on Outcomes', desc: 'Record testnet stakes into outcome pools. GenLayer tracks all accounting.' },
            { step: '03', title: 'Submit Evidence', desc: 'Users add evidence and challenge each other. Supabase organises it all.' },
            { step: '04', title: 'GenLayer Settles', desc: 'Validator LLM consensus reasons over evidence and records the verdict on-chain.' },
          ].map((item) => (
            <div key={item.step} className="genseer-card p-6">
              <div className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--primary-glow)' }}>{item.step}</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-main)' }}>{item.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why GenLayer */}
      <section className="px-6 py-20" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-6" style={{ color: 'var(--text-main)' }}>No OpenAI. GenLayer Judges and Accounts.</h2>
          <p className="text-lg mb-10" style={{ color: 'var(--text-muted)' }}>
            GenSeer does not call OpenAI, Claude, or any external AI API for settlement.
            GenLayer validator LLM consensus performs reasoning. The same intelligent contract
            records parimutuel pools, payout entitlements, refund entitlements, and claims.
            Pools show market belief, not truth. GenLayer decides truth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '⚖️', title: 'Supabase Organises', desc: 'Evidence, stakes, and activity are indexed for fast UI.' },
              { icon: '🔮', title: 'GenLayer Judges', desc: 'Validator LLM consensus reasons over evidence and decides the winner.' },
              { icon: '📊', title: 'GenLayer Accounts', desc: 'Pools, payouts, refunds, and claims are recorded on-chain.' },
            ].map((item) => (
              <div key={item.title} className="genseer-card p-8">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-main)' }}>{item.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text-main)' }}>Market Categories</h2>
          <p style={{ color: 'var(--text-muted)' }}>Subjective outcomes. Objective process.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MARKET_CATEGORIES.map((cat) => (
            <Link key={cat.value} href={`/markets?category=${cat.value}`}>
              <div className="genseer-card p-8 hover:border-primary transition-all cursor-pointer group"
                   style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary-glow transition-colors"
                    style={{ color: 'var(--text-main)' }}>
                  {cat.label}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {cat.value === 'crypto_launch' && 'Did a project launch create real adoption?'}
                  {cat.value === 'creator_influence' && 'Did a creator move the needle on a project?'}
                  {cat.value === 'community_sentiment' && 'How did community feel after an announcement?'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto genseer-card p-12">
          <h2 className="text-3xl font-black mb-4" style={{ color: 'var(--text-main)' }}>
            Ready to stake your prediction?
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet, stake on outcomes, submit evidence, and let GenLayer settle the debate.
          </p>
          <Link href="/markets" className="genseer-button text-base px-10 py-4 inline-block">
            Enter GenSeer
          </Link>
        </div>
      </section>
    </div>
  )
}
