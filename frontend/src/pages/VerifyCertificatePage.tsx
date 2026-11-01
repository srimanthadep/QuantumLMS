import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Award, BadgeCheck, CircleX, Loader2 } from "lucide-react"
import { Badge, Button, Card } from "@/components/ui"
import { isSupabaseConfigured, supabase, toApiError } from "@/lib/supabase"

interface VerifiedCertificate {
  credential_id: string
  title: string
  course_title: string
  issued_at: string
  grade: string
  skills: string[]
  recipient: string
}

type State = { status: "loading" } | { status: "valid"; cert: VerifiedCertificate } | { status: "invalid" } | { status: "error"; message: string }

/** Public page behind the "Copy verification link" button: confirms that a credential id was issued. */
export default function VerifyCertificatePage() {
  const { credentialId = "" } = useParams()
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured) {
      setState({ status: "error", message: "Verification isn't available right now." })
      return
    }
    setState({ status: "loading" })
    supabase.rpc("verify_certificate", { p_credential_id: credentialId }).then(({ data, error }) => {
      if (cancelled) return
      if (error) setState({ status: "error", message: toApiError(error, "Verification failed. Try again.").message })
      else if (!data) setState({ status: "invalid" })
      else setState({ status: "valid", cert: data as unknown as VerifiedCertificate })
    })
    return () => {
      cancelled = true
    }
  }, [credentialId])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <img src="/assets/logo.png" alt="" className="h-8 w-auto" />
          <span className="text-sm font-semibold">Quantum School of AI · Credential check</span>
        </div>
        <Card className="overflow-hidden">
          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="status">
              <Loader2 className="h-6 w-6 animate-spin text-primary-text" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Checking credential {credentialId}…</p>
            </div>
          )}
          {state.status === "valid" && (
            <>
              <div className="flex items-center gap-3 border-b border-success/30 bg-success-soft px-6 py-4">
                <BadgeCheck className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <h1 className="text-[15px] font-semibold text-foreground">Verified credential</h1>
                  <p className="text-caption text-muted-foreground">Issued by Quantum School of AI</p>
                </div>
              </div>
              <div className="grid gap-4 px-6 py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text ring-1 ring-inset ring-primary-border">
                    <Award className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-6 text-foreground">{state.cert.title}</p>
                    <p className="text-sm text-muted-foreground">{state.cert.course_title}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-caption text-muted-foreground">Awarded to</dt>
                    <dd className="font-medium text-foreground">{state.cert.recipient}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Issued</dt>
                    <dd className="font-medium text-foreground">{new Date(state.cert.issued_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Result</dt>
                    <dd className="font-medium text-foreground">{state.cert.grade}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted-foreground">Credential ID</dt>
                    <dd className="font-mono text-foreground">{state.cert.credential_id}</dd>
                  </div>
                </dl>
                {state.cert.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {state.cert.skills.map((s) => (
                      <Badge key={s} tone="neutral">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {(state.status === "invalid" || state.status === "error") && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <CircleX className="h-7 w-7 text-danger" aria-hidden="true" />
              <h1 className="text-[15px] font-semibold text-foreground">{state.status === "invalid" ? "No credential with this ID" : "Couldn't check this credential"}</h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                {state.status === "invalid" ? `"${credentialId}" doesn't match an issued certificate. Check the link and try again.` : state.message}
              </p>
            </div>
          )}
        </Card>
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Go to Quantum School of AI</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
