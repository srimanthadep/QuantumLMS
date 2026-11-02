#!/usr/bin/env node
// Quantum LMS on AWS: two stacks in one region.
//   <prefix>Auth  the Cognito user pool, app client and role groups. Long-lived and retained on delete.
//   <prefix>App   the network, the API on ECS Fargate, the uploads bucket, and the site on CloudFront.
// `npm run deploy` deploys both in order (the site is built with the Auth stack's ids in between). See README.md.
import { App, Tags } from "aws-cdk-lib"
import { AppStack } from "../lib/app-stack.js"
import { AuthStack } from "../lib/auth-stack.js"

const app = new App()
const context = (key: string): string | undefined => {
  const v = app.node.tryGetContext(key)
  return v === undefined || v === null || v === "" ? undefined : String(v)
}

const prefix = context("prefix") ?? "QuantumLms"
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: context("region") ?? "eu-north-1" }
Tags.of(app).add("app", "quantum-lms")

const auth = new AuthStack(app, `${prefix}Auth`, { env, description: "Quantum LMS sign-in: Cognito user pool, web app client and role groups" })

// The first deploy creates only the user pool: the site is built with its ids before the rest goes up.
if (context("authOnly") !== "true") {
  const databaseSecretArn = context("databaseSecretArn") ?? process.env.DATABASE_SECRET_ARN
  if (!databaseSecretArn) {
    throw new Error("Set the database secret: -c databaseSecretArn=arn:aws:secretsmanager:... (see infra/README.md, step 2).")
  }
  const tasks = Number(context("apiTasks") ?? "1")
  if (!Number.isInteger(tasks) || tasks < 1 || tasks > 4) throw new Error("apiTasks must be a whole number from 1 to 4.")
  new AppStack(app, `${prefix}App`, {
    env,
    description: "Quantum LMS: API on ECS Fargate behind CloudFront, uploads in S3, the web app in S3 + CloudFront",
    userPool: auth.userPool,
    userPoolClient: auth.client,
    databaseSecretArn,
    apiTasks: tasks,
    demoMode: (context("demoMode") ?? "true") === "true",
    campusTz: context("campusTz") ?? "Asia/Kolkata",
    cloudFrontPrefixListId: context("cloudFrontPrefixListId"),
  })
}
