// Signs a demo account in through Cognito (USER_PASSWORD_AUTH, as the local emulator requires) and calls the API
// in-process with the real token verifier and Cognito gateway.
//   npm run cognito:smoke [-- student|evaluator]
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { decodeJwt } from "jose"
import { buildApp } from "../src/app.js"
import { createContext } from "../src/bootstrap.js"
import { loadConfig } from "../src/config.js"
import { DEMO_ACCOUNTS } from "../src/demo-accounts.js"
import { modules } from "../src/modules.js"

const config = loadConfig()
const which = process.argv[2] === "evaluator" ? "Evaluator" : "Student"
const account = DEMO_ACCOUNTS.find((a) => a.role === which)!
const cognito = new CognitoIdentityProviderClient({
  region: config.COGNITO_REGION,
  ...(config.COGNITO_ENDPOINT ? { endpoint: config.COGNITO_ENDPOINT, credentials: { accessKeyId: "local", secretAccessKey: "local" } } : {}),
})
const auth = await cognito.send(
  new InitiateAuthCommand({ AuthFlow: "USER_PASSWORD_AUTH", ClientId: config.COGNITO_CLIENT_ID, AuthParameters: { USERNAME: account.email, PASSWORD: account.password } }),
)
const access = auth.AuthenticationResult?.AccessToken
if (!access) throw new Error(`no access token (challenge: ${auth.ChallengeName ?? "none"})`)
const claims = decodeJwt(access)
console.log("access token claims:", JSON.stringify({ iss: claims.iss, token_use: claims.token_use, client_id: claims.client_id, groups: claims["cognito:groups"], exp: claims.exp }))

const ctx = createContext(config)
const app = await buildApp(ctx, { logger: false, modules })
const res = await app.inject({ method: "GET", url: "/api/me", headers: { authorization: `Bearer ${access}` } })
console.log(`GET /api/me -> ${res.statusCode} ${res.body}`)
await app.close()
await ctx.pool.end()
