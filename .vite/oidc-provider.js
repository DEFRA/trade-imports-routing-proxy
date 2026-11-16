import { generateKeyPairSync } from 'node:crypto'
import { createServer } from 'node:http'
import Jwt from '@hapi/jwt'

const providerOrigin = 'http://localhost:3007'
const signingKeyId = 'test-signing-key'

export const discoveryUrl = `${providerOrigin}/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration`

export const discoveryDocument = {
  issuer: `${providerOrigin}/issuer/v2.0/`,
  authorization_endpoint: `${providerOrigin}/oauth2/v2.0/authorize`,
  token_endpoint: `${providerOrigin}/oauth2/v2.0/token`,
  jwks_uri: `${providerOrigin}/discovery/v2.0/keys`
}

const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })

export function generateUnpublishedKey() {
  return generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
}

export function signToken(claims, privateKey = signingKeys.privateKey) {
  return Jwt.token.generate(
    claims,
    {
      key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      algorithm: 'RS256'
    },
    { header: { kid: signingKeyId } }
  )
}

const publishedKeys = {
  keys: [
    {
      ...signingKeys.publicKey.export({ format: 'jwk' }),
      kid: signingKeyId,
      use: 'sig'
    }
  ]
}

export function serveOidcProvider(discovery = discoveryDocument) {
  global.fetch.mockResponse((request) => {
    if (request.url === discoveryUrl) {
      return JSON.stringify(discovery)
    }
    if (request.url === discoveryDocument.jwks_uri) {
      return JSON.stringify(publishedKeys)
    }
    return { status: 404, body: '' }
  })
}

export async function startTokenEndpoint(tokenResponse) {
  const tokenServer = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(tokenResponse))
  })
  await new Promise((resolve) => tokenServer.listen(0, '127.0.0.1', resolve))

  return {
    url: `http://127.0.0.1:${tokenServer.address().port}/oauth2/v2.0/token`,
    stop: () => new Promise((resolve) => tokenServer.close(resolve))
  }
}
