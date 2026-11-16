import { vi } from 'vitest'

import { getOidcConfigWithRetry, readVerifiedClaims } from './oidc-provider.js'
import {
  discoveryDocument,
  discoveryUrl,
  generateUnpublishedKey,
  signToken
} from '#/test-helpers/oidc-provider.js'

const logger = { warn: vi.fn() }

describe('#getOidcConfigWithRetry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('Should return the discovery document', async () => {
    await expect(getOidcConfigWithRetry(logger)).resolves.toEqual(
      discoveryDocument
    )
  })

  test('Should return the discovery document once a retry succeeds', async () => {
    vi.useFakeTimers()
    global.fetch.mockResponseOnce('', { status: 503 })

    const discovery = getOidcConfigWithRetry(logger)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(discovery).resolves.toEqual(discoveryDocument)
  })

  test('Should give up after three retries', async () => {
    vi.useFakeTimers()
    global.fetch.mockResponse('', { status: 503 })

    const discovery = getOidcConfigWithRetry(logger)
    const refusal = expect(discovery).rejects.toThrow(
      `OIDC discovery at ${discoveryUrl} failed after 4 attempts`
    )
    await vi.advanceTimersByTimeAsync(7000)

    await refusal
  })
})

describe('#readVerifiedClaims', () => {
  const identityProvider = {
    jwksUri: discoveryDocument.jwks_uri,
    issuer: discoveryDocument.issuer
  }

  test('Should return the claims of a token signed by a published key', async () => {
    const token = signToken({ sessionId: 'session-1', contactId: 2100010101 })

    const claims = await readVerifiedClaims(token, identityProvider)

    expect(claims).toEqual(
      expect.objectContaining({ sessionId: 'session-1', contactId: 2100010101 })
    )
  })

  test('Should refuse a token whose kid names no published key', async () => {
    const token = signToken({ sessionId: 'session-1' }, { kid: 'retired-key' })

    await expect(readVerifiedClaims(token, identityProvider)).rejects.toThrow(
      `No key retired-key published at ${discoveryDocument.jwks_uri}`
    )
  })

  test('Should refuse a token signed by a key other than the published one with its kid', async () => {
    const token = signToken(
      { sessionId: 'session-1' },
      { privateKey: generateUnpublishedKey() }
    )

    await expect(readVerifiedClaims(token, identityProvider)).rejects.toThrow(
      'Invalid token signature'
    )
  })

  test('Should refuse an expired token', async () => {
    const token = signToken({
      sessionId: 'session-1',
      exp: Math.floor(Date.now() / 1000) - 60
    })

    await expect(readVerifiedClaims(token, identityProvider)).rejects.toThrow(
      'Token expired'
    )
  })

  test('Should refuse a token from another issuer', async () => {
    const token = signToken({
      sessionId: 'session-1',
      iss: 'https://another-issuer.example/v2.0/'
    })

    await expect(readVerifiedClaims(token, identityProvider)).rejects.toThrow(
      'Token payload iss value not allowed'
    )
  })
})
