/**
 * Binary search the failing lines in the original file
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

async function schemaCheck(code) {
  try {
    await client.getContractSchemaForCode(code)
    return true
  } catch (err) {
    return false
  }
}

const lines = readFileSync(join(ROOT, 'contracts', 'genlayer', 'genseer_market.py'), 'utf8').split('\n')
console.log(`Total lines: ${lines.length}`)

// We know: first half might work, second half might fail
// Let's find the minimum number of lines from the start that causes failure
let lo = 1
let hi = lines.length
let lastFailing = hi

console.log('Binary searching for minimum failing prefix...')

while (lo <= hi) {
  const mid = Math.floor((lo + hi) / 2)
  const code = lines.slice(0, mid).join('\n')
  const ok = await schemaCheck(code)
  process.stdout.write(`  Lines 1-${mid}: ${ok ? '✅' : '❌'}  `)
  if (ok) {
    // More lines needed to reproduce the failure
    lo = mid + 1
    console.log('(need more)')
  } else {
    // This prefix fails — maybe fewer lines also fail
    lastFailing = mid
    hi = mid - 1
    console.log('(fails — try fewer)')
  }
}

console.log()
console.log(`Minimum failing prefix: lines 1-${lastFailing}`)
console.log(`Line ${lastFailing}:`, JSON.stringify(lines[lastFailing - 1]))
console.log(`Line ${lastFailing - 1}:`, JSON.stringify(lines[lastFailing - 2]))
console.log(`Line ${lastFailing - 5} to ${lastFailing}:`)
for (let i = Math.max(0, lastFailing - 6); i < lastFailing; i++) {
  console.log(`  ${i+1}: ${lines[i]}`)
}
