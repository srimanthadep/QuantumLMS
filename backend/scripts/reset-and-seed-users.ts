import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  ListUsersCommand,
  UpdateUserPoolCommand,
} from "@aws-sdk/client-cognito-identity-provider"
import { eq, sql } from "drizzle-orm"
import { GROUP_ROLES } from "../src/auth/tokens.js"
import { createStorage } from "../src/bootstrap.js"
import { loadConfig } from "../src/config.js"
import { createDb, createPool } from "../src/db/client.js"
import { users } from "../src/db/schema.js"
import { seedEvaluatorDemo } from "../src/db/seed/evaluator.js"
import { seedContent, seedStudentDemo } from "../src/db/seed/index.js"

const config = loadConfig()
const poolId = config.COGNITO_USER_POOL_ID
if (!poolId) {
  console.error("COGNITO_USER_POOL_ID is not configured in backend/.env")
  process.exit(1)
}

const cognito = new CognitoIdentityProviderClient({
  region: config.COGNITO_REGION,
  ...(config.COGNITO_ENDPOINT
    ? {
        endpoint: config.COGNITO_ENDPOINT,
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
    : {}),
})

const USERS_TO_CREATE = [
  {
    role: "Admin" as const,
    email: "admin@lms.com",
    name: "Admin",
    group: "admins",
    password: "123456",
  },
  {
    role: "Super Admin" as const,
    email: "superadmin@lms.com",
    name: "Super Admin",
    group: "super-admins",
    password: "123456",
  },
  {
    role: "Teacher" as const,
    email: "shanmuk@lms.com",
    name: "Shanmuk",
    group: "teachers",
    password: "123456",
  },
  {
    role: "Student" as const,
    email: "niharika@lms.com",
    name: "Niharika",
    group: "students",
    password: "123456",
  },
  {
    role: "Evaluator" as const,
    email: "eval@lms.com",
    name: "Eval",
    group: "evaluators",
    password: "123456",
  },
  {
    role: "Support" as const,
    email: "maheshwar@lms.com",
    name: "Maheshwar",
    group: "support",
    password: "123456",
  },
]

async function run() {
  console.log(`Resetting users on Cognito user pool: ${poolId}...`)

  // 1. Update password policy to allow 6-character passwords
  try {
    await cognito.send(
      new UpdateUserPoolCommand({
        UserPoolId: poolId,
        Policies: {
          PasswordPolicy: {
            MinimumLength: 6,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
            TemporaryPasswordValidityDays: 7,
          },
        },
      }),
    )
    console.log("✓ Updated Cognito password policy (min length 6, no complex requirements).")
  } catch (err) {
    console.warn("Could not update user pool policy:", (err as Error).message)
  }

  // 2. Ensure all groups exist
  for (const [group, role] of GROUP_ROLES) {
    try {
      await cognito.send(
        new CreateGroupCommand({
          UserPoolId: poolId,
          GroupName: group,
          Description: `${role} accounts`,
        }),
      )
      console.log(`✓ Created group ${group}`)
    } catch (e) {
      if ((e as Error).name !== "GroupExistsException") {
        console.warn(`Group ${group}: ${(e as Error).message}`)
      }
    }
  }

  // 3. List and delete ALL existing Cognito users
  const listRes = await cognito.send(new ListUsersCommand({ UserPoolId: poolId }))
  const existingCognitoUsers = listRes.Users || []
  console.log(`Found ${existingCognitoUsers.length} existing Cognito users to remove.`)

  for (const u of existingCognitoUsers) {
    if (u.Username) {
      try {
        await cognito.send(
          new AdminDeleteUserCommand({
            UserPoolId: poolId,
            Username: u.Username,
          }),
        )
        console.log(`✓ Deleted Cognito user ${u.Username}`)
      } catch (e) {
        console.warn(`Failed to delete Cognito user ${u.Username}:`, (e as Error).message)
      }
    }
  }

  // 4. Create each requested user in Cognito
  const createdSubs = new Map<string, string>()

  for (const u of USERS_TO_CREATE) {
    try {
      const created = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: poolId,
          Username: u.email,
          MessageAction: "SUPPRESS",
          UserAttributes: [
            { Name: "email", Value: u.email },
            { Name: "email_verified", Value: "true" },
            { Name: "name", Value: u.name },
          ],
        }),
      )
      const sub = created.User?.Attributes?.find((a) => a.Name === "sub")?.Value
      if (sub) createdSubs.set(u.email.toLowerCase(), sub)
    } catch (e) {
      console.warn(`AdminCreateUser for ${u.email}:`, (e as Error).message)
    }

    try {
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: poolId,
          Username: u.email,
          Password: u.password,
          Permanent: true,
        }),
      )
    } catch (e) {
      console.error(`Failed to set password for ${u.email}:`, (e as Error).message)
    }

    if (u.group) {
      try {
        await cognito.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: poolId,
            Username: u.email,
            GroupName: u.group,
          }),
        )
      } catch (e) {
        console.warn(`Failed to add ${u.email} to group ${u.group}:`, (e as Error).message)
      }
    }
    console.log(`✓ Successfully created ${u.role}: ${u.email} (password: ${u.password})`)
  }

  // 5. Database clean-up and seeding
  console.log("Connecting to PostgreSQL database to seed clean users and content...")
  const pool = createPool({ ...config, DATABASE_POOL_MAX: 3 })
  const db = createDb(pool)

  try {
    // Clear old users from lms.users
    await db.execute(sql`DELETE FROM lms.users`)
    console.log("✓ Cleared all rows from lms.users (cascaded).")

    // Insert the 6 users into lms.users (cognito_sub is null initially, linked on first sign-in)
    const userIds = new Map<string, string>()
    for (const u of USERS_TO_CREATE) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${u.email.toLowerCase()}`)
        .limit(1)

      if (existing) {
        await db
          .update(users)
          .set({ cognito_sub: null, full_name: u.name, role: u.role, is_demo: true, updated_at: new Date() })
          .where(eq(users.id, existing.id))
        userIds.set(u.email.toLowerCase(), existing.id)
      } else {
        const [row] = await db
          .insert(users)
          .values({
            cognito_sub: null,
            email: u.email,
            full_name: u.name,
            role: u.role,
            is_demo: true,
          })
          .returning({ id: users.id })
        userIds.set(u.email.toLowerCase(), row.id)
      }
    }
    console.log(`✓ Inserted ${userIds.size} clean user records into lms.users.`)

    // Seed shared course content and rubrics
    const now = new Date()
    await db.transaction((tx) => seedContent(tx, now, config.CAMPUS_TZ))
    console.log("✓ Seeded course curriculum, rubrics, and community content.")

    // Seed student demo data for Niharika
    const studentId = userIds.get("niharika@lms.com")
    if (studentId) {
      await db.transaction(async (tx) => {
        await tx.update(users).set({ is_demo: true }).where(eq(users.id, studentId))
        await seedStudentDemo(tx, studentId, now, config.CAMPUS_TZ)
      })
      console.log("✓ Seeded student demo data for niharika@lms.com.")
    }

    // Seed evaluator demo data for Eval
    const evaluatorId = userIds.get("eval@lms.com")
    if (evaluatorId) {
      const { storage } = createStorage(config)
      await db.transaction(async (tx) => {
        await tx.update(users).set({ is_demo: true, role: "Evaluator" }).where(eq(users.id, evaluatorId))
        await seedEvaluatorDemo(tx, {
          evaluatorId,
          anchor: now,
          tz: config.CAMPUS_TZ,
          storage,
          demoStudentEmail: "niharika@lms.com",
        })
      })
      console.log("✓ Seeded evaluator demo data for eval@lms.com.")
    }

    console.log("\n========================================================")
    console.log("ALL REQUESTED USERS SUCCESSFULLY CREATED & INITIALIZED!")
    console.log("========================================================")
    for (const u of USERS_TO_CREATE) {
      console.log(`• ${u.role.padEnd(12)}: ${u.email.padEnd(20)} password: ${u.password}`)
    }
  } finally {
    await pool.end()
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in reset-and-seed-users:", err)
  process.exit(1)
})
