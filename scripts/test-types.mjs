/**
 * Iteratively test which feature of genseer_market.py causes invalid_contract
 */
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

const HEADER = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
`

async function testDeploy(label, code) {
  process.stdout.write(`Testing ${label}... `)
  try {
    const txHash = await client.deployContract({ code: HEADER + code })
    const receipt = await client.waitForTransactionReceipt({ hash: txHash, interval: 3000, retries: 20 })
    const lr = receipt?.consensus_data?.leader_receipt?.[0]
    const ok = lr?.execution_result === 'SUCCESS'
    const payload = JSON.stringify(lr?.result?.payload)
    console.log(ok ? `✅ OK` : `❌ FAIL: ${lr?.result?.status} / ${payload}`)
    return ok
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`)
    return false
  }
}

// Test: TreeMap
await testDeploy('TreeMap storage', `
from genlayer import *

class TestTreeMap(gl.Contract):
    data: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.write
    def put(self, key: str, value: str) -> None:
        self.data[key] = value

    @gl.public.view
    def get(self, key: str) -> str:
        return self.data.get(key, "")
`)

// Test: Address + u256
await testDeploy('Address + u256 types', `
from genlayer import *

class TestTypes(gl.Contract):
    owner: Address
    count: u256

    def __init__(self):
        self.owner = gl.message.sender_address
        self.count = 0

    @gl.public.view
    def get_count(self) -> int:
        return int(self.count)
`)

// Test: TreeMap + Address + u256 combined
await testDeploy('TreeMap + Address + u256', `
from genlayer import *
import json

class TestCombined(gl.Contract):
    owner: Address
    count: u256
    data: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.count = 0

    @gl.public.write
    def store(self, key: str, val: str) -> None:
        self.data[key] = val
        self.count += 1

    @gl.public.view
    def fetch(self, key: str) -> str:
        return self.data.get(key, "")
`)

// Test: gl.get_webpage (the LLM call)
await testDeploy('gl.get_webpage', `
from genlayer import *
import json

class TestGetWebpage(gl.Contract):
    result: str

    def __init__(self):
        self.result = ""

    @gl.public.write
    def fetch_url(self, url: str) -> None:
        content = gl.get_webpage(url, mode="text")
        self.result = content[:100]

    @gl.public.view
    def get_result(self) -> str:
        return self.result
`)
