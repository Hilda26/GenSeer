/**
 * GenLayer Studionet client — genlayer-js v1.1.7
 *
 * - Uses the official SDK's `createClient({ chain: studionet })`
 * - Signing uses the server-side GENLAYER_OPERATOR_KEY (never NEXT_PUBLIC_)
 * - Exported surface matches the old stub so market.ts callers need no changes
 */

import { createClient, createAccount, generatePrivateKey } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import type { CalldataEncodable, TransactionHash } from 'genlayer-js/types'
import type { Address } from 'viem'

// ─── Contract address ─────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_GENSEER_MARKET_CONTRACT ||
  '0x0000000000000000000000000000000000000000'
) as Address

// ─── Operator account (server-side signer only) ───────────────────────────────
function buildOperatorAccount() {
  const raw = process.env.GENLAYER_OPERATOR_KEY as `0x${string}` | undefined
  const key = raw && raw.startsWith('0x') ? raw : generatePrivateKey()
  return createAccount(key)
}

// ─── Singleton client ─────────────────────────────────────────────────────────
let _client: ReturnType<typeof createClient> | null = null

export function getGenLayerClient(): ReturnType<typeof createClient> {
  if (!_client) {
    _client = createClient({
      chain: studionet,
      account: buildOperatorAccount(),
    })
  }
  return _client
}

// ─── Public result type ───────────────────────────────────────────────────────
export interface GenLayerCallResult {
  success: boolean
  txHash?: string
  result?: unknown
  error?: string
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function genLayerReadContract(
  method: string,
  args: CalldataEncodable[] = []
): Promise<unknown> {
  const client = getGenLayerClient()
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    jsonSafeReturn: true,
  })
}

// ─── Write ────────────────────────────────────────────────────────────────────
/**
 * @param _senderAddress  Kept for API compatibility (user wallet address for
 *                         Supabase record-keeping). The actual on-chain signer
 *                         is the server-side operator account set in the client.
 */
export async function genLayerWriteContract(
  _senderAddress: string,
  method: string,
  args: CalldataEncodable[]
): Promise<GenLayerCallResult> {
  const client = getGenLayerClient()
  try {
    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: method,
      args,
      value: BigInt(0),
    })
    return { success: true, txHash: txHash as string }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ─── Wait for finality ────────────────────────────────────────────────────────
export async function waitForTransaction(txHash: string): Promise<GenLayerCallResult> {
  const client = getGenLayerClient()
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as TransactionHash,
      interval: 2000,
      retries: 60,
    })
    return { success: true, txHash, result: receipt }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ─── Deploy (one-time contract deployment) ────────────────────────────────────
export async function deployGenSeerContract(code: string): Promise<string> {
  const client = getGenLayerClient()
  const txHash = await client.deployContract({ code })
  return txHash
}

// ─── Get single transaction ───────────────────────────────────────────────────
export async function getGenLayerTransaction(txHash: string) {
  const client = getGenLayerClient()
  return client.getTransaction({ hash: txHash as TransactionHash })
}
