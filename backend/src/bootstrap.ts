import { createCognitoGateway, type CognitoGateway } from "./auth/cognito.js"
import { createTokenVerifier, type VerifyToken } from "./auth/tokens.js"
import { resolveUser, type Onboard } from "./auth/users.js"
import type { Config } from "./config.js"
import type { AppContext } from "./context.js"
import { createDb, createPool } from "./db/client.js"
import type { Role } from "./db/schema.js"
import { onboardStudent } from "./modules/student/index.js"
import { createLocalStorage } from "./storage/local.js"
import { createS3Storage } from "./storage/s3.js"
import type { Storage } from "./storage/storage.js"

/** Role -> what happens when a new account of that role signs in for the first time. */
function onboardingFor(config: Config): Partial<Record<Role, Onboard>> {
  return { Student: (tx, user) => onboardStudent(tx, user, { config }) }
}

/** Wires the real dependencies. Tests pass overrides for Cognito, token verification and storage. */
export function createContext(config: Config, overrides: { cognito?: CognitoGateway; verifyToken?: VerifyToken; storage?: Storage } = {}): AppContext {
  const pool = createPool(config)
  const db = createDb(pool)
  const cognito = overrides.cognito ?? createCognitoGateway(config)
  const verifyToken = overrides.verifyToken ?? createTokenVerifier({ issuer: config.cognitoIssuer, jwksUri: config.cognitoJwksUri, clientId: config.COGNITO_CLIENT_ID })
  const localStorage =
    !overrides.storage && config.STORAGE_DRIVER === "local"
      ? createLocalStorage({ dir: config.LOCAL_STORAGE_DIR, secret: config.UPLOAD_SIGNING_SECRET ?? "test-only-upload-secret" })
      : undefined
  const storage = overrides.storage ?? localStorage ?? createS3Storage({ bucket: config.S3_BUCKET!, region: config.S3_REGION ?? config.COGNITO_REGION, endpoint: config.S3_ENDPOINT })
  const demoEmails = config.DEMO_MODE ? [config.DEMO_STUDENT_EMAIL, config.DEMO_EVALUATOR_EMAIL].map((e) => e.toLowerCase()) : []
  return {
    config,
    pool,
    db,
    cognito,
    verifyToken,
    storage,
    localStorage,
    resolveUser: (claims) => resolveUser(db, cognito, claims, { demoEmails, onboard: onboardingFor(config) }),
  }
}
