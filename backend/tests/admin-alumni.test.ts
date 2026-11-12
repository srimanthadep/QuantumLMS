import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let admin: TestUser
let superAdmin: TestUser

let originalMetrics: {
  studentsPlaced: string
  highestHike: string
  highestPackage: string
  hiringPartners: string
} | null = null

const createdProfileIds: string[] = []
const createdStoryIds: string[] = []
const createdPlacementIds: string[] = []

const prevDemoMode = process.env.DEMO_MODE

before(async () => {
  // Exercise real Cognito / RBAC checks even when local .env enables DEMO_MODE.
  process.env.DEMO_MODE = "false"
  h = await createHarness()
  student = await h.user({ name: "Student Meera", groups: ["students"] })
  admin = await h.user({ name: "Admin Vikram", groups: ["admins"] })
  superAdmin = await h.user({ name: "SuperAdmin Kavya", groups: ["super-admins"] })

  const initial = await admin.call("GET", "/api/admin/alumni")
  assert.equal(initial.status, 200)
  originalMetrics = initial.body.metrics
})

after(async () => {
  for (const id of createdProfileIds) {
    await admin.call("DELETE", `/api/admin/alumni/profiles/${id}`).catch(() => {})
  }
  for (const id of createdStoryIds) {
    await admin.call("DELETE", `/api/admin/alumni/stories/${id}`).catch(() => {})
  }
  for (const id of createdPlacementIds) {
    await admin.call("DELETE", `/api/admin/alumni/placements/${id}`).catch(() => {})
  }
  if (originalMetrics) {
    await admin.call("PATCH", "/api/admin/alumni/metrics", originalMetrics).catch(() => {})
  }
  await h.close()
  if (prevDemoMode === undefined) delete process.env.DEMO_MODE
  else process.env.DEMO_MODE = prevDemoMode
})

describe("alumni network access control", () => {
  test("unauthenticated requests are rejected with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/admin/alumni" })
    assert.equal(res.statusCode, 401)
  })

  test("students can read /api/student/alumni but cannot access admin alumni mutations (403)", async () => {
    const readRes = await student.call("GET", "/api/student/alumni")
    assert.equal(readRes.status, 200)
    assert.ok(Array.isArray(readRes.body.profiles))
    assert.ok(Array.isArray(readRes.body.stories))
    assert.ok(Array.isArray(readRes.body.recentPlacements))
    assert.ok(readRes.body.metrics)

    const adminGet = await student.call("GET", "/api/admin/alumni")
    assert.equal(adminGet.status, 403)

    const postRes = await student.call("POST", "/api/admin/alumni/profiles", {
      name: "Unauthorized Alumni",
      tag: "Fresher",
      currentCompany: "TestCo",
      role: "Engineer",
      location: "Bangalore",
      degree: "B.Tech / BE",
    })
    assert.equal(postRes.status, 403)

    const delRes = await student.call("DELETE", "/api/admin/alumni/profiles/alumni-anuraj")
    assert.equal(delRes.status, 403)
  })
})

describe("admin and super admin alumni network CRUD", () => {
  test("admin can post, edit, and delete an alumni directory profile", async () => {
    const createRes = await admin.call("POST", "/api/admin/alumni/profiles", {
      id: "client-forged-id",
      name: "Aarav Deshmukh",
      tag: "Upskiller",
      currentCompany: "OpenAI",
      role: "Applied AI Engineer",
      hike: "220% hike",
      lmsProgram: "Joined Quantum School",
      priorRole: "Systems Engineer",
      priorCompany: "Infosys",
      location: "Bangalore",
      degree: "B.Tech / BE",
      package: "₹42 LPA",
      bio: "Built production agent workflows with Quantum School mentors.",
      prepStrategy: "Practiced LLM evals and distributed inference patterns.",
      skills: ["Python", "RAG", "Evaluations"],
      linkedInUrl: "https://linkedin.com/in/aarav-deshmukh",
    })
    assert.equal(createRes.status, 201, JSON.stringify(createRes.body))
    assert.ok(createRes.body.profile.id)
    assert.notEqual(createRes.body.profile.id, "client-forged-id")

    const profileId = createRes.body.profile.id as string
    createdProfileIds.push(profileId)

    const studentListAfterPost = await student.call("GET", "/api/student/alumni")
    assert.equal(studentListAfterPost.status, 200)
    assert.ok(studentListAfterPost.body.profiles.some((p: any) => p.id === profileId && p.name === "Aarav Deshmukh"))

    const patchRes = await admin.call("PATCH", `/api/admin/alumni/profiles/${profileId}`, {
      role: "Staff Applied AI Engineer",
      package: "₹48 LPA",
    })
    assert.equal(patchRes.status, 200)
    assert.equal(patchRes.body.profile.role, "Staff Applied AI Engineer")
    assert.equal(patchRes.body.profile.package, "₹48 LPA")

    const delRes = await admin.call("DELETE", `/api/admin/alumni/profiles/${profileId}`)
    assert.equal(delRes.status, 200)
    assert.equal(delRes.body.deleted, profileId)

    const studentListAfterDelete = await student.call("GET", "/api/student/alumni")
    assert.ok(!studentListAfterDelete.body.profiles.some((p: any) => p.id === profileId))
  })

  test("super admin can post, edit, and delete placement stories", async () => {
    const createRes = await superAdmin.call("POST", "/api/admin/alumni/stories", {
      fullName: "Meenakshi Iyer",
      company: "Anthropic",
      role: "ML Safety Engineer",
      package: "₹65 LPA",
      head: "From Campus Labs to Frontier Alignment Research",
      quote: "Focused weekly critiques sharpened my ML systems fundamentals.",
      highlight: "Research Offer",
    })
    assert.equal(createRes.status, 201, JSON.stringify(createRes.body))
    const storyId = createRes.body.story.id as string
    createdStoryIds.push(storyId)

    const patchRes = await admin.call("PATCH", `/api/admin/alumni/stories/${storyId}`, {
      package: "₹70 LPA",
    })
    assert.equal(patchRes.status, 200)
    assert.equal(patchRes.body.story.package, "₹70 LPA")

    const studentRes = await student.call("GET", "/api/student/alumni")
    assert.ok(studentRes.body.stories.some((s: any) => s.id === storyId && s.package === "₹70 LPA"))

    const delRes = await superAdmin.call("DELETE", `/api/admin/alumni/stories/${storyId}`)
    assert.equal(delRes.status, 200)
    assert.equal(delRes.body.deleted, storyId)
  })

  test("admin can post, edit, and delete recent placements and update metrics", async () => {
    const createRes = await admin.call("POST", "/api/admin/alumni/placements", {
      name: "Devika Nair",
      company: "Flipkart",
      role: "ML Platform Engineer",
      color: "#2563EB",
    })
    assert.equal(createRes.status, 201)
    const placementId = createRes.body.placement.id as string
    createdPlacementIds.push(placementId)

    const patchRes = await admin.call("PATCH", `/api/admin/alumni/placements/${placementId}`, {
      role: "Senior ML Platform Engineer",
    })
    assert.equal(patchRes.status, 200)
    assert.equal(patchRes.body.placement.role, "Senior ML Platform Engineer")

    const metricsRes = await admin.call("PATCH", "/api/admin/alumni/metrics", {
      studentsPlaced: "4,600+",
    })
    assert.equal(metricsRes.status, 200)
    assert.equal(metricsRes.body.metrics.studentsPlaced, "4,600+")

    const studentRes = await student.call("GET", "/api/student/alumni")
    assert.equal(studentRes.body.metrics.studentsPlaced, "4,600+")
    assert.ok(studentRes.body.recentPlacements.some((p: any) => p.id === placementId))

    const delRes = await admin.call("DELETE", `/api/admin/alumni/placements/${placementId}`)
    assert.equal(delRes.status, 200)
    assert.equal(delRes.body.deleted, placementId)
  })
})
