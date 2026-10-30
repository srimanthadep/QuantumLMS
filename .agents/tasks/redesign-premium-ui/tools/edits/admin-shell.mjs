import fs from "node:fs"
const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/pages/admin/AdminPortal.tsx"
const raw = fs.readFileSync(file, "utf8")
const crlf = raw.includes("\r\n")
let s = raw.replace(/\r\n/g, "\n")

function between(startMarker, endMarker, replacement, includeEnd = true) {
  const a = s.indexOf(startMarker)
  const b = s.indexOf(endMarker, a + startMarker.length)
  if (a < 0 || b < 0) throw new Error(`markers not found: ${startMarker.slice(0, 50)} / ${endMarker.slice(0, 50)}`)
  s = s.slice(0, a) + replacement + s.slice(includeEnd ? b + endMarker.length : b)
}
function replaceOnce(find, rep) {
  if (!s.includes(find)) throw new Error(`not found: ${find.slice(0, 60)}`)
  s = s.replace(find, () => rep)
}

replaceOnce('import { ThemeAccentPicker } from "../../components/ui/ThemeAccentPicker"\n', "")
replaceOnce('import { AppSidebar as AdminSidebar } from "../../components/Sidebar"\n', 'import AppShell from "../../components/shell/AppShell"\n')
replaceOnce("  const [showRoleDropdown, setShowRoleDropdown] = useState(false)\n", "")

replaceOnce(
  "interface AdminPortalProps {",
  `/** Shell nav id <-> legacy admin tab. Ids without a tab yet are hidden until Phase 7 adds the page. */
const ADMIN_NAV: Record<string, string> = {
  overview: "Overview",
  batches: "Class Schedules",
  teachers: "Faculty Directory",
  students: "Student Roster",
  reports: "School Reports",
  settings: "School Settings",
}
const SUPER_NAV: Record<string, string> = {
  health: "System Health",
  tenants: "Campuses",
  access: "Access Control",
  audit: "Audit Logs",
  ai: "AI Engine",
}

interface AdminPortalProps {`,
)

between(
  '  return (\n    <div\n      className="dashboard-shell"',
  '<main className="dashboard-content">\n',
  `  const navMap = role === "Super Admin" ? SUPER_NAV : ADMIN_NAV
  const activeNav = Object.keys(navMap).find((id) => navMap[id] === activeTab)

  return (
    <AppShell
      role={role}
      activeId={activeNav}
      availableIds={Object.keys(navMap)}
      onNavigate={(id) => navMap[id] && setActiveTab(navMap[id])}
    >
      <div className="dashboard-content min-w-0">
`,
)

between("            {/* Quick Role Switcher Pill - matches Teacher page Student Portal pill */}", "            {/* Campus Selector for Super Admin */}", "            {/* Campus Selector for Super Admin */}")
replaceOnce("            <ThemeAccentPicker />\n", "")

s = s.replace(/      <\/main>(\s*)\{\/\* Modals \*\/\}/, (_m, ws) => `      </div>${ws}{/* Modals */}`)
s = s.replace(/(onClose=\{\(\) => setInspectAuditLog\(null\)\}\s*\/>\s*)<\/div>(\s*\)\s*\}\s*)$/, (_m, a, b) => `${a}</AppShell>${b}`)

fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s)
console.log("ok")
