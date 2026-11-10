# AWS Cognito Real Cloud Authentication Backup

This directory contains the complete backup of the real AWS Cognito integration for Quantum LMS.

## Configuration Details

* **AWS Region:** `ap-southeast-2` (Sydney)
* **Cognito User Pool ID:** `ap-southeast-2_VCz6yBhb4`
* **Cognito Client ID:** `5c2nu0v71qs0g0i65ejl8qdc3c`
* **Cognito Hosted UI / Domain:** `https://ap-southeast-2vcz6ybhb4.auth.ap-southeast-2.amazoncognito.com`
* **CloudFront URL / Redirect URI:** `https://d84l1y8p4kdic.cloudfront.net`
* **OAuth Flows Configured:** Authorization Code Grant, SRP (`USER_SRP_AUTH`), Admin API (`AdminInitiateAuth`, `AdminCreateUser`, `AdminSetUserPassword`)

## Contents of this directory

1. `cognito.patch`
   The complete `git diff` patch capturing all changes across `backend/`, `frontend/`, and config files.
2. `backend/`
   * `cognito-app.cjs`: Standalone Express OIDC demonstration app for AWS Cognito Managed Login.
   * `oidc.ts`: OpenID Connect discovery and auth helper.
   * `srp.ts`: Node backend SRP client (`amazon-user-pool-srp-client`) for authenticating users directly with AWS Cognito without client secrets.
   * `auth.ts`: Fastify auth routes (`/api/auth/signup`, `/api/auth/signin`, `/api/auth/confirm-code`, `/api/auth/resend-code`, `/api/auth/mfa-verify`).
   * `cognito-aws-check.ts`: Test script to check connection to AWS Cognito User Pool.
   * `setup-cognito.ts`: Script to provision groups and demo users in AWS Cognito.
   * `reset-and-seed-users.ts`: Script to reset and recreate all demo users in AWS Cognito.
   * `.env.cognito`: Backup of `backend/.env` with AWS Cognito environment variables.
3. `frontend/`
   * `.env.local.cognito`: Backup of `frontend/.env.local` pointing to AWS Cognito.
   * `auth.ts`: AWS Amplify + local storage hybrid auth adapter.
   * `accountAuth.ts`: API-driven authentication adapter.
   * `AuthPage.tsx`: Modern single-card auth page.
   * `CognitoGate.tsx`: Session gate ensuring valid authentication before entering student/evaluator portals.

## How to Restore AWS Cognito Mode

To switch back to real AWS Cognito in the future:
1. Copy `cognito/backend/.env.cognito` to `backend/.env`.
2. Copy `cognito/frontend/.env.local.cognito` to `frontend/.env.local`.
3. Apply the patch:
   ```bash
   git apply cognito/cognito.patch
   ```
   Or restore the backed-up files from `cognito/backend/` and `cognito/frontend/` to their respective locations.

