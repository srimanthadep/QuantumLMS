import { createCognitoGateway, type CognitoGateway } from "./auth/cognito.js"
import { createTokenVerifier, type VerifyToken } from "./auth/tokens.js"
import { resolveUser, type Onboard } from "./auth/users.js"
import type { Config } from "./config.js"
import type { AppContext } from "./context.js"
import { createDb, createPool } from "./db/client.js"
import type { Role } from "./db/schema.js"
import { onboardStudent } from "./modules/student/index.js"
import { onboardEvaluator } from "./modules/evaluator/index.js"
import { createLocalStorage } from "./storage/local.js"
import { createS3Storage } from "./storage/s3.js"
import type { Storage } from "./storage/storage.js"

/** Role -> what happens when a new account of that role signs in for the first time. */
function onboardingFor(config: Config, storage: Storage): Partial<Record<Role, Onboard>> {
  return {
    Student: (tx, user) => onboardStudent(tx, user, { config }),
    Evaluator: (tx, user) => onboardEvaluator(tx, user, { config, storage }),
  }
}

/** The configured file storage: S3 in AWS, the local disk in development. */
export function createStorage(config: Config): { storage: Storage; localStorage?: ReturnType<typeof createLocalStorage> } {
  if (config.STORAGE_DRIVER === "local") {
    const local = createLocalStorage({ dir: config.LOCAL_STORAGE_DIR, secret: config.UPLOAD_SIGNING_SECRET ?? "test-only-upload-secret" })
    return { storage: local, localStorage: local }
  }
  const credentials =
    config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
      : undefined
  return {
    storage: createS3Storage({
      bucket: config.S3_BUCKET!,
      region: config.S3_REGION ?? config.COGNITO_REGION ?? "auto",
      endpoint: config.S3_ENDPOINT,
      credentials,
    }),
  }
}

/** Wires the real dependencies. Tests pass overrides for Cognito, token verification and storage. */
export function createContext(config: Config, overrides: { cognito?: CognitoGateway; verifyToken?: VerifyToken; storage?: Storage } = {}): AppContext {
  const pool = createPool(config)
  const db = createDb(pool)
  const cognito = overrides.cognito ?? createCognitoGateway(config)
  const verifyToken = overrides.verifyToken ?? createTokenVerifier({ issuer: config.cognitoIssuer, jwksUri: config.cognitoJwksUri, clientId: config.COGNITO_CLIENT_ID })
  const { storage, localStorage } = overrides.storage ? { storage: overrides.storage, localStorage: undefined } : createStorage(config)
  const demoEmails = config.DEMO_MODE
    ? [config.DEMO_STUDENT_EMAIL, config.DEMO_EVALUATOR_EMAIL, config.DEMO_SUPPORT_EMAIL, config.DEMO_ADMIN_EMAIL, config.DEMO_SUPER_ADMIN_EMAIL].map((e) => e.toLowerCase())
    : []
  return {
    config,
    pool,
    db,
    cognito,
    verifyToken,
    storage,
    localStorage,
    resolveUser: (claims) => resolveUser(db, cognito, claims, { demoEmails, onboard: onboardingFor(config, storage) }),
  }
}
