import { Issuer } from "openid-client"
import { loadConfig } from "../src/config.js"

async function run() {
  console.log("🔍 Checking AWS Cognito configuration...\n")

  const config = loadConfig()
  console.log(`Region:          ${config.COGNITO_REGION}`)
  console.log(`User Pool ID:    ${config.COGNITO_USER_POOL_ID}`)
  console.log(`Client ID:       ${config.COGNITO_CLIENT_ID}`)
  console.log(`Client Secret:   ${config.COGNITO_CLIENT_SECRET ? "configured (hidden)" : "missing"}`)
  console.log(`Issuer:          ${config.cognitoIssuer}`)
  console.log(`JWKS URI:        ${config.cognitoJwksUri}`)
  console.log(`Redirect URI:    ${config.COGNITO_REDIRECT_URI || "https://d84l1y8p4kdic.cloudfront.net"}`)
  console.log(`Domain:          ${config.COGNITO_DOMAIN || "auto-derived"}\n`)

  console.log("1. Fetching OpenID configuration...")
  const issuer = await Issuer.discover(config.cognitoIssuer)
  console.log("   ✅ OpenID configuration loaded successfully.")
  console.log(`   Authorization endpoint: ${issuer.metadata.authorization_endpoint}`)
  console.log(`   Token endpoint:         ${issuer.metadata.token_endpoint}`)
  console.log(`   Userinfo endpoint:      ${issuer.metadata.userinfo_endpoint}`)
  console.log(`   JWKS URI:               ${issuer.metadata.jwks_uri}`)

  console.log("\n2. Initializing OpenID Client with Client Secret...")
  const client = new issuer.Client({
    client_id: config.COGNITO_CLIENT_ID,
    client_secret: config.COGNITO_CLIENT_SECRET,
    redirect_uris: [config.COGNITO_REDIRECT_URI || "https://d84l1y8p4kdic.cloudfront.net"],
    response_types: ["code"],
  })
  console.log("   ✅ OpenID Client successfully configured.")

  console.log("\n3. Testing Authorization URL generation...")
  const authUrl = client.authorizationUrl({
    scope: "email openid phone",
    state: "test-state-123",
    nonce: "test-nonce-456",
  })
  console.log(`   ✅ Authorization URL generated:`)
  console.log(`   ${authUrl}\n`)

  console.log("✨ All Amazon Cognito AWS checks passed successfully!\n")
}

run().catch((err) => {
  console.error("❌ Cognito check failed:", err)
  process.exit(1)
})

