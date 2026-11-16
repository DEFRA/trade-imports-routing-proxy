import { afterEach, describe, expect, test } from 'vitest'

import { config } from './config.js'

describe('config URL validation', () => {
  const originalOidcDiscoveryUrl = config.get('defraId.oidcDiscoveryUrl')
  const originalRedirectUrl = config.get('defraId.redirectUrl')

  afterEach(() => {
    config.set('defraId.oidcDiscoveryUrl', originalOidcDiscoveryUrl)
    config.set('defraId.redirectUrl', originalRedirectUrl)
  })

  test('rejects a malformed defraId.oidcDiscoveryUrl', () => {
    config.set('defraId.oidcDiscoveryUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow(
      'defraId.oidcDiscoveryUrl: must be a URL'
    )
  })

  test('rejects a malformed defraId.redirectUrl', () => {
    config.set('defraId.redirectUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow(
      'defraId.redirectUrl: must be a URL'
    )
  })
})
