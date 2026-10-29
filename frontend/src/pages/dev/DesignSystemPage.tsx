import { useState, type ReactNode } from "react"
import { Bell, BookOpen, Command, Inbox, LayoutDashboard, LogOut, Plus, Search, Settings, Sparkles, Trash2, Upload, Users } from "lucide-react"
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  CommandPalette,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  Kbd,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  SkeletonText,
  StatCard,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeAccentPicker,
  ThemeControls,
  Tooltip,
  useToast,
  type DataTableColumn,
} from "@/components/ui"
import { AreaChart, BarChart, DonutChart, ProgressRing, Sparkline } from "@/components/charts"
import { AnimatedNumber, Pressable, Stagger, StaggerItem } from "@/components/motion"
import CourseCover from "@/components/shared/CourseCover"
import { formatINR } from "@/lib/utils"

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-border py-10 first:border-t-0">
      <div className="mb-5">
        <h2 id={`${id}-title`} className="text-h3 font-semibold text-foreground">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const SWATCHES = [
  "background",
  "surface",
  "surface-2",
  "surface-3",
  "border",
  "border-strong",
  "foreground",
  "muted-foreground",
  "subtle-foreground",
  "primary",
  "primary-hover",
  "primary-text",
  "primary-soft",
  "secondary-text",
  "success",
  "warning",
  "danger",
  "info",
]

interface OrderRow {
  id: string
  student: string
  course: string
  amount: number
  status: "Paid" | "Refunded" | "Pending"
  date: string
}
const ORDERS: OrderRow[] = [
  { id: "ORD-24081", student: "Aarav Mehta", course: "Generative AI Engineering", amount: 34999, status: "Paid", date: "2026-10-02" },
  { id: "ORD-24082", student: "Diya Sharma", course: "Agentic Systems Bootcamp", amount: 42999, status: "Pending", date: "2026-10-03" },
  { id: "ORD-24083", student: "Kabir Rao", course: "LLM Engineering in Production", amount: 38999, status: "Paid", date: "2026-10-04" },
  { id: "ORD-24084", student: "Ishita Verma", course: "Prompt Engineering Essentials", amount: 7999, status: "Refunded", date: "2026-10-05" },
]
const ORDER_COLUMNS: DataTableColumn<OrderRow>[] = [
  { id: "id", header: "Order", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id}</span>, sortValue: (r) => r.id },
  { id: "student", header: "Student", cell: (r) => <span className="font-medium">{r.student}</span>, sortValue: (r) => r.student },
  { id: "course", header: "Course", cell: (r) => r.course, hideOnMobile: true },
  { id: "amount", header: "Amount", align: "right", cell: (r) => <span className="tabular-nums">{formatINR(r.amount)}</span>, sortValue: (r) => r.amount },
  {
    id: "status",
    header: "Status",
    cell: (r) => (
      <Badge dot tone={r.status === "Paid" ? "success" : r.status === "Pending" ? "warning" : "neutral"}>
        {r.status}
      </Badge>
    ),
  },
]

/** Kitchen sink of every shared component in its main states. Routed at /design-system in development only. */
export default function DesignSystemPage() {
  const toast = useToast()
  const [tab, setTab] = useState("overview")
  const [segment, setSegment] = useState<"week" | "month" | "year">("week")
  const [switchOn, setSwitchOn] = useState(true)
  const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate")
  const [email, setEmail] = useState("aarav@")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const nav = [
    ["tokens", "Tokens"],
    ["type", "Typography"],
    ["buttons", "Buttons"],
    ["forms", "Forms"],
    ["navigation", "Tabs"],
    ["data", "Data display"],
    ["overlays", "Overlays"],
    ["charts", "Charts"],
    ["motion", "Motion"],
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img src="/assets/logo.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-semibold">Quantum design system</span>
          <Badge tone="primary" className="hidden sm:inline-flex">
            Dev only
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaletteOpen(true)} leftIcon={<Command />}>
              <span className="hidden sm:inline">Command</span>
              <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            </Button>
            <ThemeAccentPicker />
          </div>
        </div>
        <nav aria-label="Sections" className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <PageHeader
          className="mt-8"
          eyebrow="Foundations"
          title="Components & tokens"
          description="Every shared primitive in its main states, in the current theme and accent. Switch theme from the top bar."
          breadcrumb={[{ label: "Dev", href: "/design-system" }, { label: "Design system" }]}
          actions={
            <>
              <Button variant="secondary" leftIcon={<Upload />}>
                Import
              </Button>
              <Button leftIcon={<Plus />}>New course</Button>
            </>
          }
        />

        <Section id="tokens" title="Tokens" description="Semantic colour tokens. Use these, never raw hex.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SWATCHES.map((s) => (
              <div key={s} className="overflow-hidden rounded-md border border-border">
                <div className="h-12" style={{ background: `var(--${s})` }} />
                <div className="bg-surface px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{s}</div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <ThemeControls idPrefix="ds-theme" className="max-w-sm rounded-lg border border-border bg-surface p-4" />
          </div>
        </Section>

        <Section id="type" title="Typography" description="Inter Variable. Tabular numbers for KPIs and timestamps.">
          <div className="space-y-3">
            <p className="text-display font-semibold">Learn AI, live.</p>
            <p className="text-h1 font-semibold">Heading 1 · Agentic Systems</p>
            <p className="text-h2 font-semibold">Heading 2 · Module 3</p>
            <p className="text-h3 font-semibold">Heading 3 · Lesson chapters</p>
            <p className="text-body-lg text-muted-foreground">Body large (marketing). Build production LLM apps with live classes and chaptered replays.</p>
            <p className="text-body">Body (app). Your next live class starts in 2 hours.</p>
            <p className="text-caption text-subtle-foreground">Caption · Updated 3 minutes ago</p>
            <p className="font-mono text-sm tabular-nums text-muted-foreground">01:24:37 · ₹34,999</p>
          </div>
        </Section>

        <Section id="buttons" title="Buttons" description="Press feedback scales to 0.97; primary gains the accent glow on hover.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" leftIcon={<Trash2 />}>
              Delete
            </Button>
            <Button variant="link">Link</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true)
                setTimeout(() => setLoading(false), 1500)
              }}
            >
              {loading ? "Saving" : "Click to load"}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" rightIcon={<Sparkles />}>
              Large
            </Button>
            <Tooltip content="Notifications">
              <Button size="icon" variant="outline" aria-label="Notifications">
                <Bell />
              </Button>
            </Tooltip>
            <div className="rounded-lg bg-ink-900 p-3">
              <Button variant="glass">Glass on dark</Button>
            </div>
          </div>
        </Section>

        <Section id="forms" title="Forms">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Full name" hint="As it should appear on your certificate." required>
                <Input placeholder="Aarav Mehta" />
              </Field>
              <Field label="Email" error={email.includes(".") ? undefined : "Enter a valid email address"}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Search />} />
              </Field>
              <Field label="Question for the instructor">
                <Textarea placeholder="How do I evaluate a RAG pipeline?" />
              </Field>
            </div>
            <div className="space-y-4">
              <Field label="Batch">
                <Select defaultValue="oct">
                  <SelectTrigger aria-label="Batch">
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oct">October cohort · Live + replay</SelectItem>
                    <SelectItem value="nov">November cohort · Live + replay</SelectItem>
                    <SelectItem value="self">Self-paced · Replay only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                <div>
                  <p id="ds-switch-label" className="text-sm font-medium">
                    Email me before live classes
                  </p>
                  <p className="text-caption text-muted-foreground">30 minutes before start</p>
                </div>
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-labelledby="ds-switch-label" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checked} onCheckedChange={setChecked} aria-label="Select all lessons" />
                Select all lessons (click to cycle)
              </label>
              <Input disabled placeholder="Disabled input" />
            </div>
          </div>
        </Section>

        <Section id="navigation" title="Tabs & segmented control" description="The indicator slides with a shared layout animation.">
          <div className="space-y-6">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="text-sm text-muted-foreground">
                Overview content
              </TabsContent>
              <TabsContent value="curriculum" className="text-sm text-muted-foreground">
                Curriculum content
              </TabsContent>
              <TabsContent value="reviews" className="text-sm text-muted-foreground">
                Reviews content
              </TabsContent>
            </Tabs>
            <Tabs defaultValue="chapters" variant="underline">
              <TabsList>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
            </Tabs>
            <SegmentedControl
              aria-label="Range"
              value={segment}
              onChange={setSegment}
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
              ]}
            />
          </div>
        </Section>

        <Section id="data" title="Data display">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard item={{ label: "Revenue (Oct)", value: "₹4,82,000", trend: "↗ +18% vs Sep", tone: "lavender", icon: "trend" }} sparkline={[12, 18, 14, 22, 26, 24, 31]} />
            <StatCard item={{ label: "Active learners", value: "1,284", trend: "↗ +64 this week", tone: "lime", icon: "users" }} onClick={() => toast.show("Opening learners")} />
            <StatCard item={{ label: "Pending reviews", value: "17", trend: "4 overdue", tone: "pink", icon: "document" }} />
            <StatCard item={{ label: "Avg. watch time", value: "42.5 min", trend: "↘ -3% vs last week", tone: "yellow", icon: "clock" }} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Pressable>
              <Card interactive className="group overflow-hidden">
                <CourseCover title="Generative AI Engineering" category="Generative AI" image="/assets/course_genai.jpg">
                  <Badge tone="live" dot className="absolute left-3 top-3">
                    Live
                  </Badge>
                </CourseCover>
                <CardHeader>
                  <CardTitle>Generative AI Engineering</CardTitle>
                  <CardDescription>12 weeks · Live cohort + replays</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={64} label="Course progress" />
                </CardContent>
              </Card>
            </Pressable>
            <Card interactive className="group overflow-hidden">
              <CourseCover title="Agentic Systems Bootcamp" category="Agentic Systems" />
              <CardHeader>
                <CardTitle>Generated cover art</CardTitle>
                <CardDescription>Used when a course has no image.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card with footer</CardTitle>
                <CardDescription>Surface, 1px border, generous padding.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar src="/assets/srimanth.png" name="Srimanth" status="online" size="lg" />
                <Avatar name="Aarav Mehta" size="lg" />
                <Avatar src="/missing.png" name="Diya Sharma" size="md" status="away" />
                <ProgressRing value={72} size={56} label="Completion" />
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button size="sm" className="ml-auto">
                  Save
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="secondary">Secondary</Badge>
            <Badge tone="success" dot>
              Published
            </Badge>
            <Badge tone="warning" dot>
              In review
            </Badge>
            <Badge tone="danger">Failed</Badge>
            <Badge tone="info">Processing</Badge>
            <Badge tone="live" dot>
              Live now
            </Badge>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>

          <div className="mt-6">
            <DataTable
              columns={ORDER_COLUMNS}
              data={ORDERS}
              rowKey={(r) => r.id}
              onRowClick={(r) => toast.show(`Opened ${r.id}`)}
              initialSort={{ id: "amount", dir: "desc" }}
              caption="Recent orders"
              mobileCard={(r) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.student}</p>
                    <p className="truncate text-caption text-muted-foreground">{r.course}</p>
                  </div>
                  <span className="text-sm tabular-nums">{formatINR(r.amount)}</span>
                </div>
              )}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Accordion
              defaultOpen={["m1"]}
              items={[
                { id: "m1", title: "Module 1 · Foundations of LLMs", meta: "4 lessons", content: "Tokens, embeddings, attention and sampling." },
                { id: "m2", title: "Module 2 · Retrieval-augmented generation", meta: "6 lessons", content: "Chunking, vector search, re-ranking and evals." },
                { id: "m3", title: "Module 3 · Agents and tools", meta: "5 lessons", content: "Function calling, planning and memory." },
              ]}
            />
            <div className="space-y-4">
              <EmptyState icon={<Inbox />} title="No submissions yet" description="When students submit assessments they appear here." action={<Button size="sm">Create assessment</Button>} />
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <SkeletonText lines={2} className="flex-1" />
              </div>
            </div>
          </div>
        </Section>

        <Section id="overlays" title="Overlays" description="Dialogs scale in, sheets slide; both trap focus and close on Esc.">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publish recording?</DialogTitle>
                  <DialogDescription>Students in the October cohort get the replay with 9 chapters and a transcript.</DialogDescription>
                </DialogHeader>
                <Field label="Release note">
                  <Input placeholder="Optional" />
                </Field>
                <DialogFooter>
                  <Button variant="ghost">Cancel</Button>
                  <Button onClick={() => toast.success("Recording published to 42 students")}>Publish</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Student 360</SheetTitle>
                  <SheetDescription>Aarav Mehta · Generative AI Engineering</SheetDescription>
                </SheetHeader>
                <SkeletonText lines={6} />
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Aarav Mehta</DropdownMenuLabel>
                <DropdownMenuItem>
                  <LayoutDashboard /> Dashboard <DropdownMenuShortcut>G D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" onClick={() => toast.show("Draft saved")}>
              Toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error("Upload failed. Check your connection.")}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
              Command palette
            </Button>
          </div>
        </Section>

        <Section id="charts" title="Charts" description="Lightweight SVG with transform/opacity reveals.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
                <CardDescription>Last 8 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
                  series={[
                    { name: "Live cohorts", values: [120, 180, 160, 240, 260, 230, 310, 340].map((v) => v * 1000) },
                    { name: "Self-paced", values: [60, 70, 90, 80, 110, 120, 140, 150].map((v) => v * 1000) },
                  ]}
                  formatValue={(v) => formatINR(v)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Watch time by weekday</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={[
                    { label: "Mon", value: 320 },
                    { label: "Tue", value: 410 },
                    { label: "Wed", value: 380 },
                    { label: "Thu", value: 520, highlight: true },
                    { label: "Fri", value: 300 },
                    { label: "Sat", value: 610 },
                    { label: "Sun", value: 480 },
                  ]}
                  formatValue={(v) => `${v} min`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Enrolments by format</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={[
                    { label: "Live + replay", value: 640 },
                    { label: "Replay only", value: 410 },
                    { label: "Bundle", value: 234 },
                  ]}
                  center={
                    <>
                      <AnimatedNumber value={1284} className="text-lg font-semibold" />
                      <span className="text-caption text-muted-foreground">learners</span>
                    </>
                  }
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Small multiples</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-6">
                <ProgressRing value={88} tone="success" size={72} label="Attendance" />
                <ProgressRing value={45} tone="warning" size={72} label="Assignments" />
                <Sparkline data={[4, 6, 5, 9, 8, 12, 11, 14]} className="h-10 w-32" label="Trend" />
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section id="motion" title="Motion" description="Staggered entrances (40ms), animated counters, hover lift. All respect reduced motion.">
          <Stagger inView className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, label: "Lessons watched", value: 128 },
              { icon: Users, label: "Classmates", value: 342 },
              { icon: Sparkles, label: "AI summaries", value: 57 },
              { icon: Bell, label: "Reminders", value: 9 },
            ].map((m) => (
              <StaggerItem key={m.label}>
                <Pressable className="rounded-lg border border-border bg-surface p-4">
                  <m.icon className="mb-3 h-4 w-4 text-primary-text" aria-hidden="true" />
                  <AnimatedNumber value={m.value} className="block text-2xl font-semibold" />
                  <span className="text-caption text-muted-foreground">{m.label}</span>
                </Pressable>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={[
          { id: "dash", label: "Dashboard", group: "Navigate", icon: <LayoutDashboard />, onSelect: () => toast.show("Dashboard") },
          { id: "courses", label: "My courses", group: "Navigate", icon: <BookOpen />, onSelect: () => toast.show("My courses") },
          { id: "settings", label: "Settings", group: "Navigate", icon: <Settings />, onSelect: () => toast.show("Settings") },
          { id: "genai", label: "Generative AI Engineering", group: "Courses", icon: <Sparkles />, keywords: ["llm", "rag"], onSelect: () => toast.show("Course") },
          { id: "agents", label: "Agentic Systems Bootcamp", group: "Courses", icon: <Sparkles />, onSelect: () => toast.show("Course") },
        ]}
      />
    </div>
  )
}
