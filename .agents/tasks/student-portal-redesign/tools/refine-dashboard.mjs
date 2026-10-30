// One-off: refine StudentDashboardPage to use the shared student components.
// Every replacement must match exactly once, otherwise nothing is written.
import fs from "node:fs"

const file = "c:/Users/srima/Downloads/QuantumLMS/frontend/src/pages/student/StudentDashboardPage.tsx"
let t = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
let failed = 0

function swap(label, from, to) {
  const n = t.split(from).length - 1
  if (n !== 1) {
    console.log(`FAIL ${label}: ${n} matches`)
    failed++
    return
  }
  t = t.replace(from, to)
  console.log(`ok   ${label}`)
}
function swapRange(label, start, end, to) {
  const a = t.indexOf(start)
  const b = a < 0 ? -1 : t.indexOf(end, a)
  if (a < 0 || b < 0) {
    console.log(`FAIL ${label}: range not found`)
    failed++
    return
  }
  t = t.slice(0, a) + to + t.slice(b + end.length)
  console.log(`ok   ${label}`)
}

// Hero copy: full white on the gradient (lighter whites fall below AA).
swap("hero module", 'text-sm font-medium text-white/85">Module 4', 'text-sm font-medium text-white">Module 4')
swap("hero lesson", 'text-caption text-white/70">Lesson 3 of 8', 'text-caption text-white">Lesson 3 of 8')
swap("hero progress label", "text-caption font-medium text-white/80", "text-caption font-medium text-white")

// Course grid -> shared CourseCard with layout animation.
swapRange(
  "course grid",
  '<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">\n                      {filteredCourses.map((course) => {',
  "                      })}\n                    </div>",
  `<motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {filteredCourses.map((course) => (
                          <CourseCard key={course.id} course={course} onOpen={() => onNavigate("Course Details", course.id)} />
                        ))}
                      </AnimatePresence>
                    </motion.div>`,
)

// Certificate: shared dialog.
swapRange("download/share helpers", "  const downloadCertificate = () => {", "    onToast(\"Credential verification link copied to clipboard! 🔗\")\n  }\n", "")
swapRange(
  "certificate dialog",
  "      {/* Certificate dialog */}",
  "      </Dialog>\n",
  `      <CertificateDialog certificate={certOpen ? CERTIFICATE : null} recipient={user.name} onClose={() => setCertOpen(false)} onToast={onToast} />\n`,
)
swap("cert state", "const [isCertModalOpen, setIsCertModalOpen] = useState(false)", "const [certOpen, setCertOpen] = useState(false)")
swap("cert open", "onClick={() => setIsCertModalOpen(true)}", "onClick={() => setCertOpen(true)}")
swap("cert card title", '<p className="truncate text-sm font-semibold text-foreground">Python for AI</p>', '<p className="truncate text-sm font-semibold text-foreground">{CERTIFICATE.title}</p>')

// Imports.
swap("framer import", 'import { motion } from "framer-motion"', 'import { AnimatePresence, motion } from "framer-motion"')
swap(
  "student imports",
  'import { initialStudentCourses } from "./studentMockData"',
  'import CourseCard from "@/components/student/CourseCard"\nimport CertificateDialog from "@/components/student/CertificateDialog"\nimport { initialCertificatesList, initialStudentCourses } from "./studentMockData"\n\nconst CERTIFICATE = initialCertificatesList.find((c) => c.status === "Earned") ?? initialCertificatesList[0]',
)

if (failed) {
  console.log(`\n${failed} replacements failed; nothing written`)
  process.exit(1)
}
fs.writeFileSync(file, t.replace(/\n/g, "\r\n"))
console.log("\nwritten")
