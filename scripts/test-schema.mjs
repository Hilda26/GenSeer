/**
 * Test contract schema parsing and narrow down what's causing invalid_contract
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

const HEADER = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
`

// First: check if the full contract schema parses
const fullCode = readFileSync(join(ROOT, 'contracts', 'genlayer', 'genseer_market.py'), 'utf8')

console.log('── getContractSchemaForCode (full contract) ──')
try {
  const schema = await client.getContractSchemaForCode(fullCode)
  console.log('✅ Schema OK — methods:', Object.keys(schema.methods).join(', '))
} catch (err) {
  console.log('❌ Schema ERROR:', err.message.slice(0, 300))
}

// Test: u256 as parameter type
const u256Params = HEADER + `
from genlayer import *

class TestU256Params(gl.Contract):
    count: u256

    def __init__(self):
        self.count = 0

    @gl.public.write
    def set_count(self, value: u256) -> str:
        self.count = value
        return "ok"

    @gl.public.view
    def get_count(self) -> u256:
        return self.count
`

async function testDeploy(label, code) {
  process.stdout.write(`Deploying: ${label}... `)
  try {
    const txHash = await client.deployContract({ code })
    const receipt = await client.waitForTransactionReceipt({ hash: txHash, interval: 3000, retries: 20 })
    const lr = receipt?.consensus_data?.leader_receipt?.[0]
    const ok = lr?.execution_result === 'SUCCESS'
    console.log(ok ? `✅ OK` : `❌ FAIL: ${JSON.stringify(lr?.result)}`)
    return ok
  } catch (err) {
    console.log(`❌ ERROR: ${err.message.slice(0, 200)}`)
    return false
  }
}

await testDeploy('u256 as parameter type', u256Params)

// Test: 5 TreeMap fields
const fiveTreeMaps = HEADER + `
from genlayer import *

class TestFiveTreeMaps(gl.Contract):
    owner: Address
    market_count: u256
    settlement_count: u256
    markets: TreeMap[str, str]
    stakes: TreeMap[str, str]
    user_market_stakes: TreeMap[str, str]
    settlements: TreeMap[str, str]
    claims: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.market_count = 0
        self.settlement_count = 0

    @gl.public.view
    def get_count(self) -> int:
        return int(self.market_count)
`
await testDeploy('5 TreeMaps + 2 u256 + Address', fiveTreeMaps)
