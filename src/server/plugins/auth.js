import Bell from '@hapi/bell'

import { config } from '#/config/config.js'
import { getOidcConfigWithRetry } from '#/server/common/helpers/oidc-provider.js'

function defraIdBellOptions(discovery) {
  const clientId = config.get('defraId.clientId')

  return {
    provider: {
      name: 'defra-id',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: discovery.authorization_endpoint,
      token: discovery.token_endpoint,
      scope: ['openid', 'offline_access', clientId],
      profile(credentials, params) {
        credentials.profile = {
          idToken: params.id_token,
          expiresIn: params.expires_in,
          scope: params.scope,
          refreshTokenReturned: Boolean(params.refresh_token)
        }
      }
    },
    clientId,
    clientSecret: config.get('defraId.clientSecret'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('session.cookie.secure'),
    isSameSite: 'Lax',
    cookie: 'routing-proxy-bell',
    location: () => config.get('defraId.redirectUrl'),
    providerParams: {
      serviceId: config.get('defraId.serviceId'),
      p: config.get('defraId.policy'),
      response_mode: 'query'
    }
  }
}

export const auth = {
  plugin: {
    name: 'auth',
    async register(server) {
      await server.register(Bell)

      const discovery = await getOidcConfigWithRetry(server.logger)
      server.app.defraId = {
        jwksUri: discovery.jwks_uri,
        issuer: discovery.issuer
      }
      server.auth.strategy('defra-id', 'bell', defraIdBellOptions(discovery))
    }
  }
}
