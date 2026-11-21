import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand, CreateGroupCommand, InitiateAuthCommand, AdminListGroupsForUserCommand } from "@aws-sdk/client-cognito-identity-provider"
import { GROUP_ROLES } from "../src/auth/tokens.js"

const endpoint = process.env.COGNITO_ENDPOINT
const pool = process.env.COGNITO_USER_POOL_ID
if (process.env.NODE_ENV === "production" || !endpoint || !["localhost", "127.0.0.1"].includes(new URL(endpoint).hostname) || !pool?.startsWith("local_")) throw Error("Local Cognito emulator required")
const client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION, endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } })
const file = new URL("../.data/local-role-accounts.json", import.meta.url)
type Account = { email: string; password: string; role: string }
const accounts: Account[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []
for (const [group, role] of GROUP_ROLES) {
  const email = `${role.toLowerCase().replace(/ /g, "")}.test@lms.com`
  let account = accounts.find(a => a.email === email)
  let exists = true
  try { await client.send(new AdminGetUserCommand({ UserPoolId: pool, Username: email })) }
  catch (e) { if ((e as Error).name !== "UserNotFoundException") throw e; exists = false }
  if (exists && !account) throw Error(`Refusing to replace an existing account: ${email}`)
  if (!account) {
    account = { email, role, password: `Qlm9!${randomBytes(18).toString("base64url")}` }
    accounts.push(account)
    writeFileSync(file, JSON.stringify(accounts, null, 2) + "\n", { mode: 0o600 })
  }
  try { await client.send(new CreateGroupCommand({ UserPoolId: pool, GroupName: group })) }
  catch (e) { if ((e as Error).name !== "GroupExistsException") throw e }
  if (!exists) await client.send(new AdminCreateUserCommand({ UserPoolId: pool, Username: email, MessageAction: "SUPPRESS", UserAttributes: [{ Name: "email", Value: email }, { Name: "email_verified", Value: "true" }, { Name: "name", Value: `Local Test ${role}` }] }))
  const groups = await client.send(new AdminListGroupsForUserCommand({ UserPoolId: pool, Username: email }))
  if (groups.Groups?.some(g => g.GroupName !== group)) throw Error(`Unexpected role groups for ${email}`)
  await client.send(new AdminSetUserPasswordCommand({ UserPoolId: pool, Username: email, Password: account.password, Permanent: true }))
  await client.send(new AdminAddUserToGroupCommand({ UserPoolId: pool, Username: email, GroupName: group }))
  const auth = await client.send(new InitiateAuthCommand({ AuthFlow: "USER_PASSWORD_AUTH", ClientId: process.env.COGNITO_CLIENT_ID, AuthParameters: { USERNAME: email, PASSWORD: account.password } }))
  const token = auth.AuthenticationResult?.AccessToken
  if (!token) throw Error(`No access token for ${role}`)
  const headers = { Authorization: `Bearer ${token}` }
  const response = await fetch("http://localhost:4000/api/me", { headers })
  const user = await response.json() as { role?: string; is_demo?: boolean }
  if (response.status !== 200 || user.role !== role || user.is_demo) throw Error(`Identity check failed for ${role}: ${response.status}`)
  const boundary = await fetch("http://localhost:4000/api/super-admin/health", { headers })
  if (boundary.status !== (role === "Super Admin" ? 200 : 403)) throw Error(`Role boundary failed for ${role}`)
  const rejected = await client.send(new InitiateAuthCommand({ AuthFlow: "USER_PASSWORD_AUTH", ClientId: process.env.COGNITO_CLIENT_ID, AuthParameters: { USERNAME: email, PASSWORD: randomBytes(24).toString("hex") } })).then(() => false, e => { if (!["NotAuthorizedException", "InvalidPasswordException"].includes(e.name)) throw e; return true })
  if (!rejected) throw Error("Incorrect password accepted")
  console.log(`${role}: signed password login, API identity, wrong-password rejection and role boundary passed (${email})`)
}
console.log("Credentials saved in git-ignored backend/.data/local-role-accounts.json")
