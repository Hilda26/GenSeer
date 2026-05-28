/**
 * GenSeer Contract Deployment Script
 * Usage: node scripts/deploy-contract.mjs
 *
 * Deploys contracts/genlayer/genseer_market.py to GenLayer Studionet.
 * After success, copy the printed contract address into:
 *   NEXT_PUBLIC_GENSEER_MARKET_CONTRACT=<address>
 * in your .env.local file.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Load env manually (no dotenv dep needed) ─────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    env[key] = val
  }
  return env
}

const env = loadEnv()

const OPERATOR_KEY = env['GENLAYER_OPERATOR_KEY']
if (!OPERATOR_KEY || !OPERATOR_KEY.startsWith('0x')) {
  console.error('❌  GENLAYER_OPERATOR_KEY missing or invalid in .env.local')
  process.exit(1)
}

const contractCode = readFileSync(
  join(ROOT, 'contracts', 'genlayer', 'genseer_market.py'),
  'utf8'
)

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║         GenSeer Contract Deployment → Studionet          ║')
console.log('╚══════════════════════════════════════════════════════════╝')
console.log()

const account = createAccount(OPERATOR_KEY)
console.log('Operator address :', account.address)
console.log('Network          : GenLayer Studionet (https://studio.genlayer.com)')
console.log('Contract size    :', contractCode.length, 'bytes')
console.log()

const client = createClient({ chain: studionet, account })

console.log('⏳  Sending deploy transaction...')

let deployTxHash
try {
  deployTxHash = await client.deployContract({ code: contractCode })
  console.log('✅  Deploy tx sent:', deployTxHash)
} catch (err) {
  console.error('❌  Deploy transaction failed:', err.message)
  console.error()
  console.error('Common causes:')
  console.error('  • Operator address has no testnet GEN tokens')
  console.error('    → Visit https://studio.genlayer.com and fund:', account.address)
  console.error('  • Studionet RPC unreachable — check your internet connection')
  process.exit(1)
}

console.log()
console.log('⏳  Waiting for finality (this can take 30–120 seconds on Studionet)...')

let receipt
try {
  receipt = await client.waitForTransactionReceipt({
    hash: deployTxHash,
    interval: 3000,
    retries: 60,
  })
} catch (err) {
  console.error('❌  Waiting for receipt failed:', err.message)
  console.error('    The deploy tx may still succeed. Check Studionet explorer:')
  console.error('   ', deployTxHash)
  process.exit(1)
}

// Extract deployed contract address
// GenLayer receipt uses snake_case: data.contract_address
const contractAddress =
  receipt?.data?.contract_address ||
  receipt?.txDataDecoded?.contractAddress ||
  receipt?.to_address ||
  null

console.log()
console.log('═══════════════════════════════════════════════════════════')
if (contractAddress) {
  console.log('🎉  Contract deployed successfully!')
  console.log()
  console.log('Contract address:', contractAddress)
  console.log()
  console.log('Next step — add this to your .env.local:')
  console.log()
  console.log(`  NEXT_PUBLIC_GENSEER_MARKET_CONTRACT=${contractAddress}`)
  console.log()
  console.log('Then restart the dev server: npm run dev')
} else {
  console.log('⚠️   Transaction finalized but contract address not found in receipt.')
  console.log('     Full receipt:')
  console.log(JSON.stringify(receipt, null, 2))
  console.log()
  console.log('     Deploy tx hash:', deployTxHash)
  console.log('     Check the Studionet explorer for the contract address.')
}
console.log('═══════════════════════════════════════════════════════════')
