import {
  signInController,
  signInCallbackController,
  signedInController
} from './controller.js'
import { signInPath } from './paths.js'

export const signIn = {
  plugin: {
    name: 'sign-in',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: signInPath,
          options: { auth: 'defra-id' },
          ...signInController
        },
        {
          method: 'GET',
          path: '/auth/sign-in-oidc',
          options: { auth: { strategy: 'defra-id', mode: 'try' } },
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
