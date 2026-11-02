// Deploys Quantum LMS to AWS:
//   1. the Auth stack (Cognito user pool, app client and groups);
//   2. the web app, built with the pool's ids into frontend/dist-aws;
//   3. the App stack (network, API, uploads, site), which uploads that build.
//
// From infra/:
//   npm run deploy -- --secret-arn <ARN of the DATABASE_URL secret> [--region eu-north-1] [--profile <aws profile>]
// Run it again after any change: unchanged stacks are skipped, and the web app and API image are rebuilt.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import * as path from "node:path"

const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const secretArn = option("secret-arn") ?? process.env.DATABASE_SECRET_ARN
const region = option("region") ?? "eu-north-1"
const prefix = option("prefix") ?? "QuantumLms"
const profile = option("profile")
if (!secretArn || !secretArn.startsWith("arn:aws:secretsmanager:")) {
  console.error("Pass the ARN of the secret that holds DATABASE_URL: npm run deploy -- --secret-arn arn:aws:secretsmanager:... (see README.md).")
  process.exit(1)
}

const infra = path.resolve(__dirname, "..")
const frontend = path.resolve(infra, "..", "frontend")
// Relative to infra/ (the commands run there): Windows runs them through a shell, which would split a path with spaces.
const outputsFile = "outputs.json"
const common = ["-c", `region=${region}`, "-c", `prefix=${prefix}`, ...(profile ? ["--profile", profile] : [])]

function run(cmd: string, cmdArgs: string[], cwd: string) {
  console.log(`\n> ${cmd} ${cmdArgs.join(" ")}`)
  // npm and npx are .cmd scripts on Windows, which only start through a shell.
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: "inherit", shell: process.platform === "win32" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// 1. Sign-in first: the web app needs the user pool's ids at build time.
run("npx", ["cdk", "deploy", `${prefix}Auth`, "-c", "authOnly=true", ...common, "--outputs-file", outputsFile], infra)
const auth = JSON.parse(readFileSync(path.join(infra, outputsFile), "utf8"))[`${prefix}Auth`] as { Region: string; UserPoolId: string; UserPoolClientId: string }

// 2. The web app for AWS. This file outranks frontend/.env.local, which points at the local Cognito emulator.
writeFileSync(
  path.join(frontend, ".env.aws.local"),
  [
    "# Written by infra/scripts/deploy.ts for the AWS build (vite build --mode aws). Public values, not secrets.",
    `VITE_COGNITO_REGION=${auth.Region}`,
    `VITE_COGNITO_USER_POOL_ID=${auth.UserPoolId}`,
    `VITE_COGNITO_CLIENT_ID=${auth.UserPoolClientId}`,
    "VITE_COGNITO_ENDPOINT=",
    "VITE_COGNITO_AUTH_FLOW=USER_SRP_AUTH",
    "VITE_API_URL=",
    "",
  ].join("\n"),
)
if (!existsSync(path.join(frontend, "node_modules"))) run("npm", ["install"], frontend)
run("npm", ["run", "build", "--", "--mode", "aws", "--outDir", "dist-aws"], frontend)

// 3. Everything else. Docker must be running: CDK builds the API image from backend/Dockerfile.
run("npx", ["cdk", "deploy", `${prefix}App`, "-c", `databaseSecretArn=${secretArn}`, ...common, "--outputs-file", outputsFile], infra)
const app = JSON.parse(readFileSync(path.join(infra, outputsFile), "utf8"))[`${prefix}App`] as { SiteUrl?: string } | undefined
console.log(`\nDeployed. The site: ${app?.SiteUrl ?? "(see the SiteUrl output)"}`)
console.log("With DEMO_MODE on, add the demo accounts once: in backend/, npm run cognito:setup:aws (needs the same AWS sign-in).")
