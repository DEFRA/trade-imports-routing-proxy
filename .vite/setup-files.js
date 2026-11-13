import { vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { serveOidcProvider } from './oidc-provider.js'

const fetchMock = createFetchMock(vi)

fetchMock.enableMocks()
global.fetch = fetchMock

vi.mock('ioredis')

serveOidcProvider()

beforeEach(() => {
  serveOidcProvider()
})
