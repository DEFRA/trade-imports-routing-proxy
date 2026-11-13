import { createPublicKey } from 'node:crypto'
import Jwt from '@hapi/jwt'

import { config } from '#/config/config.js'

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`)
  }

  return response.json()
}

/**
 * Fetches the identity provider's OIDC discovery document, retrying with
 * back-off before giving up.
 * @param {import('pino').Logger} logger
 * @returns {Promise<Record<string, any>>} the discovery document
 */
export async function fetchOidcDiscovery(logger) {
  const discoveryUrl = config.get('defraId.oidcDiscoveryUrl')
  const retryDelaysMs = [1000, 2000, 4000]

  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchJson(discoveryUrl)
    } catch (err) {
      const delayMs = retryDelaysMs[attempt - 1]

      if (delayMs === undefined) {
        throw new Error(
          `OIDC discovery at ${discoveryUrl} failed after ${attempt} attempts`,
          { cause: err }
        )
      }

      logger.warn(
        { err, discoveryUrl, attempt },
        'OIDC discovery failed, retrying'
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Checks a token's RS256 signature against the identity provider's published
 * keys, and returns its claims. Throws when no published key signed it.
 * @param {string} token
 * @param {string} jwksUri
 * @returns {Promise<Record<string, any>>} the token's claims
 */
export async function readVerifiedClaims(token, jwksUri) {
  const decoded = Jwt.token.decode(token)
  const { kid } = decoded.decoded.header
  const { keys } = await fetchJson(jwksUri)
  const signingKey = keys.find((key) => key.kid === kid)

  if (!signingKey) {
    throw new Error(`No key ${kid} published at ${jwksUri}`)
  }

  const publicKey = createPublicKey({ key: signingKey, format: 'jwk' }).export({
    type: 'spki',
    format: 'pem'
  })
  Jwt.token.verifySignature(decoded, { key: publicKey, algorithm: 'RS256' })

  return decoded.decoded.payload
}
