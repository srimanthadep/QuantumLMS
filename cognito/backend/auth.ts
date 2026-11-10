import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import type { AppContext } from "../context.js"
import { authenticateWithSrp, calculateSecretHash } from "../auth/srp.js"

export async function authRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const cognitoClient = new CognitoIdentityProviderClient({
    region: ctx.config.COGNITO_REGION,
  })

  const clientId = ctx.config.COGNITO_CLIENT_ID
  const clientSecret = ctx.config.COGNITO_CLIENT_SECRET
  const userPoolId = ctx.config.COGNITO_USER_POOL_ID

  /**
   * Helper to set auth cookie and resolve user from access token
   */
  async function completeLogin(reply: FastifyReply, tokens: { AccessToken?: string; IdToken?: string; RefreshToken?: string }) {
    if (!tokens.AccessToken) {
      throw new Error("No access token returned from Cognito.")
    }

    reply.setCookie("lms_access_token", tokens.AccessToken, {
      path: "/",
      httpOnly: true,
      secure: ctx.config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
    })

    const claims = await ctx.verifyToken(tokens.AccessToken)
    const user = await ctx.resolveUser(claims)

    return {
      step: "done" as const,
      user: {
        id: user.id,
        name: user.full_name,
        role: user.role,
        email: user.email,
        avatar: user.avatar_url ?? undefined,
      },
      tokens: {
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        refreshToken: tokens.RefreshToken,
      },
    }
  }

  /**
   * Translates Cognito errors into clear human sentences
   */
  function formatCognitoError(err: any): string {
    const name = err?.name || ""
    const message = err?.message || ""

    if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
      return "That email and password don't match an account."
    }
    if (name === "UserNotConfirmedException") {
      return "Confirm your account first. A verification code was sent to your phone/email."
    }
    if (name === "UsernameExistsException") {
      return "An account with this email already exists. Sign in instead."
    }
    if (name === "InvalidPasswordException") {
      if (/symbol/i.test(message)) {
        return "Password must include at least one special character or symbol (e.g. !@#$%^&*)."
      }
      if (/uppercase/i.test(message)) {
        return "Password must include at least one uppercase letter."
      }
      if (/lowercase/i.test(message)) {
        return "Password must include at least one lowercase letter."
      }
      if (/numeric|number/i.test(message)) {
        return "Password must include at least one number."
      }
      if (/length/i.test(message)) {
        return "Password must be at least 8 characters long."
      }
      return message || "Password must be at least 8 characters with uppercase, lowercase, a number, and a symbol (like !@#$)."
    }
    if (name === "CodeMismatchException") {
      return "That code didn't work. Check it and try again."
    }
    if (name === "ExpiredCodeException") {
      return "That code has expired. Request a new one."
    }
    if (name === "LimitExceededException" || name === "TooManyRequestsException") {
      return "Too many attempts. Please wait a few minutes and try again."
    }
    if (name === "InvalidParameterException") {
      if (/phone/i.test(message)) {
        return "Please enter a valid phone number with country code (e.g. +91 9876543210 or +61 412345678)."
      }
      return message || "Invalid information provided. Please check the form."
    }
    return message || "Authentication failed. Please try again."
  }

  // --- In-App Native Auth Endpoints (Cognito as Backend) ---

  /**
   * In-app Sign In: verifies credentials via SRP against AWS Cognito
   */
  app.post("/api/auth/signin", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { email?: string; password?: string }
    const email = body?.email?.trim().toLowerCase()
    const password = body?.password

    if (!email || !password) {
      return reply.code(400).send({ error: { message: "Email and password are required." } })
    }

    try {
      const result = await authenticateWithSrp(cognitoClient, {
        userPoolId,
        clientId,
        clientSecret,
        username: email,
        password,
      })

      if (result.status === "success") {
        const payload = await completeLogin(reply, {
          AccessToken: result.tokens.AccessToken,
          IdToken: result.tokens.IdToken,
          RefreshToken: result.tokens.RefreshToken,
        })
        return reply.send(payload)
      }

      if (result.challengeName === "SMS_MFA" || result.challengeName === "SOFTWARE_TOKEN_MFA") {
        return reply.send({
          step: "mfa",
          session: result.session,
          challengeName: result.challengeName,
        })
      }

      return reply.code(400).send({
        error: { message: `Unsupported challenge: ${result.challengeName}` },
      })
    } catch (err: any) {
      if (err?.name === "UserNotConfirmedException") {
        // Send a fresh confirmation code
        try {
          await cognitoClient.send(
            new ResendConfirmationCodeCommand({
              ClientId: clientId,
              SecretHash: calculateSecretHash(email, clientId, clientSecret),
              Username: email,
            })
          )
        } catch {
          // ignore resend error if already dispatched
        }
        return reply.send({
          step: "confirm",
          message: "Please enter the verification code sent to your email.",
        })
      }

      req.log.warn({ err }, "Cognito sign in error")
      return reply.code(401).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * In-app Sign Up: creates user directly in AWS Cognito User Pool
   */
  app.post("/api/auth/signup", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { fullName?: string; email?: string; password?: string; phone?: string }
    const fullName = body?.fullName?.trim() || ""
    const email = body?.email?.trim().toLowerCase() || ""
    const password = body?.password || ""
    let phone = body?.phone?.trim() || ""

    if (fullName.length < 2) {
      return reply.code(400).send({ error: { message: "Please enter your full name." } })
    }
    if (!email || !email.includes("@")) {
      return reply.code(400).send({ error: { message: "Please enter a valid email address." } })
    }
    if (password.length < 8) {
      return reply.code(400).send({
        error: { message: "Password must be at least 8 characters long." },
      })
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return reply.code(400).send({
        error: { message: "Password must include at least one special character or symbol (e.g. !@#$%^&*)." },
      })
    }
    if (!/[A-Z]/.test(password)) {
      return reply.code(400).send({
        error: { message: "Password must include at least one uppercase letter." },
      })
    }
    if (!/[a-z]/.test(password)) {
      return reply.code(400).send({
        error: { message: "Password must include at least one lowercase letter." },
      })
    }
    if (!/\d/.test(password)) {
      return reply.code(400).send({
        error: { message: "Password must include at least one number." },
      })
    }

    if (phone) {
      phone = phone.replace(/[\s-]/g, "")
      if (!phone.startsWith("+")) {
        phone = `+${phone}`
      }
    } else {
      phone = "+61412345678"
    }

    // Unique Cognito username for the pool (pool uses email alias)
    const username = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const secretHash = calculateSecretHash(username, clientId, clientSecret)

    try {
      const givenName = fullName.split(" ")[0] || fullName
      const signupRes = await cognitoClient.send(
        new SignUpCommand({
          ClientId: clientId,
          SecretHash: secretHash,
          Username: username,
          Password: password,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "name", Value: fullName },
            { Name: "given_name", Value: givenName },
            { Name: "phone_number", Value: phone },
          ],
        })
      )

      let deliveryMedium = signupRes.CodeDeliveryDetails?.DeliveryMedium || "email"
      let destination = signupRes.CodeDeliveryDetails?.Destination || (deliveryMedium === "SMS" ? phone : email)

      // If Cognito defaulted to SMS due to required phone attribute, dispatch immediately to user's email
      if (deliveryMedium === "SMS") {
        try {
          const emailSecretHash = calculateSecretHash(email, clientId, clientSecret)
          const resendRes = await cognitoClient.send(
            new ResendConfirmationCodeCommand({
              ClientId: clientId,
              SecretHash: emailSecretHash,
              Username: email,
            })
          )
          if (resendRes.CodeDeliveryDetails) {
            deliveryMedium = resendRes.CodeDeliveryDetails.DeliveryMedium || "EMAIL"
            destination = resendRes.CodeDeliveryDetails.Destination || email
          }
        } catch (resendErr) {
          req.log.warn({ resendErr }, "Could not switch confirmation delivery to email")
        }
      }

      return reply.send({
        step: "confirm",
        email,
        username,
        deliveryMedium,
        destination,
        message: `A verification code was sent to ${destination}.`,
      })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito sign up error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * In-app Confirm Verification Code: verifies email/SMS code and optionally logs in
   */
  app.post("/api/auth/confirm-code", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { email?: string; code?: string; password?: string; username?: string }
    const email = body?.email?.trim().toLowerCase() || ""
    const code = body?.code?.trim() || ""
    const password = body?.password
    const username = body?.username || email

    if (!email || !code) {
      return reply.code(400).send({ error: { message: "Email and confirmation code are required." } })
    }

    try {
      try {
        await cognitoClient.send(
          new ConfirmSignUpCommand({
            ClientId: clientId,
            SecretHash: calculateSecretHash(username, clientId, clientSecret),
            Username: username,
            ConfirmationCode: code,
          })
        )
      } catch (confirmErr: any) {
        if (username !== email) {
          await cognitoClient.send(
            new ConfirmSignUpCommand({
              ClientId: clientId,
              SecretHash: calculateSecretHash(email, clientId, clientSecret),
              Username: email,
              ConfirmationCode: code,
            })
          )
        } else {
          throw confirmErr
        }
      }

      // If user supplied password, immediately sign them in
      if (password) {
        const srpRes = await authenticateWithSrp(cognitoClient, {
          userPoolId,
          clientId,
          clientSecret,
          username: email,
          password,
        })

        if (srpRes.status === "success") {
          const payload = await completeLogin(reply, {
            AccessToken: srpRes.tokens.AccessToken,
            IdToken: srpRes.tokens.IdToken,
            RefreshToken: srpRes.tokens.RefreshToken,
          })
          return reply.send(payload)
        }
      }

      return reply.send({
        step: "confirmed",
        message: "Account confirmed successfully. You can now sign in.",
      })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito confirm code error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * Resend confirmation code
   */
  app.post("/api/auth/resend-code", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { email?: string }
    const email = body?.email?.trim().toLowerCase() || ""

    if (!email) {
      return reply.code(400).send({ error: { message: "Email is required." } })
    }

    try {
      await cognitoClient.send(
        new ResendConfirmationCodeCommand({
          ClientId: clientId,
          SecretHash: calculateSecretHash(email, clientId, clientSecret),
          Username: email,
        })
      )
      return reply.send({ success: true, message: `A new code was sent to ${email}.` })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito resend code error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * Forgot password request
   */
  app.post("/api/auth/forgot-password", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { email?: string }
    const email = body?.email?.trim().toLowerCase() || ""

    if (!email) {
      return reply.code(400).send({ error: { message: "Email is required." } })
    }

    try {
      await cognitoClient.send(
        new ForgotPasswordCommand({
          ClientId: clientId,
          SecretHash: calculateSecretHash(email, clientId, clientSecret),
          Username: email,
        })
      )
      return reply.send({ success: true, message: `A password reset code was sent to ${email}.` })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito forgot password error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * Reset password with confirmation code
   */
  app.post("/api/auth/reset-password", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { email?: string; code?: string; newPassword?: string }
    const email = body?.email?.trim().toLowerCase() || ""
    const code = body?.code?.trim() || ""
    const newPassword = body?.newPassword || ""

    if (!email || !code || !newPassword) {
      return reply.code(400).send({ error: { message: "Email, reset code, and new password are required." } })
    }

    try {
      await cognitoClient.send(
        new ConfirmForgotPasswordCommand({
          ClientId: clientId,
          SecretHash: calculateSecretHash(email, clientId, clientSecret),
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        })
      )
      return reply.send({ success: true, message: "Password updated successfully. You can now sign in." })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito reset password error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * MFA verification code challenge response
   */
  app.post("/api/auth/mfa-verify", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { code?: string; session?: string; username?: string }
    const code = body?.code?.trim() || ""
    const session = body?.session
    const username = body?.username || ""

    if (!code || !session) {
      return reply.code(400).send({ error: { message: "Code and session are required." } })
    }

    try {
      const challengeRes = await cognitoClient.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: "SOFTWARE_TOKEN_MFA",
          ClientId: clientId,
          ChallengeResponses: {
            USERNAME: username,
            SOFTWARE_TOKEN_MFA_CODE: code,
            SECRET_HASH: calculateSecretHash(username, clientId, clientSecret),
          },
          Session: session,
        })
      )

      if (challengeRes.AuthenticationResult) {
        const payload = await completeLogin(reply, {
          AccessToken: challengeRes.AuthenticationResult.AccessToken,
          IdToken: challengeRes.AuthenticationResult.IdToken,
          RefreshToken: challengeRes.AuthenticationResult.RefreshToken,
        })
        return reply.send(payload)
      }

      return reply.code(400).send({ error: { message: "MFA challenge was not completed." } })
    } catch (err: any) {
      req.log.warn({ err }, "Cognito MFA verify error")
      return reply.code(400).send({ error: { message: formatCognitoError(err) } })
    }
  })

  /**
   * In-app Sign Out
   */
  app.post("/api/auth/signout", async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("lms_access_token", { path: "/" })
    reply.clearCookie("cognito_state", { path: "/" })
    reply.clearCookie("cognito_nonce", { path: "/" })
    return reply.send({ success: true })
  })

  /**
   * Status and current user check
   */
  app.get("/api/auth/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const accessToken = (req.cookies?.lms_access_token as string | undefined) || tokenFromHeader

    if (!accessToken) {
      return reply.send({ authenticated: false, user: null })
    }

    try {
      const claims = await ctx.verifyToken(accessToken)
      const user = await ctx.resolveUser(claims)
      return reply.send({
        authenticated: true,
        user: {
          id: user.id,
          name: user.full_name,
          role: user.role,
          email: user.email,
          avatar: user.avatar_url ?? undefined,
        },
      })
    } catch {
      reply.clearCookie("lms_access_token", { path: "/" })
      return reply.send({ authenticated: false, user: null })
    }
  })
}
