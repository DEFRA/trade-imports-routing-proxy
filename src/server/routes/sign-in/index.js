import Bell from '@hapi/bell'

import { config } from '#/config/config.js'
import { fetchOidcDiscovery } from '#/server/common/helpers/oidc-provider.js'
import {
  signInController,
  signInCallbackController,
  signedInController
} from './controller.js'

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

export const signIn = {
  plugin: {
    name: 'sign-in',
    async register(server) {
      await server.register(Bell)

      const discovery = await fetchOidcDiscovery(server.logger)
      server.auth.strategy('defra-id', 'bell', defraIdBellOptions(discovery))

      server.route([
        {
          method: 'GET',
          path: '/auth/sign-in',
          options: { auth: 'defra-id' },
          ...signInController
        },
        {
          method: 'GET',
          path: '/auth/sign-in-oidc',
          options: {
            auth: { strategy: 'defra-id', mode: 'try' },
            app: { jwksUri: discovery.jwks_uri }
          },
          ...signInCallbackController
        },
        {
          method: 'GET',
          path: '/auth/signed-in',
          ...signedInController
        }
      ])
    }
  }
}
