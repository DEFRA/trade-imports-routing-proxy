import inert from '@hapi/inert'

import { home } from '../routes/home/index.js'
import { about } from '../routes/about/index.js'
import { signIn } from '../routes/sign-in/index.js'
import { health } from '../routes/health/index.js'
import { cookies } from '../routes/cookies/controller.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#/config/config.js'

async function registerStaticAssets(server) {
  if (config.get('isProduction') || config.get('isTest')) {
    await server.register(serveStaticFiles)
    return
  }

  const createViteServer = (await import('vite')).createServer
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })

  await server.register({
    plugin: (await import('@defra/hapi-connect')).default,
    options: {
      path: '/public',
      middleware: [vite.middlewares]
    }
  })
}

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])
      await server.register([health])
      await server.register([cookies])
      await server.register([home, about, signIn])
      await registerStaticAssets(server)
    }
  }
}
