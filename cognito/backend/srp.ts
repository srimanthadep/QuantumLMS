import crypto from "crypto"
import srpPkg from "amazon-user-pool-srp-client"
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider"

// amazon-user-pool-srp-client exports
const { SRPClient, calculateSignature, getNowString } = (srpPkg as any).default || (srpPkg as any)

export function calculateSecretHash(username: string, clientId: string, clientSecret?: string): string {
  if (!clientSecret) return ""
  return crypto
    .createHmac("SHA256", clientSecret)
    .update(username + clientId)
    .digest("base64")
}

export interface SrpAuthSuccess {
  status: "success"
  tokens: AuthenticationResultType
}

export interface SrpAuthChallenge {
  status: "challenge"
  challengeName: string
  session?: string
  parameters?: Record<string, string>
}

export type SrpAuthResult = SrpAuthSuccess | SrpAuthChallenge

/**
 * Performs SRP (Secure Remote Password) authentication against AWS Cognito User Pool with client secret.
 */
export async function authenticateWithSrp(
  cognito: CognitoIdentityProviderClient,
  opts: {
    userPoolId: string
    clientId: string
    clientSecret?: string
    username: string
    password: string
  }
): Promise<SrpAuthResult> {
  const { userPoolId, clientId, clientSecret, username, password } = opts
  const userPoolName = userPoolId.split("_")[1] || userPoolId

  const srp = new SRPClient(userPoolName)
  const srpA = srp.calculateA()
  const secretHash = calculateSecretHash(username, clientId, clientSecret)

  const authParams: Record<string, string> = {
    USERNAME: username,
    SRP_A: srpA,
  }
  if (secretHash) {
    authParams.SECRET_HASH = secretHash
  }

  const initRes = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_SRP_AUTH",
      ClientId: clientId,
      AuthParameters: authParams,
    })
  )

  if (initRes.AuthenticationResult) {
    return {
      status: "success",
      tokens: initRes.AuthenticationResult,
    }
  }

  if (initRes.ChallengeName === "PASSWORD_VERIFIER" && initRes.ChallengeParameters) {
    const params = initRes.ChallengeParameters
    const dateNow = getNowString()
    const serverB = params.SRP_B
    const salt = params.SALT
    const secretBlock = params.SECRET_BLOCK
    const userIdForSrp = params.USER_ID_FOR_SRP || username

    const hkdf = srp.getPasswordAuthenticationKey(userIdForSrp, password, serverB, salt)
    const signature = calculateSignature(hkdf, userPoolName, userIdForSrp, secretBlock, dateNow)

    const challengeResponses: Record<string, string> = {
      PASSWORD_CLAIM_SIGNATURE: signature,
      PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
      TIMESTAMP: dateNow,
      USERNAME: userIdForSrp,
    }

    const respSecretHash = calculateSecretHash(userIdForSrp, clientId, clientSecret)
    if (respSecretHash) {
      challengeResponses.SECRET_HASH = respSecretHash
    }

    const challengeRes = await cognito.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: "PASSWORD_VERIFIER",
        ClientId: clientId,
        ChallengeResponses: challengeResponses,
        Session: initRes.Session,
      })
    )

    if (challengeRes.AuthenticationResult) {
      return {
        status: "success",
        tokens: challengeRes.AuthenticationResult,
      }
    }

    return {
      status: "challenge",
      challengeName: challengeRes.ChallengeName || "UNKNOWN_CHALLENGE",
      session: challengeRes.Session,
      parameters: challengeRes.ChallengeParameters,
    }
  }

  return {
    status: "challenge",
    challengeName: initRes.ChallengeName || "UNKNOWN_CHALLENGE",
    session: initRes.Session,
    parameters: initRes.ChallengeParameters,
  }
}

