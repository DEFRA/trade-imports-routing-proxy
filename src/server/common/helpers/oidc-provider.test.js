import { vi } from 'vitest'

import { fetchOidcDiscovery, readVerifiedClaims } from './oidc-provider.js'
import {
  discoveryDocument,
  discoveryUrl,
  generateUnpublishedKey,
  signToken
} from '../../../../.vite/oidc-provider.js'

const logger = { warn: vi.fn() }

describe('#fetchOidcDiscovery', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('Should return the discovery document', async () => {
    await expect(fetchOidcDiscovery(logger)).resolves.toEqual(discoveryDocument)
  })

  test('Should return the discovery document once a retry succeeds', async () => {
    vi.useFakeTimers()
    global.fetch.mockResponseOnce('', { status: 503 })

    const discovery = fetchOidcDiscovery(logger)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(discovery).resolves.toEqual(discoveryDocument)
  })

  test('Should give up after three retries', async () => {
    vi.useFakeTimers()
    global.fetch.mockResponse('', { status: 503 })

    const discovery = fetchOidcDiscovery(logger)
    const refusal = expect(discovery).rejects.toThrow(
      `OIDC discovery at ${discoveryUrl} failed after 4 attempts`
    )
    await vi.advanceTimersByTimeAsync(7000)

    await refusal
  })
})

describe('#readVerifiedClaims', () => {
  test('Should return the claims of a token signed by a published key', async () => {
    const token = signToken({ sessionId: 'session-1', contactId: 2100010101 })

    const claims = await readVerifiedClaims(token, discoveryDocument.jwks_uri)

    expect(claims).toEqual(
      expect.objectContaining({ sessionId: 'session-1', contactId: 2100010101 })
    )
  })

  test('Should refuse a token signed by an unpublished key', async () => {
    const token = signToken(
      { sessionId: 'session-1' },
      generateUnpublishedKey()
    )

    await expect(
      readVerifiedClaims(token, discoveryDocument.jwks_uri)
    ).rejects.toThrow()
  })
})
