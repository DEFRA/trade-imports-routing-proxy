import Hapi from '@hapi/hapi'

import { router } from './router.js'

describe('#router', () => {
  test('Should fail to register when the static files cannot be registered', async () => {
    const server = Hapi.server()
    server.auth.scheme('unused', () => ({ authenticate: () => null }))
    server.auth.strategy('defra-id', 'unused')
    server.route({
      method: 'GET',
      path: '/favicon.ico',
      handler: () => null
    })

    await expect(server.register(router)).rejects.toThrow(
      'New route /favicon.ico conflicts with existing /favicon.ico'
    )
  })
})
