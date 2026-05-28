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

const code = readFileSync(join(ROOT, 'contracts', 'genlayer', 'genseer_market.py'), 'utf8')
console.log(`File: ${code.length} bytes, ${code.split('\n').length} lines`)

process.stdout.write('Schema check... ')
try {
  const schema = await client.getContractSchemaForCode(code)
  const methods = Object.keys(schema.methods || {})
  console.log(`✅ OK — ${methods.length} methods: ${methods.join(', ')}`)
} catch (err) {
  const m = err.message.match(/"message":\s*"([^"]+)"/)
  const stdoutM = err.message.match(/"stdout":\s*"((?:[^"\\]|\\.)*)"/);
  const stderrM = err.message.match(/"stderr":\s*"((?:[^"\\]|\\.)*)"/);
  console.log(`❌ FAIL: ${m ? m[1] : 'unknown'}`)
  if (stdoutM?.[1]) console.log('stdout:', stdoutM[1].slice(0, 300))
  if (stderrM?.[1]) console.log('stderr:', stderrM[1].slice(0, 300))
  process.exit(1)
}
