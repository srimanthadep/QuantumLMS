import {
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserMFAPreferenceCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import type { Config } from "../config.js"

export interface CognitoAttributes {
  email: string
  name?: string
  picture?: string
}

/** The Cognito calls the API makes. An interface so tests can run without a user pool. */
export interface CognitoGateway {
  /** The signed-in user's attributes, read with their own access token (no AWS credentials needed). */
  getAttributes(accessToken: string): Promise<CognitoAttributes>
  /** Admin operations (need AWS credentials with cognito-idp permissions in AWS). */
  setPassword(username: string, password: string): Promise<void>
  disableMfa(username: string): Promise<void>
  addToGroup(username: string, group: string): Promise<void>
  removeFromGroup(username: string, group: string): Promise<void>
  /** Ends every session of the user (refresh tokens stop working). */
  signOutEverywhere(accessToken: string): Promise<void>
}

export function createCognitoGateway(config: Pick<Config, "COGNITO_REGION" | "COGNITO_ENDPOINT" | "COGNITO_USER_POOL_ID">): CognitoGateway {
  const emulated = Boolean(config.COGNITO_ENDPOINT)
  const client = new CognitoIdentityProviderClient({
    region: config.COGNITO_REGION,
    ...(emulated
      ? { endpoint: config.COGNITO_ENDPOINT, credentials: { accessKeyId: "local", secretAccessKey: "local" }, maxAttempts: 1 }
      : {}),
  })
  const pool = config.COGNITO_USER_POOL_ID
  return {
    async getAttributes(accessToken) {
      const res = await client.send(new GetUserCommand({ AccessToken: accessToken }))
      const attr = Object.fromEntries((res.UserAttributes ?? []).map((a) => [a.Name ?? "", a.Value ?? ""]))
      return { email: attr.email ?? "", name: attr.name || [attr.given_name, attr.family_name].filter(Boolean).join(" ") || undefined, picture: attr.picture || undefined }
    },
    async setPassword(username, password) {
      await client.send(new AdminSetUserPasswordCommand({ UserPoolId: pool, Username: username, Password: password, Permanent: true }))
    },
    async disableMfa(username) {
      await client.send(new AdminSetUserMFAPreferenceCommand({ UserPoolId: pool, Username: username, SoftwareTokenMfaSettings: { Enabled: false, PreferredMfa: false } }))
    },
    async addToGroup(username, group) {
      await client.send(new AdminAddUserToGroupCommand({ UserPoolId: pool, Username: username, GroupName: group }))
    },
    async removeFromGroup(username, group) {
      await client.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: pool, Username: username, GroupName: group }))
    },
    async signOutEverywhere(accessToken) {
      try {
        await client.send(new GlobalSignOutCommand({ AccessToken: accessToken }))
      } catch (e) {
        // cognito-local has no GlobalSignOut. Locally, the API's sessions_revoked_at check still ends the old sessions.
        if (emulated && /unsupported/i.test(`${(e as Error).name} ${(e as Error).message}`)) return
        throw e
      }
    },
  }
}
