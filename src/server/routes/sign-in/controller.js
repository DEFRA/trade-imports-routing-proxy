import Boom from '@hapi/boom'
import Jwt from '@hapi/jwt'

import { readVerifiedClaims } from '#/server/common/helpers/oidc-provider.js'

const signInSessionKey = 'signIn'
const signedInPath = '/auth/signed-in'

function claimRows(claims) {
  return Object.entries(claims).map(([name, value]) => ({
    key: { text: name },
    value: { text: typeof value === 'string' ? value : JSON.stringify(value) }
  }))
}

/**
 * The parts of a completed sign-in the signed-in page shows: every claim of
 * the ID token, the access token's claims when it is a different token, and
 * the token response's metadata. Never the tokens themselves.
 * @param {object} signIn
 * @param {Record<string, any>} signIn.idTokenClaims
 * @param {string} signIn.idToken
 * @param {string} signIn.accessToken
 * @param {number} signIn.expiresIn
 * @param {string} signIn.scope
 * @param {boolean} signIn.refreshTokenReturned
 */
export function describeSignIn({
  idTokenClaims,
  idToken,
  accessToken,
  expiresIn,
  scope,
  refreshTokenReturned
}) {
  const accessTokenClaims =
    accessToken === idToken
      ? undefined
      : claimRows(Jwt.token.decode(accessToken).decoded.payload)

  return {
    idTokenClaims: claimRows(idTokenClaims),
    accessTokenClaims,
    tokenResponse: [
      { key: { text: 'expires_in' }, value: { text: String(expiresIn) } },
      { key: { text: 'scope' }, value: { text: scope } },
      {
        key: { text: 'refresh token returned' },
        value: { text: refreshTokenReturned ? 'Yes' : 'No' }
      }
    ]
  }
}

export const signInController = {
  handler(_request, h) {
    return h.redirect(signedInPath)
  }
}

export const signInCallbackController = {
  async handler(request, h) {
    if (!request.auth.isAuthenticated) {
      request.logger.warn(
        { err: request.auth.error },
        'Defra ID sign-in failed'
      )
      throw Boom.unauthorized()
    }

    const { token: accessToken, profile } = request.auth.credentials
    let idTokenClaims

    try {
      idTokenClaims = await readVerifiedClaims(
        profile.idToken,
        request.route.settings.app.jwksUri
      )
    } catch (err) {
      request.logger.warn({ err }, 'Defra ID token refused')
      throw Boom.unauthorized()
    }

    request.yar.set(
      signInSessionKey,
      describeSignIn({ idTokenClaims, accessToken, ...profile })
    )
    request.logger.info(
      {
        sessionId: idTokenClaims.sessionId,
        correlationId: idTokenClaims.correlationId
      },
      'Defra ID sign-in completed'
    )

    return h.redirect(signedInPath)
  }
}

export const signedInController = {
  handler(request, h) {
    const signIn = request.yar.get(signInSessionKey)

    if (!signIn) {
      request.logger.info('No sign-in in the session, starting one')
      return h.redirect('/auth/sign-in')
    }

    return h.view('sign-in/signed-in', {
      pageTitle: 'Signed in',
      heading: 'Signed in',
      signIn
    })
  }
}
