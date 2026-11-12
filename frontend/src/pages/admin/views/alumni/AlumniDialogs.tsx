import { useEffect, useState } from "react"
import { Briefcase, Sparkles, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ALUMNI_TAGS,
  KNOWN_COMPANY_LOGOS,
  STORY_THEMES,
  resolveCompanyLogo,
  type AlumniMetrics,
  type AlumniProfile,
  type AlumniTag,
  type PlacementItem,
  type PlacementStory,
  type StoryThemePreset,
} from "@/data/alumniStore"

const LOCATION_SUGGESTIONS = ["Bangalore", "Hyderabad", "Pune", "Delhi / NCR", "Mumbai", "Chennai", "Luxembourg", "Remote"]
const DEGREE_SUGGESTIONS = ["B.Tech / BE", "M.Tech / MS", "MCA / M.Sc", "B.Sc / BCA", "B.Com / BA / BBA", "MBA / PGDM"]

const PLACEMENT_COLORS = [
  "#0F172A",
  "#1D4ED8",
  "#4338CA",
  "#0F766E",
  "#0369A1",
  "#047857",
  "#B45309",
  "#BE123C",
]

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-foreground">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function isValidAssetOrUrl(v: string): boolean {
  const s = v.trim()
  return !s || s.startsWith("/") || /^https?:\/\//i.test(s)
}

function isValidHttpUrl(v: string): boolean {
  const s = v.trim()
  return !s || /^https?:\/\//i.test(s)
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return "Something went wrong. Please review the fields and try again."
}

// -----------------------------------------------------------------------------
// 1. Alumni Directory Profile Create / Edit Dialog
// -----------------------------------------------------------------------------

interface AlumniProfileFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProfile: AlumniProfile | null
  onSubmit: (values: Omit<AlumniProfile, "id">) => Promise<void>
}

export function AlumniProfileFormDialog({
  open,
  onOpenChange,
  initialProfile,
  onSubmit,
}: AlumniProfileFormDialogProps) {
  const isEdit = !!initialProfile

  const [name, setName] = useState("")
  const [tag, setTag] = useState<AlumniTag>("Upskiller")
  const [currentCompany, setCurrentCompany] = useState("")
  const [companyLogo, setCompanyLogo] = useState("")
  const [role, setRole] = useState("")
  const [hike, setHike] = useState("")
  const [pkg, setPkg] = useState("")
  const [lmsProgram, setLmsProgram] = useState("Joined Quantum School")
  const [priorRole, setPriorRole] = useState("")
  const [priorCompany, setPriorCompany] = useState("")
  const [location, setLocation] = useState("Bangalore")
  const [degree, setDegree] = useState("B.Tech / BE")
  const [skillsText, setSkillsText] = useState("")
  const [linkedInUrl, setLinkedInUrl] = useState("")
  const [avatar, setAvatar] = useState("")
  const [bio, setBio] = useState("")
  const [prepStrategy, setPrepStrategy] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (initialProfile) {
      setName(initialProfile.name)
      setTag(initialProfile.tag)
      setCurrentCompany(initialProfile.currentCompany)
      setCompanyLogo(initialProfile.companyLogo ?? "")
      setRole(initialProfile.role)
      setHike(initialProfile.hike)
      setPkg(initialProfile.package ?? "")
      setLmsProgram(initialProfile.lmsProgram || "Joined Quantum School")
      setPriorRole(initialProfile.priorRole)
      setPriorCompany(initialProfile.priorCompany)
      setLocation(initialProfile.location)
      setDegree(initialProfile.degree)
      setSkillsText(initialProfile.skills.join(", "))
      setLinkedInUrl(initialProfile.linkedInUrl ?? "")
      setAvatar(initialProfile.avatar ?? "")
      setBio(initialProfile.bio)
      setPrepStrategy(initialProfile.prepStrategy)
    } else {
      setName("")
      setTag("Upskiller")
      setCurrentCompany("")
      setCompanyLogo("")
      setRole("")
      setHike("120% hike")
      setPkg("")
      setLmsProgram("Joined Quantum School")
      setPriorRole("")
      setPriorCompany("")
      setLocation("Bangalore")
      setDegree("B.Tech / BE")
      setSkillsText("Python, SQL, System Design")
      setLinkedInUrl("")
      setAvatar("")
      setBio("")
      setPrepStrategy("")
    }
  }, [open, initialProfile])

  const detectedLogo = resolveCompanyLogo(currentCompany, companyLogo)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError("Alumni name must be at least 2 characters.")
    if (!currentCompany.trim()) return setError("Current company is required.")
    if (role.trim().length < 2) return setError("Current role must be at least 2 characters.")
    if (!location.trim()) return setError("Location is required.")
    if (!degree.trim()) return setError("Degree is required.")
    if (!isValidAssetOrUrl(companyLogo)) return setError("Company logo must start with '/' or 'http(s)://'.")
    if (!isValidAssetOrUrl(avatar)) return setError("Avatar URL must start with '/' or 'http(s)://'.")
    if (!isValidHttpUrl(linkedInUrl)) return setError("LinkedIn URL must start with http:// or https://.")

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)

    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        avatar: avatar.trim(),
        tag,
        currentCompany: currentCompany.trim(),
        companyLogo: (companyLogo.trim() || detectedLogo).trim(),
        role: role.trim(),
        hike: hike.trim(),
        package: pkg.trim(),
        lmsProgram: lmsProgram.trim() || "Joined Quantum School",
        priorRole: priorRole.trim(),
        priorCompany: priorCompany.trim(),
        location: location.trim(),
        degree: degree.trim(),
        bio: bio.trim(),
        prepStrategy: prepStrategy.trim(),
        skills,
        linkedInUrl: linkedInUrl.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Alumni Profile" : "Post New Alumni Profile"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this graduate's placement story, transition path, and company details across the Student Alumni Directory."
              : "Publish a graduate transition journey to the Student Alumni Directory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="Full Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                required
              />
            </FormField>

            <FormField label="Transition Category" required>
              <CustomSelect
                value={tag}
                onChange={(v) => setTag(v as AlumniTag)}
                options={[...ALUMNI_TAGS]}
              />
            </FormField>

            <FormField label="Current Company" required>
              <Input
                value={currentCompany}
                onChange={(e) => {
                  const next = e.target.value
                  setCurrentCompany(next)
                  if (!companyLogo || KNOWN_COMPANY_LOGOS.some((l) => l.logo === companyLogo)) {
                    const matched = resolveCompanyLogo(next)
                    if (matched) setCompanyLogo(matched)
                  }
                }}
                placeholder="e.g. Uber, Flipkart, Razorpay"
                list="alumni-company-suggestions"
                required
              />
              <datalist id="alumni-company-suggestions">
                {KNOWN_COMPANY_LOGOS.map((item) => (
                  <option key={item.name} value={item.name} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Current Role" required>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Applied AI Engineer"
                required
              />
            </FormField>

            <FormField label="Compensation Package" hint="Optional badge">
              <Input
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="e.g. ₹28 LPA"
              />
            </FormField>

            <FormField label="Salary Hike Highlight" hint="Optional badge">
              <Input
                value={hike}
                onChange={(e) => setHike(e.target.value)}
                placeholder="e.g. 220% hike"
              />
            </FormField>

            <FormField label="Location" required>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore"
                list="alumni-location-suggestions"
                required
              />
              <datalist id="alumni-location-suggestions">
                {LOCATION_SUGGESTIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Academic Degree" required>
              <Input
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech / BE"
                list="alumni-degree-suggestions"
                required
              />
              <datalist id="alumni-degree-suggestions">
                {DEGREE_SUGGESTIONS.map((deg) => (
                  <option key={deg} value={deg} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Prior Role" hint="Before joining">
              <Input
                value={priorRole}
                onChange={(e) => setPriorRole(e.target.value)}
                placeholder="e.g. Career Break or QA Analyst"
              />
            </FormField>

            <FormField label="Prior Company / Background">
              <Input
                value={priorCompany}
                onChange={(e) => setPriorCompany(e.target.value)}
                placeholder="e.g. Infosys or Fresher Graduate"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="LMS Program Milestone">
              <Input
                value={lmsProgram}
                onChange={(e) => setLmsProgram(e.target.value)}
                placeholder="Joined Quantum School"
              />
            </FormField>

            <FormField label="Skills & Stack" hint="Comma-separated">
              <Input
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Python, SQL, System Design, RAG"
              />
            </FormField>

            <FormField label="Company Logo Path / URL" hint={detectedLogo ? "Matched logo ready" : "Optional"}>
              <div className="flex items-center gap-2">
                <Input
                  value={companyLogo}
                  onChange={(e) => setCompanyLogo(e.target.value)}
                  placeholder="/logos/uber.svg or https://..."
                />
                {detectedLogo && (
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1">
                    <img src={detectedLogo} alt="" className="max-h-6 max-w-full object-contain" />
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="LinkedIn Profile URL" hint="Optional">
              <Input
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </FormField>
          </div>

          <FormField label="Avatar Photo URL" hint="Optional — initials used if blank">
            <Input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="/avatars/alumni.jpg or https://..."
            />
          </FormField>

          <FormField label="Career Journey Summary">
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share how this graduate navigated their career switch or upskilling journey..."
            />
          </FormField>

          <FormField label="Preparation Strategy & Advice">
            <Textarea
              rows={2}
              value={prepStrategy}
              onChange={(e) => setPrepStrategy(e.target.value)}
              placeholder="Key habits, mock interviews, or projects that helped unlock the offer..."
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Save Profile Changes" : "Publish Alumni Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// 2. Placement Story Create / Edit Dialog
// -----------------------------------------------------------------------------

interface PlacementStoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStory: PlacementStory | null
  onSubmit: (values: Omit<PlacementStory, "id">) => Promise<void>
}

export function PlacementStoryFormDialog({
  open,
  onOpenChange,
  initialStory,
  onSubmit,
}: PlacementStoryFormDialogProps) {
  const isEdit = !!initialStory

  const [fullName, setFullName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [pkg, setPkg] = useState("")
  const [highlight, setHighlight] = useState("")
  const [head, setHead] = useState("")
  const [quote, setQuote] = useState("")
  const [themeId, setThemeId] = useState<string>(STORY_THEMES[0].id)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (initialStory) {
      setFullName(initialStory.fullName)
      setFirstName(initialStory.firstName)
      setCompany(initialStory.company)
      setRole(initialStory.role)
      setPkg(initialStory.package)
      setHighlight(initialStory.highlight)
      setHead(initialStory.head)
      setQuote(initialStory.quote)
      const matched = STORY_THEMES.find((t) => t.accent.toLowerCase() === initialStory.accent.toLowerCase())
      setThemeId(matched?.id ?? STORY_THEMES[0].id)
    } else {
      setFullName("")
      setFirstName("")
      setCompany("")
      setRole("")
      setPkg("₹24 LPA")
      setHighlight("Featured Breakthrough")
      setHead("")
      setQuote("")
      setThemeId(STORY_THEMES[0].id)
    }
  }, [open, initialStory])

  const selectedTheme: StoryThemePreset = STORY_THEMES.find((t) => t.id === themeId) ?? STORY_THEMES[0]

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fullName.trim().length < 2) return setError("Full name must be at least 2 characters.")
    if (!company.trim()) return setError("Company is required.")
    if (role.trim().length < 2) return setError("Role must be at least 2 characters.")
    if (head.trim().length < 3) return setError("Headline must be at least 3 characters.")
    if (quote.trim().length < 5) return setError("Story quote must be at least 5 characters.")

    const resolvedFirst = (firstName.trim() || fullName.trim().split(/\s+/)[0] || fullName.trim()).slice(0, 60)

    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        firstName: resolvedFirst,
        fullName: fullName.trim(),
        company: company.trim(),
        role: role.trim(),
        package: pkg.trim(),
        highlight: highlight.trim() || "Featured Offer",
        head: head.trim(),
        quote: quote.trim(),
        accent: selectedTheme.accent,
        glow: selectedTheme.glow,
        kickerClass: selectedTheme.kickerClass,
        avatarBg: selectedTheme.avatarBg,
      })
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Placement Story" : "Post New Placement Story"}</DialogTitle>
          <DialogDescription>
            Stories appear in the featured Placement Stories spotlight on the Student Dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="Student Full Name" required>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rhea Chawla"
                required
              />
            </FormField>

            <FormField label="Short / First Name" hint="Shown in story strip">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Auto from full name if blank"
              />
            </FormField>

            <FormField label="Placed Company" required>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Byborg"
                required
              />
            </FormField>

            <FormField label="Role" required>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. International Systems Engineer"
                required
              />
            </FormField>

            <FormField label="Package Badge">
              <Input
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="e.g. ₹50 Lakhs+"
              />
            </FormField>

            <FormField label="Kicker / Highlight Label">
              <Input
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                placeholder="e.g. Luxembourg International Offer"
              />
            </FormField>
          </div>

          <FormField label="Story Headline" required>
            <Input
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder="e.g. From Delhi to Luxembourg One Code at a Time!"
              required
            />
          </FormField>

          <FormField label="Graduate Quote / Reflection" required>
            <Textarea
              rows={3}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Write the graduate's reflection on their breakthrough journey..."
              required
            />
          </FormField>

          <FormField label="Card Color Theme">
            <div className="flex flex-wrap gap-2 pt-0.5">
              {STORY_THEMES.map((theme) => {
                const active = theme.id === themeId
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeId(theme.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary-soft text-primary-text ring-2 ring-primary/20"
                        : "border-border bg-surface text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-xs"
                      style={{ backgroundColor: theme.accent }}
                    />
                    {theme.label}
                  </button>
                )
              })}
            </div>
          </FormField>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Save Story" : "Post Placement Story"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// 3. Recent Placement Carousel Create / Edit Dialog
// -----------------------------------------------------------------------------

interface RecentPlacementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlacement: PlacementItem | null
  onSubmit: (values: Omit<PlacementItem, "id">) => Promise<void>
}

export function RecentPlacementFormDialog({
  open,
  onOpenChange,
  initialPlacement,
  onSubmit,
}: RecentPlacementFormDialogProps) {
  const isEdit = !!initialPlacement

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [color, setColor] = useState(PLACEMENT_COLORS[0])
  const [src, setSrc] = useState("")
  const [offsetY, setOffsetY] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (initialPlacement) {
      setName(initialPlacement.name)
      setCompany(initialPlacement.company)
      setRole(initialPlacement.role ?? "")
      setColor(initialPlacement.color ?? PLACEMENT_COLORS[0])
      setSrc(initialPlacement.src ?? "")
      setOffsetY(initialPlacement.offsetY ?? 0)
    } else {
      setName("")
      setCompany("")
      setRole("")
      setColor(PLACEMENT_COLORS[0])
      setSrc("")
      setOffsetY(0)
    }
  }, [open, initialPlacement])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError("Graduate name must be at least 2 characters.")
    if (!company.trim()) return setError("Company is required.")
    if (!isValidAssetOrUrl(src)) return setError("Photo URL must start with '/' or 'http(s)://'.")

    const clampedOffset = Math.max(-250, Math.min(250, Math.round(Number(offsetY) || 0)))
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        company: company.trim(),
        role: role.trim(),
        color: color.trim() || "#2563EB",
        src: src.trim(),
        offsetY: clampedOffset,
      })
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Recent Placement Card" : "Post Recent Placement"}</DialogTitle>
          <DialogDescription>
            Recent placements cycle inside the student dashboard Recent Placements spotlight card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="Graduate Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karthik Reddy"
                required
              />
            </FormField>

            <FormField label="Company" required>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Razorpay"
                required
              />
            </FormField>
          </div>

          <FormField label="Placed Role">
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
            />
          </FormField>

          <FormField label="Backdrop Color">
            <div className="flex flex-wrap items-center gap-2">
              {PLACEMENT_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Select color ${swatch}`}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    color.toLowerCase() === swatch.toLowerCase()
                      ? "scale-110 border-foreground ring-2 ring-primary/25"
                      : "border-white/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="ml-auto h-8 w-28 font-mono text-xs"
                placeholder="#2563EB"
              />
            </div>
          </FormField>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FormField label="Portrait URL (optional)" hint="Or /assets/...">
                <Input
                  value={src}
                  onChange={(e) => setSrc(e.target.value)}
                  placeholder="/placements/photo.png or https://..."
                />
              </FormField>
            </div>

            <FormField label="Vertical Offset (px)" hint="-250 to 250">
              <Input
                type="number"
                min={-250}
                max={250}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
              />
            </FormField>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Save Placement" : "Add Recent Placement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// 4. Headline Placement Metrics Dialog
// -----------------------------------------------------------------------------

interface AlumniMetricsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metrics: AlumniMetrics
  onSubmit: (patch: Partial<AlumniMetrics>) => Promise<void>
}

export function AlumniMetricsDialog({
  open,
  onOpenChange,
  metrics,
  onSubmit,
}: AlumniMetricsDialogProps) {
  const [studentsPlaced, setStudentsPlaced] = useState(metrics.studentsPlaced)
  const [highestHike, setHighestHike] = useState(metrics.highestHike)
  const [highestPackage, setHighestPackage] = useState(metrics.highestPackage)
  const [hiringPartners, setHiringPartners] = useState(metrics.hiringPartners)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setStudentsPlaced(metrics.studentsPlaced)
    setHighestHike(metrics.highestHike)
    setHighestPackage(metrics.highestPackage)
    setHiringPartners(metrics.hiringPartners)
  }, [open, metrics])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentsPlaced.trim() || !highestHike.trim() || !highestPackage.trim() || !hiringPartners.trim()) {
      return setError("All four headline metrics must have a non-empty value.")
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        studentsPlaced: studentsPlaced.trim(),
        highestHike: highestHike.trim(),
        highestPackage: highestPackage.trim(),
        hiringPartners: hiringPartners.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Placement Banner Metrics</DialogTitle>
          <DialogDescription>
            These four KPI figures are shown at the top of the Student Alumni Directory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormField label="Students Placed" required>
              <div className="relative">
                <Input
                  value={studentsPlaced}
                  onChange={(e) => setStudentsPlaced(e.target.value)}
                  leading={<Users />}
                  placeholder="4,500+"
                  required
                />
              </div>
            </FormField>

            <FormField label="Highest Hike" required>
              <Input
                value={highestHike}
                onChange={(e) => setHighestHike(e.target.value)}
                leading={<TrendingUp />}
                placeholder="500%"
                required
              />
            </FormField>

            <FormField label="Highest Package" required>
              <Input
                value={highestPackage}
                onChange={(e) => setHighestPackage(e.target.value)}
                leading={<Sparkles />}
                placeholder="₹1.5 Cr"
                required
              />
            </FormField>

            <FormField label="Hiring Partners" required>
              <Input
                value={hiringPartners}
                onChange={(e) => setHiringPartners(e.target.value)}
                leading={<Briefcase />}
                placeholder="800+"
                required
              />
            </FormField>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Update Metrics
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// 5. Generic Delete Confirmation Dialog
// -----------------------------------------------------------------------------

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  const handleConfirm = async () => {
    setError(null)
    setDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={deleting} onClick={handleConfirm}>
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AlumniProfileFormDialog

