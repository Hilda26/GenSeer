/**
 * Verify the deployed GenSeer contract is live on Studionet
 */
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const CONTRACT = '0xdE5B120aba144B94E1253815C64118b43ba16938'
const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'

const client = createClient({ chain: studionet, account: createAccount(OPERATOR_KEY) })

console.log('Verifying contract at', CONTRACT, '...\n')

async function callView(method, args = []) {
  const result = await client.readContract({
    address: CONTRACT,
    functionName: method,
    args,
    jsonSafeReturn: true,
  })
  return result
}

try {
  const version = await callView('contract_version')
  console.log('✅ contract_version:', version)

  const totalMarkets = await callView('total_markets')
  console.log('✅ total_markets:', totalMarkets)

  const totalSettlements = await callView('total_settlements')
  console.log('✅ total_settlements:', totalSettlements)

  const fakeMarket = await callView('get_market', ['nonexistent-id'])
  console.log('✅ get_market(nonexistent):', fakeMarket)

  console.log('\n🎉 Contract is live and responding correctly!')
  console.log('   Address:', CONTRACT)
  console.log('   Network: GenLayer Studionet')
} catch (err) {
  console.error('❌ Contract verification failed:', err.message.slice(0, 300))
}
