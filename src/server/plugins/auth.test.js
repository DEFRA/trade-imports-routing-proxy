import { createServer } from '#/server/server.js'
import {
  discoveryDocument,
  discoveryUrl,
  serveOidcProvider
} from '#/test-helpers/oidc-provider.js'

describe('#auth', () => {
  test('Should refuse to start when OIDC discovery publishes no issuer', async () => {
    const { issuer, ...discoveryWithoutIssuer } = discoveryDocument
    serveOidcProvider(discoveryWithoutIssuer)

    await expect(createServer()).rejects.toThrow(
      `OIDC discovery at ${discoveryUrl} publishes no issuer`
    )
  })
})
