import { Issuer, generators, type Client, type TokenSet, type UserinfoResponse } from "openid-client"
import type { Config } from "../config.js"

export interface OidcAuth {
  client: Client
  authorizationUrl: (opts: { state: string; nonce: string; scope?: string }) => string
  callback: (redirectUri: string, parameters: Record<string, unknown>, checks: { state?: string; nonce?: string }) => Promise<{
    tokenSet: TokenSet
    userInfo: UserinfoResponse
  }>
  logoutUrl: (logoutUri?: string) => string
}

let cachedOidc: OidcAuth | null = null

export async function createOidcAuth(config: Config): Promise<OidcAuth | null> {
  if (!config.COGNITO_CLIENT_SECRET) {
    return null
  }
  if (cachedOidc) {
    return cachedOidc
  }

  const issuer = await Issuer.discover(config.cognitoIssuer)
  const defaultRedirectUri = config.COGNITO_REDIRECT_URI || "https://d84l1y8p4kdic.cloudfront.net"

  const client = new issuer.Client({
    client_id: config.COGNITO_CLIENT_ID,
    client_secret: config.COGNITO_CLIENT_SECRET,
    redirect_uris: [defaultRedirectUri],
    response_types: ["code"],
  })

  const cognitoDomain =
    config.COGNITO_DOMAIN ||
    `https://${config.COGNITO_USER_POOL_ID.toLowerCase().replace("_", "")}.auth.${config.COGNITO_REGION}.amazoncognito.com`

  cachedOidc = {
    client,
    authorizationUrl({ state, nonce, scope = "email openid phone" }) {
      return client.authorizationUrl({
        scope,
        state,
        nonce,
      })
    },
    async callback(redirectUri, parameters, checks) {
      const tokenSet = await client.callback(redirectUri, parameters, checks)
      const userInfo = tokenSet.access_token ? await client.userinfo(tokenSet.access_token) : ({} as UserinfoResponse)
      return { tokenSet, userInfo }
    },
    logoutUrl(logoutUri = defaultRedirectUri) {
      return `${cognitoDomain.replace(/\/$/, "")}/logout?client_id=${encodeURIComponent(
        config.COGNITO_CLIENT_ID
      )}&logout_uri=${encodeURIComponent(logoutUri)}`
    },
  }

  return cachedOidc
}

export { generators }

