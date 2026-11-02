// Creates (or reuses) the Cognito user pool, web app client, role groups and demo accounts, then writes the ids into
// backend/.env and frontend/.env.local.
//
//   Local emulator:  npm run cognito:local   (separate terminal), then  npm run cognito:setup
//   Real AWS:        leave COGNITO_ENDPOINT empty, sign in to AWS (aws sso login, or AWS_PROFILE), then
//                    npm run cognito:setup
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { GROUP_ROLES } from "../src/auth/tokens.js"
import { DEMO_ACCOUNTS } from "../src/demo-accounts.js"

const region = process.env.COGNITO_REGION || "eu-north-1"
const endpoint = process.env.COGNITO_ENDPOINT || undefined
const POOL_NAME = process.env.COGNITO_POOL_NAME || "quantum-lms"
const CLIENT_NAME = "quantum-lms-web"

const client = new CognitoIdentityProviderClient({
  region,
  ...(endpoint ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } } : {}),
})
const target = endpoint ? `the local emulator at ${endpoint}` : `AWS (${region})`
console.log(`Setting up Cognito on ${target}`)

// 1. User pool: email is the username, optional authenticator-app MFA, email recovery.
const pools = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }))
let poolId = pools.UserPools?.find((p) => p.Name === POOL_NAME)?.Id
if (!poolId) {
  const res = await client.send(
    new CreateUserPoolCommand({
      PoolName: POOL_NAME,
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      UsernameConfiguration: { CaseSensitive: false },
      MfaConfiguration: "OPTIONAL",
      // Authenticator apps only; no SMS (needs an SNS role and costs money).
      ...(endpoint ? {} : { SoftwareTokenMfaConfiguration: { Enabled: true } }),
      Policies: { PasswordPolicy: { MinimumLength: 10, RequireLowercase: true, RequireUppercase: true, RequireNumbers: true, RequireSymbols: false, TemporaryPasswordValidityDays: 7 } },
      AccountRecoverySetting: { RecoveryMechanisms: [{ Name: "verified_email", Priority: 1 }] },
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
      Schema: [{ Name: "name", AttributeDataType: "String", Mutable: true, Required: false }],
      DeletionProtection: endpoint ? undefined : "ACTIVE",
      UserPoolTags: { app: "quantum-lms" },
    }),
  )
  poolId = res.UserPool!.Id!
  console.log(`  created user pool ${poolId}`)
} else console.log(`  user pool ${poolId} exists`)

// 2. Public web client (no secret). SRP in AWS; the emulator only supports USER_PASSWORD_AUTH.
const clients = await client.send(new ListUserPoolClientsCommand({ UserPoolId: poolId, MaxResults: 60 }))
let clientId = clients.UserPoolClients?.find((c) => c.ClientName === CLIENT_NAME)?.ClientId
if (!clientId) {
  const res = await client.send(
    new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: CLIENT_NAME,
      GenerateSecret: false,
      ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", ...(endpoint ? ["ALLOW_USER_PASSWORD_AUTH" as const] : [])],
      PreventUserExistenceErrors: "ENABLED",
      EnableTokenRevocation: true,
      AccessTokenValidity: 60,
      IdTokenValidity: 60,
      RefreshTokenValidity: 30,
      TokenValidityUnits: { AccessToken: "minutes", IdToken: "minutes", RefreshToken: "days" },
      ReadAttributes: ["email", "email_verified", "name"],
      WriteAttributes: ["name"],
    }),
  )
  clientId = res.UserPoolClient!.ClientId!
  console.log(`  created app client ${clientId}`)
} else console.log(`  app client ${clientId} exists`)

// 3. One group per role.
for (const [group, role] of GROUP_ROLES) {
  try {
    await client.send(new CreateGroupCommand({ UserPoolId: poolId, GroupName: group, Description: `${role} accounts` }))
    console.log(`  created group ${group}`)
  } catch (e) {
    if ((e as Error).name !== "GroupExistsException") throw e
  }
}

// 4. Demo accounts with permanent passwords, confirmed emails and their role group.
for (const a of DEMO_ACCOUNTS) {
  let exists = true
  try {
    await client.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: a.email }))
  } catch (e) {
    if ((e as Error).name !== "UserNotFoundException") throw e
    exists = false
  }
  if (!exists) {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: a.email,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: a.email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: a.name },
        ],
      }),
    )
  }
  await client.send(new AdminSetUserPasswordCommand({ UserPoolId: poolId, Username: a.email, Password: a.password, Permanent: true }))
  if (a.group) await client.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: a.email, GroupName: a.group }))
  console.log(`  ${exists ? "updated" : "created"} ${a.role.toLowerCase()} ${a.email}`)
}

// 5. Write the ids where the API and the web app read them.
function upsertEnv(file: string, values: Record<string, string>) {
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : []
  for (const [k, v] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(`${k}=`))
    if (i >= 0) lines[i] = `${k}=${v}`
    else lines.push(`${k}=${v}`)
  }
  writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"))
}
const backendEnv = fileURLToPath(new URL("../.env", import.meta.url))
const frontendEnv = fileURLToPath(new URL("../../frontend/.env.local", import.meta.url))
upsertEnv(backendEnv, { COGNITO_REGION: region, COGNITO_USER_POOL_ID: poolId, COGNITO_CLIENT_ID: clientId, COGNITO_ENDPOINT: endpoint ?? "" })
upsertEnv(frontendEnv, {
  VITE_COGNITO_REGION: region,
  VITE_COGNITO_USER_POOL_ID: poolId,
  VITE_COGNITO_CLIENT_ID: clientId,
  VITE_COGNITO_ENDPOINT: endpoint ?? "",
  VITE_COGNITO_AUTH_FLOW: endpoint ? "USER_PASSWORD_AUTH" : "USER_SRP_AUTH",
})
console.log(`wrote the pool and client ids to backend/.env and frontend/.env.local`)
