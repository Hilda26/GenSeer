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

async function schemaCheck(label, code) {
  process.stdout.write(`${label}... `)
  try {
    const schema = await client.getContractSchemaForCode(code)
    const methods = Object.keys(schema.methods || {})
    console.log(`✅ OK (${methods.length} methods)`)
    return true
  } catch (err) {
    const msg = err.message
    const m = msg.match(/"message":\s*"([^"]+)"/)
    const stdoutM = msg.match(/"stdout":\s*"((?:[^"\\]|\\.)*)"/);
    const stderrM = msg.match(/"stderr":\s*"((?:[^"\\]|\\.)*)"/);
    console.log(`❌ FAIL: ${m ? m[1] : 'unknown'}`)
    if (stdoutM?.[1] && stdoutM[1].length > 2) console.log('  stdout:', stdoutM[1].slice(0, 300))
    if (stderrM?.[1] && stderrM[1].length > 2) console.log('  stderr:', stderrM[1].slice(0, 300))
    return false
  }
}

const originalCode = readFileSync(join(ROOT, 'contracts', 'genlayer', 'genseer_market.py'), 'utf8')
console.log('File size:', originalCode.length, 'bytes, lines:', originalCode.split('\n').length)

await schemaCheck('Exact original file', originalCode)

// Try with all comments stripped
const noComments = originalCode.split('\n')
  .map(line => {
    // Remove full-line comments (but not the header lines 1-2)
    if (line.trimStart().startsWith('#')) return ''
    return line
  })
  .join('\n')
console.log('No-comments size:', noComments.length)

await schemaCheck('Original without comments', noComments)

// Try UTF-8 → ASCII by replacing unicode chars
const asciiOnly = originalCode.replace(/[^\x00-\x7F]/g, '-')
await schemaCheck('Original with unicode replaced by dashes', asciiOnly)
