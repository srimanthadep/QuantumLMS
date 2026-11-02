# Quantum LMS on AWS

An [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) app (TypeScript) that runs Quantum LMS in one AWS
region (default `eu-north-1`, next to the Supabase database). It has two stacks:

| Stack | What it holds |
| --- | --- |
| `QuantumLmsAuth` | The Cognito user pool (email sign-in, the password rule the web app shows, optional authenticator-app MFA, email recovery), the web app client (SRP, no secret) and one group per role. Deletion-protected and kept if the stack is deleted, because it holds every account. |
| `QuantumLmsApp` | A VPC; the API from `backend/Dockerfile` on ECS Fargate behind an internal Application Load Balancer; a private S3 bucket for uploads; the web app in a private S3 bucket behind CloudFront. |

How a request flows:

- The browser only talks to CloudFront. `/api/*` goes to the load balancer through a CloudFront **VPC origin**, so
  the load balancer has no public address and its security group only admits CloudFront. Everything else is the web
  app from S3 (paths without a file extension get `index.html`, so client-side routes work on reload).
- The API runs in private subnets. One NAT gateway gives it a fixed outbound address for the database and Cognito's
  signing keys; S3 traffic goes through a free gateway endpoint.
- Uploads go straight from the browser to S3 with presigned links (CORS allows only the site's origin).
- `DATABASE_URL` lives in Secrets Manager. Only the task's execution role can read it, and it never appears in the
  template, the image or the logs.
- Each container applies pending migrations, then starts the server. Deployments are rolling with a circuit breaker
  that rolls back a release whose tasks don't become healthy (`/api/health` checks the database).

## Before you start

- An AWS account and the AWS CLI v2, signed in: `aws configure sso` once, then `aws sso login --profile <name>` and
  `$env:AWS_PROFILE = "<name>"` in the terminal you deploy from.
- **Docker Desktop**, running: CDK builds the API image locally and pushes it to ECR.
- Node 22 or newer.
- The database: the Supabase project the API already uses (or any PostgreSQL 15+). Tables are created by the
  migrations on the first start; course content and rubrics come from `npm run db:seed` in `backend/` (once, from your
  machine, with `DATABASE_URL` pointing at that database).

## First deploy

```powershell
cd infra
npm install
npx cdk bootstrap aws://<account-id>/eu-north-1      # once per account and region
```

Store the database URL as a secret. Use the **session pooler** string (port 5432). Put it in a file outside the
repository so the password doesn't land in your shell history, create the secret, then delete the file:

```powershell
aws secretsmanager create-secret --region eu-north-1 --name quantum-lms/database-url --secret-string file://C:\temp\db-url.txt
Remove-Item C:\temp\db-url.txt
```

Note the `ARN` it prints, then deploy:

```powershell
npm run deploy -- --secret-arn arn:aws:secretsmanager:eu-north-1:<account-id>:secret:quantum-lms/database-url-XXXXXX
```

`npm run deploy` (`scripts/deploy.ts`) deploys the Auth stack, builds the web app with the user pool's ids into
`frontend/dist-aws` (through `frontend/.env.aws.local`, which it writes), then deploys the App stack. The first run
takes about 20 minutes, most of it CloudFront. It prints the site's address (`https://<id>.cloudfront.net`).

With `DEMO_MODE` on (the default), add the demo accounts to the user pool once, signed in to the same AWS account:

```powershell
cd ../backend
npm run cognito:setup:aws      # set $env:AWS_REGION first if you deployed outside eu-north-1
```

## Updating

Run the same `npm run deploy -- --secret-arn …` again. Unchanged stacks are skipped; the web app is rebuilt and
uploaded (old bundles stay, so open tabs keep working) and a changed API image rolls out task by task.

To change the database URL: `aws secretsmanager put-secret-value --secret-id quantum-lms/database-url --secret-string file://…`,
then restart the tasks: `aws ecs update-service --cluster <ApiCluster> --service <ApiService> --force-new-deployment`
(both names are stack outputs).

## Settings

`npm run deploy` takes `--secret-arn`, `--region`, `--profile` and `--prefix` (stack name prefix, default
`QuantumLms`). Other settings go in the `context` block of `cdk.json`:

| Key | Default | Meaning |
| --- | --- | --- |
| `apiTasks` | `1` | API tasks (1–4). Each keeps up to 5 database connections; Supabase's session pooler allows 15 clients in total on the smallest compute size, shared with anything else that connects (local development included) |
| `demoMode` | `"true"` | Demo accounts, quick-launch sign-in and "Reset demo data". Set `"false"` for a real academy |
| `campusTz` | `Asia/Kolkata` | Time zone for timetables, mentor slots and reports |
| `cloudFrontPrefixListId` | looked up | Id of `com.amazonaws.global.cloudfront.origin-facing` in the region, if you'd rather not have CDK look it up |

Logs are in CloudWatch (the `ApiLogGroup` output), kept for a month.

## Costs

The NAT gateway, the load balancer and the Fargate task (0.5 vCPU, 1 GB) run all the time; together they're roughly
$70 a month in `eu-north-1` at the time of writing. CloudFront, S3, Secrets Manager and Cognito are billed by use and
stay small at a school's scale. Check the [AWS Pricing Calculator](https://calculator.aws/) for your numbers.

## Not covered yet

- **Your own domain.** The site is on its `cloudfront.net` address. For a domain: an ACM certificate in `us-east-1`,
  `domainNames` and `certificate` on the distribution, a DNS alias, and the domain added to the uploads bucket's CORS.
- **Email volume.** Cognito sends sign-up and reset codes from its default sender, which has a low daily limit.
  Configure Amazon SES (`email: UserPoolEmail.withSES(...)` in `lib/auth-stack.ts`) before inviting real users.
- **Certificate checks on the database connection.** `DATABASE_SSL=require` encrypts the connection without checking
  the server's certificate. To check it, pass Supabase's CA certificate as `DATABASE_CA_CERT` with
  `DATABASE_SSL=verify` (see `backend/.env.example`).

## Removing it

```powershell
npx cdk destroy QuantumLmsApp -c databaseSecretArn=<ARN>
```

This deletes the network, the API and the site. The uploads bucket is kept (empty and delete it yourself if you mean
to), and so is the Auth stack's user pool, which is deletion-protected. The database is never touched.
