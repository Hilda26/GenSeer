import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

const HEADER = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
`

async function schemaCheck(label, code) {
  process.stdout.write(`Schema: ${label}... `)
  try {
    const schema = await client.getContractSchemaForCode(code)
    console.log('✅ OK —', Object.keys(schema.methods || {}).length, 'methods')
    return true
  } catch (err) {
    const msg = err.message
    const m = msg.match(/"message":\s*"([^"]+)"/)
    console.log('❌ FAIL:', m ? m[1] : msg.slice(0, 150))
    return false
  }
}

// Test with Unicode box-drawing dividers in comments
await schemaCheck('Unicode ─── in comments', HEADER + `
from genlayer import *

# ─── helpers ────────────────────────────────────────────────────────────

class TestUnicode(gl.Contract):
    count: u256

    # ─── init ────────────────────────────────────────────────────────────

    def __init__(self):
        self.count = 0

    # ─── public views ────────────────────────────────────────────────────

    @gl.public.view
    def get_count(self) -> int:
        return int(self.count)
`)

// Test without Unicode in comments
await schemaCheck('ASCII-only comments', HEADER + `
from genlayer import *

# --- helpers ---

class TestAscii(gl.Contract):
    count: u256

    # --- init ---

    def __init__(self):
        self.count = 0

    # --- public views ---

    @gl.public.view
    def get_count(self) -> int:
        return int(self.count)
`)
