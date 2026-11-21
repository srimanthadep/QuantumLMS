import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import localPasswordAccounts, { allowsSavedAccounts } from "../localPasswordAccounts"

const local = { VITE_COGNITO_USER_POOL_ID: "local_test", VITE_COGNITO_ENDPOINT: "http://localhost:9229" }

test("saved passwords are available only with a local pool in the development server", () => {
  assert.equal(allowsSavedAccounts("serve", false, local), true)
  assert.equal(allowsSavedAccounts("build", false, local), false)
  assert.equal(allowsSavedAccounts("serve", true, local), false)
  assert.equal(allowsSavedAccounts("serve", false, { ...local, VITE_COGNITO_USER_POOL_ID: "eu-north-1_real" }), false)
  assert.equal(allowsSavedAccounts("serve", false, { ...local, VITE_COGNITO_ENDPOINT: "https://cognito.example.com" }), false)
  assert.equal(allowsSavedAccounts("serve", false, { ...local, VITE_COGNITO_ENDPOINT: "invalid" }), false)
})

test("builds expose no passwords; local shortcuts accept only the provisioned test accounts", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "quantumlms-saved-accounts-"))
  try {
    const file = path.join(dir, "accounts.json")
    writeFileSync(file, JSON.stringify([
      { role: "Admin", email: "admin.test@lms.com", password: "fixture-password-123" },
      { role: "Super Admin", email: "real-account@example.com", password: "never-export-this" },
    ]))
    async function output(enabled: boolean) {
      const hook = localPasswordAccounts(enabled, file).load!
      const handler = typeof hook === "function" ? hook : hook.handler
      return handler.call({ warn() {} } as never, "\0virtual:local-password-accounts")
    }
    assert.equal(await output(false), "export default []")
    const module = String(await output(true))
    assert.match(module, /admin\.test@lms\.com/)
    assert.doesNotMatch(module, /real-account|never-export-this/)
  } finally {
    // Only this test's fresh temporary directory is removed.
    if (path.dirname(dir) === path.resolve(tmpdir()) && path.basename(dir).startsWith("quantumlms-saved-accounts-")) rmSync(dir, { recursive: true, force: true })
  }
})
