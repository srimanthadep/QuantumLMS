import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { CertificateItem } from "./studentTypes"
import { initialCertificatesList } from "./studentMockData"

interface CertificatesPageProps {
  onToast: (msg: string) => void
}

export function CertificatesPage({ onToast }: CertificatesPageProps) {
  const [certificates] = useState<CertificateItem[]>(initialCertificatesList)
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null)

  const earned = certificates.filter((c) => c.status === "Earned")
  const inProgress = certificates.filter((c) => c.status === "In Progress")

  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Certificates Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">
                Verified Credentials & Certificates
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                {earned.length} Verified Badges
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Accredited certificates issued by Quantum School of AI with
              cryptographic on-chain verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard?.writeText?.("https://verify.quantumschool.ai/student/QS-2024-8821/credentials")
                onToast("Quantum verified credential portfolio link copied for LinkedIn! 🔗")
              }}
              className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>🔗 Sync to LinkedIn</span>
            </button>
          </div>
        </div>
      </section>

      {/* Earned Certificates Section */}
      <section className="panel" aria-label="Earned Credentials">
        <div className="card-header mb-4">
          <h3 className="card-title">
            Earned Diplomas & Specializations ({earned.length})
          </h3>
          <span className="text-xs text-emerald-700 font-bold">
            ✓ 100% Verified Credentials
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {earned.map((cert) => (
            <div
              key={cert.id}
              className="p-5 rounded-2xl border border-purple-100 bg-purple-50/30 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold">
                    <Icon name="award" size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified Credential
                  </span>
                </div>

                <h4 className="font-bold text-base text-zinc-900 mb-1">
                  {cert.title}
                </h4>
                <div className="text-xs font-semibold text-purple-700 mb-2">
                  {cert.grade}
                </div>

                <div className="text-xs text-zinc-500 mb-4 flex flex-col gap-1">
                  <span>
                    Issued:{" "}
                    <strong className="text-zinc-800">{cert.issueDate}</strong>
                  </span>
                  <span>
                    Credential ID:{" "}
                    <strong className="font-mono text-zinc-700">
                      {cert.credentialId}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {cert.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-zinc-700 border border-zinc-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-purple-100">
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="flex-1 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer text-center"
                >
                  View Credential
                </button>
                <button
                  onClick={() => {
                    const certDoc =
                      "===========================================================\n" +
                      "       QUANTUM SCHOOL OF AI - CERTIFICATE OF COMPLETION   \n" +
                      "===========================================================\n" +
                      `Student Name: Srimanth (QS-2024-8821)\n` +
                      `Specialization: ${cert.title}\n` +
                      `Grade Awarded: ${cert.grade}\n` +
                      `Credential ID: ${cert.credentialId}\n` +
                      `Date Issued: ${cert.issueDate}\n` +
                      `Verified Skills: ${cert.skills.join(", ")}\n` +
                      `Blockchain Hash: 0x98A1B2C3D4E5F67890ABCDEF\n` +
                      "Status: Verified & Accredited\n"
                    const blob = new Blob([certDoc], { type: "text/plain;charset=utf-8;" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `Quantum_Certificate_${cert.id}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                    onToast(`Downloaded verified diploma for ${cert.title}! 🎓`)
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-purple-200 bg-white text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* In-Progress Tracks */}
      <section className="panel" aria-label="In Progress Certificates">
        <div className="card-header mb-4">
          <h3 className="card-title">
            Certificates in Progress ({inProgress.length})
          </h3>
          <span className="text-xs text-zinc-500">
            Unlocks upon 100% course and lab completion
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inProgress.map((cert) => (
            <div
              key={cert.id}
              className="p-5 rounded-2xl border border-zinc-100 bg-zinc-50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold">
                    <Icon name="award" size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                    {cert.progress}% Complete
                  </span>
                </div>

                <h4 className="font-bold text-sm text-zinc-900 mb-1">
                  {cert.title}
                </h4>
                <div className="text-xs text-zinc-500 mb-3">{cert.grade}</div>

                <div className="w-full bg-zinc-200 rounded-full h-2 mb-3 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${cert.progress}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-zinc-400">
                Target issue date:{" "}
                <strong className="text-zinc-600">{cert.issueDate}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Certificate Modal */}
      {selectedCert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Official Certificate
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Quantum School of AI · Verified Credential
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCert(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="my-4 p-8 border-2 border-dashed border-purple-200 rounded-3xl bg-purple-50/50 text-center relative overflow-hidden">
              <div className="text-[11px] uppercase tracking-widest font-black text-purple-700 mb-2">
                Certificate of Distinction
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">
                {selectedCert.title}
              </h2>
              <p className="text-xs text-zinc-600 mb-6 max-w-md mx-auto leading-relaxed">
                This document certifies that{" "}
                <strong className="text-zinc-950 font-bold">Srimanth</strong>{" "}
                has successfully completed all coursework, research projects,
                and evaluation benchmarks with distinction.
              </p>

              <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-zinc-500 border-t border-purple-100 pt-4">
                <span>
                  Issued:{" "}
                  <strong className="text-zinc-800">
                    {selectedCert.issueDate}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  ID:{" "}
                  <strong className="font-mono text-zinc-800">
                    {selectedCert.credentialId}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Instructor:{" "}
                  <strong className="text-zinc-800">Prof. Srimanth Adep</strong>
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => {
                  const certDoc =
                    "===========================================================\n" +
                    "       QUANTUM SCHOOL OF AI - CERTIFICATE OF COMPLETION   \n" +
                    "===========================================================\n" +
                    `Student Name: Srimanth (QS-2024-8821)\n` +
                    `Specialization: ${selectedCert.title}\n` +
                    `Grade Awarded: ${selectedCert.grade}\n` +
                    `Credential ID: ${selectedCert.credentialId}\n` +
                    `Date Issued: ${selectedCert.issueDate}\n` +
                    `Verified Skills: ${selectedCert.skills.join(", ")}\n` +
                    `Blockchain Hash: 0x98A1B2C3D4E5F67890ABCDEF\n` +
                    "Status: Verified & Accredited\n"
                  const blob = new Blob([certDoc], { type: "text/plain;charset=utf-8;" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `Quantum_Certificate_${selectedCert.id}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                  setSelectedCert(null)
                  onToast(`Downloaded diploma for ${selectedCert.title}! 🎓`)
                }}
              >
                Download PDF
              </button>
              <button
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer shadow-sm"
                onClick={() => {
                  navigator.clipboard?.writeText?.(`https://verify.quantumschool.ai/cert/${selectedCert.credentialId}`)
                  setSelectedCert(null)
                  onToast("Credential verification link copied to clipboard! 🔗")
                }}
              >
                Share Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
