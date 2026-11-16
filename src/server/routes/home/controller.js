import { signInPath } from '#/server/routes/sign-in/paths.js'

export const homeController = {
  handler(_request, h) {
    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'Home',
      signInHref: signInPath
    })
  }
}
