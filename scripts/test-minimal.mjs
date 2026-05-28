import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

// Test 1: No Depends header
const noHeader = `
from genlayer import *

class HelloWorld(gl.Contract):
    message: str

    def __init__(self):
        self.message = "hello"

    @gl.public.view
    def get_message(self) -> str:
        return self.message
`

// Test 2: With the current Depends header
const withCurrentHeader = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class HelloWorld2(gl.Contract):
    message: str

    def __init__(self):
        self.message = "hello2"

    @gl.public.view
    def get_message(self) -> str:
        return self.message
`

async function testDeploy(label, code) {
  console.log(`\n── ${label} ──`)
  try {
    const txHash = await client.deployContract({ code })
    console.log('Deploy tx:', txHash)
    const receipt = await client.waitForTransactionReceipt({ hash: txHash, interval: 3000, retries: 20 })
    const lr = receipt?.consensus_data?.leader_receipt?.[0]
    console.log('execution_result:', lr?.execution_result)
    console.log('result.status:', lr?.result?.status)
    console.log('result.payload:', lr?.result?.payload)
    console.log('tx status:', receipt.status, '| tx result:', receipt.result)
  } catch (err) {
    console.error('Error:', err.message)
  }
}

await testDeploy('No Depends header', noHeader)
await testDeploy('With current Depends hash', withCurrentHeader)
