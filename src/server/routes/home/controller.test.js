import * as cheerio from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(expect.stringContaining('Home |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should link to sign-in', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/'
    })
    const $ = cheerio.load(result)

    expect($('[data-testid="app-page-body"] a').attr('href')).toBe(
      '/auth/sign-in'
    )
  })
})
