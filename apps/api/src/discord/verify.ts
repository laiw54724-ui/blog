import { verifyKey } from 'discord-interactions'

export async function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string
): Promise<boolean> {
  try {
    return verifyKey(body, signature, timestamp, publicKey)
  } catch {
    return false
  }
}
