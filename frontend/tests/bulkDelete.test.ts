import assert from "node:assert/strict"
import { test } from "node:test"
import { bulkResultMessage, deleteMany } from "../src/pages/admin/views/shared/bulkDelete"

const items = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }, { id: "c", name: "Gamma" }]

test("deletes in order and keeps going when one is refused", async () => {
  const calls: string[] = []
  const { done, failed } = await deleteMany(items, async (id) => {
    calls.push(id)
    if (id === "b") throw new Error("This batch has registration history.")
  })
  assert.deepEqual(calls, ["a", "b", "c"])
  assert.deepEqual(done.map((i) => i.id), ["a", "c"])
  assert.equal(failed.length, 1)
  assert.equal(failed[0]!.item.id, "b")
  assert.equal(failed[0]!.message, "This batch has registration history.")
})

test("reports each item as it finishes, with the reason when refused", async () => {
  const seen: string[] = []
  await deleteMany(items, async (id) => {
    if (id === "c") throw new Error("Locked.")
  }, (item, error) => seen.push(`${item.id}:${error ?? "ok"}`))
  assert.deepEqual(seen, ["a:ok", "b:ok", "c:Locked."])
})

test("never runs two deletes at once", async () => {
  let running = 0
  let peak = 0
  await deleteMany(items, async () => {
    running += 1
    peak = Math.max(peak, running)
    await new Promise((resolve) => setTimeout(resolve, 5))
    running -= 1
  })
  assert.equal(peak, 1)
})

test("a non-Error rejection still gives a readable message", async () => {
  const { failed } = await deleteMany(items.slice(0, 1), () => Promise.reject("nope"))
  assert.equal(failed[0]!.message, "Something went wrong.")
})

test("the toast says how many went and why the first one didn't", () => {
  const noun = { one: "batch", many: "batches" }
  assert.equal(bulkResultMessage("Deleted", noun, 1, []), "Deleted 1 batch")
  assert.equal(bulkResultMessage("Deleted", noun, 3, []), "Deleted 3 batches")
  assert.equal(bulkResultMessage("Deleted", noun, 2, [{ name: "Beta", message: "Has learners." }]), 'Deleted 2 of 3. Couldn\'t remove "Beta": Has learners.')
  assert.equal(
    bulkResultMessage("Deleted", noun, 1, [{ name: "Beta", message: "Has learners." }, { name: "Gamma", message: "Locked." }]),
    'Deleted 1 of 3. Couldn\'t remove "Beta": Has learners. (+1 more)',
  )
  assert.equal(bulkResultMessage("Removed", { one: "course", many: "courses" }, 0, [{ name: "Alpha", message: "Offline." }]), 'Couldn\'t remove "Alpha": Offline.')
})
