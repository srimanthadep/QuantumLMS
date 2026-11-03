import { readFileSync } from "node:fs"
import { z } from "zod"

/**
 * Every setting comes from the environment (a git-ignored .env file in development, the task definition and Secrets
 * Manager in AWS). Parsed once at startup so a bad value fails fast with a readable message.
 */
const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1")

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  /** Public base URL of this API, used to build local upload links. */
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  /** Comma-separated browser origins allowed to call the API. */
  CORS_ORIGINS: z.string().default("http://localhost:8443"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (postgres://user:password@host:5432/db)"),
  /** require: TLS without certificate checks; verify: TLS checked against DATABASE_CA_CERT; disable: no TLS. */
  DATABASE_SSL: z.enum(["require", "verify", "disable"]).default("require"),
  /** PEM text or a path to a PEM file (Supabase: Database settings > SSL certificate). */
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  COGNITO_REGION: z.string().default("eu-north-1"),
  COGNITO_USER_POOL_ID: z.string().min(1, "COGNITO_USER_POOL_ID is required"),
  COGNITO_CLIENT_ID: z.string().min(1, "COGNITO_CLIENT_ID is required"),
  /** Override for a local emulator (cognito-local: http://localhost:9229). Empty in AWS. */
  COGNITO_ENDPOINT: z.string().url().optional(),

  STORAGE_DRIVER: z.enum(["s3", "local"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  /** Override for S3-compatible storage (MinIO, LocalStack). */
  S3_ENDPOINT: z.string().url().optional(),
  LOCAL_STORAGE_DIR: z.string().default(".data/uploads"),
  /** Signs local upload and download links. Required with STORAGE_DRIVER=local outside tests. */
  UPLOAD_SIGNING_SECRET: z.string().min(16).optional(),

  CAMPUS_TZ: z.string().default("Asia/Kolkata"),
  /** Demo accounts, quick-launch sign-in and "Reset demo data". */
  DEMO_MODE: bool.default(true),
  DEMO_STUDENT_EMAIL: z.string().email().default("niharika@lms.com"),
  DEMO_EVALUATOR_EMAIL: z.string().email().default("eval@lms.com"),
  DEMO_SUPPORT_EMAIL: z.string().email().default("maheshwar@lms.com"),
  DEMO_ADMIN_EMAIL: z.string().email().default("admin@lms.com"),
  DEMO_SUPER_ADMIN_EMAIL: z.string().email().default("superadmin@lms.com"),
  /** Grade quiz attempts that ran out of time while the student was away (seconds between runs, 0 = off). */
  QUIZ_SWEEP_SECONDS: z.coerce.number().int().min(0).default(60),
})

export type Config = z.infer<typeof schema> & {
  corsOrigins: string[]
  cognitoIssuer: string
  cognitoJwksUri: string
  databaseCa?: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".") || "env"}: ${i.message}`)
    throw new Error(`Invalid configuration:\n${lines.join("\n")}`)
  }
  const c = parsed.data
  if (c.STORAGE_DRIVER === "s3" && !c.S3_BUCKET) throw new Error("Invalid configuration:\n  S3_BUCKET is required with STORAGE_DRIVER=s3")
  if (c.STORAGE_DRIVER === "local" && !c.UPLOAD_SIGNING_SECRET && c.NODE_ENV !== "test") {
    throw new Error("Invalid configuration:\n  UPLOAD_SIGNING_SECRET (16+ characters) is required with STORAGE_DRIVER=local")
  }
  // Cognito's issuer is https://cognito-idp.<region>.amazonaws.com/<pool id>; cognito-local uses <endpoint>/<pool id>.
  const cognitoIssuer = c.COGNITO_ENDPOINT
    ? `${c.COGNITO_ENDPOINT.replace(/\/$/, "")}/${c.COGNITO_USER_POOL_ID}`
    : `https://cognito-idp.${c.COGNITO_REGION}.amazonaws.com/${c.COGNITO_USER_POOL_ID}`
  let databaseCa: string | undefined
  if (c.DATABASE_CA_CERT) databaseCa = c.DATABASE_CA_CERT.includes("BEGIN CERTIFICATE") ? c.DATABASE_CA_CERT : readFileSync(c.DATABASE_CA_CERT, "utf8")
  if (c.DATABASE_SSL === "verify" && !databaseCa) throw new Error("Invalid configuration:\n  DATABASE_CA_CERT is required with DATABASE_SSL=verify")
  return {
    ...c,
    corsOrigins: c.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    cognitoIssuer,
    cognitoJwksUri: `${cognitoIssuer}/.well-known/jwks.json`,
    databaseCa,
  }
}
