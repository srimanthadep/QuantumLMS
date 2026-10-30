import fs from "node:fs"
const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/pages/support/index.tsx"
const raw = fs.readFileSync(file, "utf8")
const crlf = raw.includes("\r\n")
let s = raw.replace(/\r\n/g, "\n")

function between(startMarker, endMarker, replacement, { includeEnd = true, from = 0 } = {}) {
  const a = s.indexOf(startMarker, from)
  const b = s.indexOf(endMarker, a + startMarker.length)
  if (a < 0 || b < 0) throw new Error(`markers not found: ${startMarker.slice(0, 50)} / ${endMarker.slice(0, 50)}`)
  s = s.slice(0, a) + replacement + s.slice(includeEnd ? b + endMarker.length : b)
}
function replaceOnce(find, rep) {
  if (!s.includes(find)) throw new Error(`not found: ${find.slice(0, 60)}`)
  s = s.replace(find, () => rep)
}

// 1. Drop the support-only sidebar (AppShell owns navigation).
between("function SupportSidebar(", "function SupportLayout(", "", { includeEnd: false })
// NAV_ITEMS / NavItem / SupportTab only served the sidebar.
between("type SupportTab =", "function SupportLayout(", "", { includeEnd: false })

// 2. Imports
replaceOnce('import type { UserRole, CurrentUser, IconName } from "@/types"', 'import type { UserRole, CurrentUser } from "@/types"')
replaceOnce('import { ThemeAccentPicker } from "@/components/ui/ThemeAccentPicker"\n', 'import AppShell from "@/components/shell/AppShell"\n')

// 3. Local state that only the old chrome used
replaceOnce("  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)\n", "")
replaceOnce("  const [showRoleDropdown, setShowRoleDropdown] = useState(false)\n", "")

// 4. Outer frame -> AppShell
between(
  '  return (\n    <div\n      className="dashboard-shell support-portal-root"',
  '<main className="dashboard-content">\n',
  `  const path = location.pathname.toLowerCase()
  const activeNav = /\\/support\\/(inbox|tickets?)/.test(path)
    ? "inbox"
    : (["live-chat", "knowledge-base", "agents", "analytics", "settings"].find((id) => path.startsWith(\`/support/\${id}\`)) ?? "dashboard")

  return (
    <AppShell role="Support" activeId={activeNav} onNavigate={(id) => navigate(id === "dashboard" ? "/support" : \`/support/\${id}\`)}>
      <div className="dashboard-content support-portal-root min-w-0">
`,
)

// 5. Remove the duplicated role switcher, theme picker and Ask AI pill from the page header.
between("            {/* Quick Role Switcher Pill */}", "          </div>\n        </header>", "", { includeEnd: false })

// 6. Close the frame
replaceOnce("      </main>\n    </div>\n  )\n}", "      </div>\n    </AppShell>\n  )\n}")

fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s)
console.log("ok")
