import { useId } from "react"
import { Award, Download, ShieldCheck } from "lucide-react"
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui"
import type { CertificateItem } from "@/pages/student/studentTypes"
import { createStandardPdfBlob, triggerFileDownload } from "@/pages/student/materialUtils"
import { verifyUrl } from "@/pages/student/data/grades"
import CopyButton from "./CopyButton"

interface CertificateDialogProps {
  certificate: CertificateItem | null
  recipient: string
  onClose: () => void
  onToast: (msg: string) => void
}

/** Certificate preview with PDF download and a copyable verification link. */
export default function CertificateDialog({ certificate, recipient, onClose, onToast }: CertificateDialogProps) {
  const patternId = `cert-grid-${useId().replace(/:/g, "")}`
  const cert = certificate

  const download = () => {
    if (!cert) return
    const blob = createStandardPdfBlob(`Certificate of Completion - ${cert.title}`, [
      { heading: "Recipient", lines: [recipient] },
      { heading: "Course", lines: [cert.course, cert.grade] },
      { heading: "Skills", lines: [cert.skills.join(", ")] },
      { heading: "Verification", lines: [`Credential ID: ${cert.credentialId}`, `Issued: ${cert.issueDate}`, verifyUrl(cert.credentialId)] },
    ])
    triggerFileDownload(blob, `Quantum_Certificate_${cert.credentialId}.pdf`)
    onToast("Certificate downloaded")
  }

  return (
    <Dialog open={!!cert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {cert && (
          <>
            <DialogHeader>
              <DialogTitle>{cert.title}</DialogTitle>
              <DialogDescription>Verified credential · Quantum School of AI</DialogDescription>
            </DialogHeader>

            {/* Certificate artwork: dark in both themes, framed by the accent gradient. */}
            <div className="rounded-xl p-px shadow-[var(--glow-primary)]" style={{ backgroundImage: "var(--gradient-primary)" }}>
              <div className="relative overflow-hidden rounded-[19px] bg-ink-950 px-6 py-8 text-center sm:px-10">
                <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
                  <defs>
                    <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.6" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#${patternId})`} />
                </svg>
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />

                <div className="relative">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
                    <Award className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Certificate of Completion</p>
                  <p className="mt-4 text-caption text-white/80">This certifies that</p>
                  <p className="mt-1 text-h2 text-white">{recipient}</p>
                  <p className="mt-1 text-caption text-white/80">has successfully completed</p>
                  <p className="mt-1 text-lg font-semibold text-white">{cert.course}</p>
                  <p className="mt-1 text-sm text-white/80">{cert.grade}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    {cert.skills.map((s) => (
                      <span key={s} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col items-center justify-center gap-1 border-t border-white/10 pt-4 text-caption text-white/80 sm:flex-row sm:gap-4">
                    <span>Issued {cert.issueDate}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {cert.credentialId}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <CopyButton text={verifyUrl(cert.credentialId)} label="Copy verification link" variant="secondary" size="md" onCopied={() => onToast("Verification link copied")} />
              <Button leftIcon={<Download aria-hidden="true" />} onClick={download}>
                Download PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
