import {
  signInController,
  signInCallbackController,
  signedInController
} from './controller.js'
import { callbackPath, signedInPath, signInPath } from './paths.js'

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
          path: callbackPath,
          options: { auth: { strategy: 'defra-id', mode: 'try' } },
          ...signInCallbackController
        },
        {
          method: 'GET',
          path: signedInPath,
          ...signedInController
        }
      ])
    }
  }
}
