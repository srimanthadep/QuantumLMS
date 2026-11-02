import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib"
import * as cognito from "aws-cdk-lib/aws-cognito"
import type { Construct } from "constructs"

/**
 * Cognito groups, one per role. The API maps them to roles in backend/src/auth/tokens.ts (GROUP_ROLES): the highest
 * group wins, and an account in no group is a student.
 */
export const ROLE_GROUPS: [string, string][] = [
  ["super-admins", "Super Admin"],
  ["admins", "Admin"],
  ["support", "Support"],
  ["evaluators", "Evaluator"],
  ["teachers", "Teacher"],
  ["students", "Student"],
]

/**
 * The user pool and the web app's client. Same settings as backend/scripts/setup-cognito.ts creates in the local
 * emulator, so code tested locally behaves the same in AWS. The pool keeps every account, so it's retained when the
 * stack is deleted and protected against deletion.
 */
export class AuthStack extends Stack {
  readonly userPool: cognito.UserPool
  readonly client: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)

    this.userPool = new cognito.UserPool(this, "Users", {
      userPoolName: "quantum-lms",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: true },
      // An email change only takes effect once the new address is confirmed.
      keepOriginal: { email: true },
      standardAttributes: { email: { required: true, mutable: true }, fullname: { required: false, mutable: true } },
      // The rule the web app shows (PASSWORD_RULE in frontend/src/lib/auth.ts).
      passwordPolicy: { minLength: 10, requireLowercase: true, requireUppercase: true, requireDigits: true, requireSymbols: false, tempPasswordValidity: Duration.days(7) },
      // Optional two-factor sign-in with an authenticator app; no SMS.
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    })

    // A public client (no secret): the browser signs in with SRP and sends the access token to the API.
    this.client = this.userPool.addClient("Web", {
      userPoolClientName: "quantum-lms-web",
      generateSecret: false,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      readAttributes: new cognito.ClientAttributes().withStandardAttributes({ email: true, emailVerified: true, fullname: true }),
      // Sign-up sends the email and name, so the client must be allowed to write both.
      writeAttributes: new cognito.ClientAttributes().withStandardAttributes({ email: true, fullname: true }),
    })

    ROLE_GROUPS.forEach(([name, role], i) => this.userPool.addGroup(`Group-${name}`, { groupName: name, description: `${role} accounts`, precedence: i }))

    new CfnOutput(this, "Region", { value: this.region })
    new CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId })
    new CfnOutput(this, "UserPoolClientId", { value: this.client.userPoolClientId })
  }
}
