import type pg from "pg"
import type { CognitoGateway } from "./auth/cognito.js"
import type { VerifyToken, TokenClaims } from "./auth/tokens.js"
import type { AuthUser } from "./auth/users.js"
import type { Config } from "./config.js"
import type { Db } from "./db/client.js"
import type { Storage } from "./storage/storage.js"
import type { LocalStorage } from "./storage/local.js"

/** Everything a route needs. Built once at startup; tests build it with fakes for Cognito and storage. */
export interface AppContext {
  config: Config
  pool: pg.Pool
  db: Db
  cognito: CognitoGateway
  verifyToken: VerifyToken
  resolveUser: (claims: TokenClaims) => Promise<AuthUser>
  storage: Storage
  /** Set when STORAGE_DRIVER=local: serves the signed upload and download links. */
  localStorage?: LocalStorage
}
