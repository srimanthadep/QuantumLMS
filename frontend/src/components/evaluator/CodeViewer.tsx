import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { FilePreview } from "@/pages/evaluator/data/types"

/**
 * Read-only viewer for submitted text files: line numbers and light syntax colouring for code, notebooks shown cell
 * by cell, Markdown and plain text wrapped. Text is rendered as text nodes, never as HTML.
 */
export default function CodeViewer({ preview, className }: { preview: FilePreview; className?: string }) {
  const notebook = useMemo(() => (preview.language === "notebook" ? parseNotebook(preview.text) : null), [preview])
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface-2/50", className)}>
      <div className="max-h-[560px] overflow-auto">
        {notebook ? (
          <div className="grid gap-3 p-3">
            {notebook.map((cell, i) =>
              cell.type === "markdown" ? (
                <div key={i} className="whitespace-pre-wrap rounded-md bg-surface px-3 py-2 text-sm leading-6 text-foreground">
                  {cell.source}
                </div>
              ) : (
                <div key={i} className="overflow-hidden rounded-md border border-border bg-surface">
                  <p className="border-b border-border px-3 py-1 font-mono text-[11px] text-subtle-foreground">In [{cell.count ?? " "}]</p>
                  <CodeLines text={cell.source} language="python" />
                  {cell.output && <pre className="whitespace-pre-wrap border-t border-border px-3 py-2 font-mono text-[12px] leading-5 text-muted-foreground">{cell.output}</pre>}
                </div>
              ),
            )}
          </div>
        ) : preview.language === "markdown" || preview.language === "text" ? (
          <pre className="whitespace-pre-wrap p-4 font-sans text-sm leading-6 text-foreground">{preview.text}</pre>
        ) : (
          <CodeLines text={preview.text} language={preview.language} />
        )}
      </div>
      {preview.truncated && <p className="border-t border-border px-3 py-1.5 text-caption text-muted-foreground">Showing the first 200 KB. Open the file to see all of it.</p>}
    </div>
  )
}

function CodeLines({ text, language }: { text: string; language: string }) {
  const lines = useMemo(() => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n"), [text])
  const width = String(lines.length).length
  return (
    <pre className="py-2 font-mono text-[12.5px] leading-[1.6]">
      <code>
        {lines.map((line, i) => (
          <span key={i} className="flex hover:bg-surface-2">
            <span className="sticky left-0 select-none bg-surface-2 pl-3 pr-4 text-right text-subtle-foreground" style={{ minWidth: `${width + 3}ch` }} aria-hidden="true">
              {i + 1}
            </span>
            <span className="whitespace-pre pr-4 text-foreground">{highlight(line, language)}</span>
          </span>
        ))}
      </code>
    </pre>
  )
}

const KEYWORDS: Record<string, string[]> = {
  python: ["def", "class", "return", "import", "from", "as", "for", "in", "if", "elif", "else", "while", "with", "try", "except", "finally", "lambda", "yield", "raise", "pass", "break", "continue", "and", "or", "not", "is", "None", "True", "False", "async", "await", "global"],
  javascript: ["const", "let", "var", "function", "return", "import", "from", "export", "default", "if", "else", "for", "while", "of", "in", "new", "class", "extends", "async", "await", "try", "catch", "finally", "throw", "null", "undefined", "true", "false", "typeof", "interface", "type"],
  sql: ["select", "from", "where", "join", "left", "on", "group", "by", "order", "insert", "into", "values", "update", "set", "delete", "create", "table", "and", "or", "not", "null", "as", "limit"],
}
KEYWORDS.typescript = KEYWORDS.javascript
const COMMENT: Record<string, RegExp> = { python: /#.*/, r: /#.*/, shell: /#.*/, yaml: /#.*/, javascript: /\/\/.*/, typescript: /\/\/.*/, java: /\/\/.*/, c: /\/\/.*/, cpp: /\/\/.*/, go: /\/\/.*/, rust: /\/\/.*/, sql: /--.*/ }

/** Strings, comments, numbers and keywords for the common languages; anything else stays plain. */
function highlight(line: string, language: string): React.ReactNode {
  const words = new Set(KEYWORDS[language] ?? [])
  const comment = COMMENT[language]
  if (!words.size && !comment) return line
  const parts: React.ReactNode[] = []
  const token = new RegExp(`(${comment ? `${comment.source}|` : ""}"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_][A-Za-z0-9_]*\\b)`, "g")
  let last = 0
  for (const m of line.matchAll(token)) {
    const t = m[0]
    const at = m.index ?? 0
    if (at > last) parts.push(line.slice(last, at))
    const lower = language === "sql" ? t.toLowerCase() : t
    const cls =
      comment && new RegExp(`^${comment.source}$`).test(t)
        ? "italic text-subtle-foreground"
        : t.startsWith('"') || t.startsWith("'")
          ? "text-success"
          : /^\d/.test(t)
            ? "text-warning"
            : words.has(lower)
              ? "font-medium text-primary-text"
              : null
    parts.push(cls ? (
      <span key={at} className={cls}>
        {t}
      </span>
    ) : (
      t
    ))
    last = at + t.length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts
}

interface Cell {
  type: "markdown" | "code"
  source: string
  count?: number | null
  output?: string
}

function parseNotebook(text: string): Cell[] | null {
  try {
    const nb = JSON.parse(text) as { cells?: { cell_type: string; source: string[] | string; execution_count?: number | null; outputs?: { text?: string[] | string; data?: Record<string, string[] | string> }[] }[] }
    if (!Array.isArray(nb.cells)) return null
    const join = (v: string[] | string | undefined) => (Array.isArray(v) ? v.join("") : (v ?? ""))
    return nb.cells.map((c) => ({
      type: c.cell_type === "markdown" ? "markdown" : "code",
      source: join(c.source),
      count: c.execution_count,
      output: (c.outputs ?? []).map((o) => join(o.text) || join(o.data?.["text/plain"])).filter(Boolean).join("\n") || undefined,
    }))
  } catch {
    return null
  }
}
