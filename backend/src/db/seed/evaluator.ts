import { and, eq, inArray, notInArray, sql } from "drizzle-orm"
import type { Tx } from "../client.js"
import * as t from "../schema.js"
import { DEMO_ACCOUNTS } from "../../demo-accounts.js"
import { letterGrade, type Scores } from "../../modules/evaluator/grading.js"
import type { Storage } from "../../storage/storage.js"
import { demoRows } from "./data.js"
import { seedTime, type SeedTime } from "./time.js"

/**
 * Evaluation seed: the official rubrics (shared content), and the demo evaluator's marking history with seeded
 * learners. Learners and the colleague evaluator use .invalid addresses, so nobody can ever sign in as them.
 */
export const LEARNER_DOMAIN = "learners.quantumlms.invalid"
const STAFF_DOMAIN = "staff.quantumlms.invalid"
const LEVEL_NAMES = ["Exemplary", "Proficient", "Developing", "Beginning"] as const

interface CriterionSeed {
  title: string
  description: string
  max: number
  /** Points and description per level, best first (Exemplary, Proficient, Developing, Beginning). */
  levels: [number, string][]
}
interface RubricSeed {
  id: string
  assignment_id: string
  title: string
  version: string
  guidance: string
  criteria: CriterionSeed[]
}

export const RUBRICS: RubricSeed[] = [
  {
    id: "rb-asg-1",
    assignment_id: "asg-1",
    title: "RAG pipeline project rubric",
    version: "v2.0",
    guidance: "Run the pipeline from the README before scoring. Judge retrieval on the evaluation questions in /evals, not on the demo question alone. A missing citation costs points in that criterion; it doesn't fail the project.",
    criteria: [
      { title: "Retrieval quality", description: "Chunking, embedding choice, top-k tuning and reranking, backed by measured recall on the evaluation set.", max: 30, levels: [[30, "Reports recall@k on the evaluation set, justifies the chunk size, and adds a reranker that measurably helps."], [24, "Sensible chunking and embeddings with some tuning; recall is reported but not compared across settings."], [17, "Default settings throughout; retrieval works on easy questions only."], [9, "Retrieval often returns unrelated chunks, or it isn't evaluated."]] },
      { title: "Grounded answers and citations", description: "Answers stay inside the retrieved context and cite the chunks they use.", max: 25, levels: [[25, "Every claim is cited; the model declines when the context has no answer."], [20, "Citations on most answers; occasional unsupported details."], [14, "Citations are present but often point at the wrong chunk."], [7, "No citations, or answers ignore the context."]] },
      { title: "Code quality and reproducibility", description: "Clear modules, pinned dependencies, keys in environment variables, a README that runs end to end.", max: 25, levels: [[25, "Clean modules, pinned dependencies, one command to run, tests for the retrieval step."], [20, "Readable code and a working README; a few manual steps."], [14, "Runs only after fixes; settings are hard-coded."], [7, "Doesn't run from the instructions."]] },
      { title: "Evaluation and write-up", description: "Failure cases, latency and cost, and what they would change next.", max: 20, levels: [[20, "Analyses failure cases with examples, reports latency and cost per query, and proposes next steps."], [16, "Discusses results and some failure cases."], [11, "Describes what was built without evaluating it."], [5, "Missing or one paragraph."]] },
    ],
  },
  {
    id: "rb-asg-2",
    assignment_id: "asg-2",
    title: "MLP from scratch lab rubric",
    version: "v1.3",
    guidance: "Check the gradient check output first: a passing check with a working training loop is the core of this lab. Don't deduct for using NumPy helpers such as np.einsum.",
    criteria: [
      { title: "Forward pass and loss", description: "Vectorised forward pass, numerically stable softmax and cross-entropy.", max: 25, levels: [[25, "Fully vectorised, stable softmax (max subtraction), correct mean cross-entropy."], [20, "Correct but with a loop over the batch or a minor stability gap."], [14, "Works on small inputs; overflows or mis-averages on real batches."], [7, "Incorrect outputs or loss."]] },
      { title: "Backpropagation", description: "Correct gradients for every parameter, verified with a numerical gradient check.", max: 35, levels: [[35, "All gradients correct and verified with a gradient check below 1e-6 relative error."], [28, "Gradients correct; the check is missing or only covers one layer."], [19, "One layer's gradient is wrong or the ReLU mask is misapplied."], [10, "Backward pass doesn't match the forward pass."]] },
      { title: "Training and results", description: "Mini-batch training loop, learning-rate choice, test accuracy with curves.", max: 25, levels: [[25, "Reaches 97%+ test accuracy with loss and accuracy curves and a justified learning rate."], [20, "Reaches 95%+ with curves."], [14, "Trains but accuracy stays under 95% or curves are missing."], [7, "Doesn't train."]] },
      { title: "Code clarity", description: "Readable functions, names and comments where the maths needs them.", max: 15, levels: [[15, "Small, well-named functions with the key equations noted."], [12, "Readable with a few long functions."], [8, "Hard to follow; magic numbers."], [4, "Unstructured script."]] },
    ],
  },
  {
    id: "rb-asg-3",
    assignment_id: "asg-3",
    title: "Healthcare data analysis rubric",
    version: "v1.1",
    guidance: "Re-run the notebook from a clean kernel. Leakage from the outcome column into features is the most common serious error: check the engineered features against the target before scoring them.",
    criteria: [
      { title: "Data cleaning", description: "Missing values, outliers and types handled, each with a stated reason.", max: 25, levels: [[25, "Every cleaning step is justified, with before and after counts."], [20, "Sensible cleaning, mostly explained."], [14, "Cleaning applied without reasons, or a questionable fill such as zeros."], [7, "Missing values or outliers left in place."]] },
      { title: "Feature engineering", description: "Transforms for skewed features, encodings and scaling, with no target leakage.", max: 30, levels: [[30, "Well-chosen transforms and encodings, leakage checked explicitly."], [24, "Good transforms; encodings not compared."], [17, "Basic features only, or a scaling step fitted on the full dataset."], [9, "Features leak the target or break the dataset."]] },
      { title: "Analysis and visualisation", description: "Correlation analysis and labelled plots, with an interpretation of what they show.", max: 25, levels: [[25, "Clear, labelled plots and an interpretation of the strongest relationships."], [20, "Good plots; interpretation is thin."], [14, "Plots without labels or interpretation."], [7, "Little or no analysis."]] },
      { title: "Reproducibility", description: "The notebook runs top to bottom and exports the cleaned dataset.", max: 20, levels: [[20, "Runs cleanly from a fresh kernel with pinned versions and writes the cleaned file."], [16, "Runs after a small fix."], [11, "Cells must be run out of order."], [5, "Doesn't run."]] },
    ],
  },
  {
    id: "rb-asg-4",
    assignment_id: "asg-4",
    title: "Autonomous agent system rubric",
    version: "v2.2",
    guidance: "Use the step log to follow at least two complete runs. Score tool use on behaviour you can see in the logs, not on what the README promises.",
    criteria: [
      { title: "Agent design", description: "Planning loop, tool schemas and stopping conditions.", max: 30, levels: [[30, "Clear plan-act-observe loop, typed tool schemas and a hard step limit."], [24, "Sound loop; schemas or stopping rules are loose."], [17, "Works on the happy path only."], [9, "Loops forever or ignores tool results."]] },
      { title: "Tool use and validation", description: "Validates retrieved links, handles tool errors and retries.", max: 25, levels: [[25, "Validates every link, retries with backoff and recovers from tool errors."], [20, "Validates links; some errors end the run."], [14, "No validation; errors crash the agent."], [7, "Tools are called incorrectly."]] },
      { title: "Summary quality", description: "A structured, sourced executive summary.", max: 25, levels: [[25, "Concise, structured, every claim sourced to a fetched page."], [20, "Good structure with a few unsourced claims."], [14, "Summary rambles or cites search results instead of sources."], [7, "No usable summary."]] },
      { title: "Safety and observability", description: "Guardrails, step logging and cost limits.", max: 20, levels: [[20, "Readable step log, cost limit as a setting and guardrails on tool inputs."], [16, "Logging and a fixed cost limit."], [11, "Minimal logging."], [5, "No logging or limits."]] },
    ],
  },
  {
    id: "rb-asg-5",
    assignment_id: "asg-5",
    title: "Similarity metrics paper rubric",
    version: "v1.0",
    guidance: "Check the main proof line by line before scoring rigour. Experiments on real embeddings (for example GloVe or OpenAI embeddings) count towards evidence even when they're in an appendix.",
    criteria: [
      { title: "Mathematical rigour", description: "Correct, complete derivations with stated assumptions.", max: 35, levels: [[35, "Complete proofs with assumptions stated and the general case covered."], [28, "Correct derivations with small gaps."], [19, "Key steps asserted rather than shown."], [10, "Derivations are wrong or missing."]] },
      { title: "Experimental evidence", description: "Experiments that test the claims, on synthetic and real embeddings.", max: 25, levels: [[25, "Synthetic and real-embedding experiments that match the theory, with error bars."], [20, "Good experiments on one kind of data."], [14, "Experiments don't test the main claim."], [7, "No experiments."]] },
      { title: "Insight and discussion", description: "What the results mean for choosing a metric in practice.", max: 25, levels: [[25, "Clear, practical guidance tied to the results."], [20, "Sensible discussion; guidance is generic."], [14, "Restates results without interpreting them."], [7, "No discussion."]] },
      { title: "Presentation", description: "LaTeX typesetting, figures and references.", max: 15, levels: [[15, "Clean typesetting, labelled figures, complete references."], [12, "Minor formatting issues."], [8, "Hard to read; figures unlabelled."], [4, "Not typeset or no references."]] },
    ],
  },
]
const criterionId = (rubricId: string, i: number) => `${rubricId}-c${i + 1}`

const excluded = (cols: string[]) => Object.fromEntries(cols.map((c) => [c, sql.raw(`excluded."${c}"`)]))

/** Upserts the rubrics and their criteria (part of the shared content), in three statements. */
export async function seedRubrics(tx: Tx) {
  await tx
    .insert(t.rubrics)
    .values(RUBRICS.map((r) => ({ id: r.id, assignment_id: r.assignment_id, title: r.title, version: r.version, guidance: r.guidance })))
    .onConflictDoUpdate({ target: t.rubrics.id, set: excluded(["assignment_id", "title", "version", "guidance"]) })
  const criteria = RUBRICS.flatMap((r) =>
    r.criteria.map((c, i) => ({
      id: criterionId(r.id, i),
      rubric_id: r.id,
      position: i + 1,
      title: c.title,
      description: c.description,
      max_points: c.max,
      levels: c.levels.map(([points, description], li) => ({ label: LEVEL_NAMES[li], points, description })),
    })),
  )
  await tx.delete(t.rubric_criteria).where(and(inArray(t.rubric_criteria.rubric_id, RUBRICS.map((r) => r.id)), notInArray(t.rubric_criteria.id, criteria.map((c) => c.id))))
  await tx.insert(t.rubric_criteria).values(criteria).onConflictDoUpdate({ target: t.rubric_criteria.id, set: excluded(["rubric_id", "position", "title", "description", "max_points", "levels"]) })
}

/** Criterion scores in rubric order -> the scores object, with optional comments. */
function scoresFor(assignmentId: string, points: (number | null)[], comments: string[] = []): { scores: Scores; total: number } {
  const r = RUBRICS.find((x) => x.assignment_id === assignmentId)!
  const scores: Scores = {}
  let total = 0
  r.criteria.forEach((_, i) => {
    const p = points[i] ?? null
    const comment = comments[i] ?? ""
    if (p === null && !comment) return
    scores[criterionId(r.id, i)] = { points: p, comment }
    total += p ?? 0
  })
  return { scores, total }
}

/* ------------------------------------------------------------------------------------------------------------------ */

const LEARNERS = [
  { key: "priya.sharma", name: "Priya Sharma", avatar: "/assets/student-4.png", roll: "QAI-2026-011" },
  { key: "rohit.verma", name: "Rohit Verma", avatar: "/assets/student-3.png", roll: "QAI-2026-014" },
  { key: "sneha.patel", name: "Sneha Patel", avatar: "/assets/student-1.png", roll: "QAI-2026-017" },
  { key: "kabir.malhotra", name: "Kabir Malhotra", avatar: "/assets/student-5.png", roll: "QAI-2026-021" },
  { key: "ananya.iyer", name: "Ananya Iyer", avatar: "/assets/student-6.png", roll: "QAI-2026-023" },
  { key: "vikram.singh", name: "Vikram Singh", avatar: "/assets/student-7.png", roll: "QAI-2026-028" },
  { key: "meghna.das", name: "Meghna Das", avatar: "/assets/student-8.png", roll: "QAI-2026-031" },
  { key: "ishaan.gupta", name: "Ishaan Gupta", avatar: null, roll: "QAI-2026-036" },
] as const
type LearnerKey = (typeof LEARNERS)[number]["key"]

const COLLEAGUE = {
  email: `arjun.rao@${STAFF_DOMAIN}`,
  name: "Dr. Arjun Rao",
  avatar: "/assets/teacher.png",
  title: "Senior Evaluator",
  department: "School of Computing & Machine Intelligence",
  specializations: ["Data engineering", "Machine learning"],
}
const DEMO_PROFILE = {
  name: "Eval",
  avatar: "/assets/teacher-female.png",
  title: "Assessment Lead",
  department: "School of Computing & Machine Intelligence",
  specializations: ["Retrieval-augmented generation", "Agent systems", "Applied machine learning"],
}

const FILES = {
  "rag_pipeline.py": `"""End-to-end RAG pipeline: ingest, retrieve, rerank, answer with citations."""
from dataclasses import dataclass
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import CrossEncoder

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
TOP_K = 12
RERANK_K = 4


@dataclass
class Answer:
    text: str
    sources: list[str]


def build_index(docs_dir: Path, persist_dir: Path) -> Chroma:
    docs = DirectoryLoader(str(docs_dir), glob="**/*.md").load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    chunks = splitter.split_documents(docs)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    return Chroma.from_documents(chunks, embeddings, persist_directory=str(persist_dir))


reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def retrieve(index: Chroma, question: str):
    candidates = index.similarity_search(question, k=TOP_K)
    scores = reranker.predict([(question, c.page_content) for c in candidates])
    ranked = sorted(zip(candidates, scores), key=lambda pair: pair[1], reverse=True)
    return [doc for doc, _ in ranked[:RERANK_K]]


PROMPT = """Answer using only the context. Cite sources as [n].
If the context doesn't contain the answer, say you don't know.

Context:
{context}

Question: {question}"""


def answer(index: Chroma, question: str) -> Answer:
    docs = retrieve(index, question)
    context = "\\n\\n".join(f"[{i + 1}] {d.page_content}" for i, d in enumerate(docs))
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    reply = llm.invoke(PROMPT.format(context=context, question=question))
    return Answer(text=reply.content, sources=[d.metadata.get("source", "?") for d in docs])


if __name__ == "__main__":
    idx = build_index(Path("docs"), Path(".chroma"))
    result = answer(idx, "How does the refund policy handle partial months?")
    print(result.text)
    for n, src in enumerate(result.sources, 1):
        print(f"[{n}] {src}")
`,
  "mlp_numpy.py": `"""Two-layer MLP for MNIST in NumPy: forward pass, cross-entropy and backpropagation."""
import numpy as np

rng = np.random.default_rng(42)


def init(n_in=784, n_hidden=128, n_out=10):
    return {
        "W1": rng.normal(0, np.sqrt(2 / n_in), (n_in, n_hidden)),
        "b1": np.zeros(n_hidden),
        "W2": rng.normal(0, np.sqrt(2 / n_hidden), (n_hidden, n_out)),
        "b2": np.zeros(n_out),
    }


def softmax(z):
    z = z - z.max(axis=1, keepdims=True)  # numerical stability
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def forward(p, x):
    h = np.maximum(0, x @ p["W1"] + p["b1"])
    return h, softmax(h @ p["W2"] + p["b2"])


def loss(probs, y):
    return -np.log(probs[np.arange(len(y)), y] + 1e-12).mean()


def backward(p, x, h, probs, y):
    n = len(y)
    d_logits = probs.copy()
    d_logits[np.arange(n), y] -= 1
    d_logits /= n
    grads = {"W2": h.T @ d_logits, "b2": d_logits.sum(axis=0)}
    d_h = d_logits @ p["W2"].T
    d_h[h <= 0] = 0
    grads["W1"] = x.T @ d_h
    grads["b1"] = d_h.sum(axis=0)
    return grads


def train(x, y, epochs=10, lr=0.1, batch=128):
    p = init()
    for epoch in range(epochs):
        order = rng.permutation(len(x))
        for i in range(0, len(x), batch):
            idx = order[i : i + batch]
            h, probs = forward(p, x[idx])
            for k, g in backward(p, x[idx], h, probs, y[idx]).items():
                p[k] -= lr * g
        _, probs = forward(p, x)
        print(f"epoch {epoch + 1}: loss {loss(probs, y):.4f}, accuracy {(probs.argmax(1) == y).mean():.3f}")
    return p
`,
  "feature_engineering.py": `"""Cleaning and feature engineering for the hospital admissions dataset."""
import numpy as np
import pandas as pd

RAW = "data/admissions.csv"
OUT = "data/admissions_clean.csv"

df = pd.read_csv(RAW, parse_dates=["admitted_at", "discharged_at"])

# Lab values are missing for walk-in patients; impute per ward so ICU values don't skew general wards.
labs = ["glucose", "creatinine", "crp"]
df[labs] = df.groupby("ward")[labs].transform(lambda s: s.fillna(s.median()))

# Ages above 110 are data-entry errors in this export.
df = df[df["age"].between(0, 110)]

# Right-skewed lab values: log1p before scaling.
for col in labs:
    df[f"log_{col}"] = np.log1p(df[col])

df["length_of_stay_days"] = (df["discharged_at"] - df["admitted_at"]).dt.days
df["weekend_admission"] = df["admitted_at"].dt.dayofweek >= 5
df = pd.get_dummies(df, columns=["ward", "insurance"], drop_first=True)

corr = df.select_dtypes("number").corr(method="pearson")
print(corr["length_of_stay_days"].sort_values(ascending=False).head(10))

df.to_csv(OUT, index=False)
print(f"wrote {len(df):,} rows to {OUT}")
`,
  "similarity_notes.md": `# Cosine vs dot product in high dimensions

## Setup
- 10,000 random unit vectors for each dimension d in {2, 8, 32, 128, 512, 1024}
- Distances: Euclidean (p = 2), Manhattan (p = 1) and cosine distance

## Result 1: distances concentrate
For i.i.d. coordinates, the relative contrast (max - min) / min of pairwise distances shrinks like 1/sqrt(d) for
every p-norm. Section 3 proves this for general p with a Hoeffding bound on the sum of |x_i - y_i|^p.

| d    | Euclidean | Manhattan | Cosine |
|------|-----------|-----------|--------|
| 8    | 1.92      | 2.31      | 1.74   |
| 128  | 0.41      | 0.52      | 0.39   |
| 1024 | 0.14      | 0.18      | 0.13   |

## Result 2: dot product vs cosine
Without normalisation the dot product ranks long vectors first. On GloVe 300-d (appendix B) the top-10 neighbours
under the dot product share only 3.2 of 10 items with cosine on average.

## Takeaway
Normalise embeddings and use cosine (or the dot product on unit vectors). Prefer p = 1 when outlier coordinates matter.
`,
} as const
type FileName = keyof typeof FILES

type By = "me" | "colleague"
interface PlanItem {
  learner: LearnerKey
  assignment: string
  submitted: Date
  repo?: string
  comments?: string
  file?: FileName
  /** pending: nobody has started; draft/evaluated/released by the demo evaluator ("me") or the colleague. */
  state: "pending" | "draft" | "evaluated" | "released"
  by?: By
  points?: (number | null)[]
  criterionComments?: string[]
  feedback?: string
  updated?: Date
  evaluated?: Date
  released?: Date
  request?: { status: "Pending" | "Revised" | "Upheld"; reason: string; created: Date; resolution?: string; revised?: number[]; resolved?: Date }
}

function plan(T: SeedTime): PlanItem[] {
  const { at, ago, past } = T
  return [
    // Project 1 (due tomorrow): early submissions.
    { learner: "priya.sharma", assignment: "asg-1", submitted: ago({ hours: 20 }), repo: "https://github.com/priyasharma/rag-pipeline-langchain", comments: "Retrieval uses a cross-encoder reranker; the evaluation notebook is in /evals.", file: "rag_pipeline.py", state: "pending" },
    { learner: "rohit.verma", assignment: "asg-1", submitted: ago({ hours: 6 }), repo: "https://github.com/rohitverma/rag-with-citations", state: "pending" },
    { learner: "ananya.iyer", assignment: "asg-1", submitted: ago({ hours: 2 }), repo: "https://github.com/ananyaiyer/pgvector-rag", comments: "I used pgvector instead of ChromaDB because our lab cluster already runs Postgres. The README shows how to switch back.", state: "pending" },
    // Lab 3 (due in five days).
    { learner: "kabir.malhotra", assignment: "asg-2", submitted: ago({ days: 1, hours: 3 }), file: "mlp_numpy.py", comments: "Gradient check passes at 3e-8 relative error; output is in gradcheck.txt in the repo.", repo: "https://github.com/kabirmalhotra/numpy-mlp", state: "pending" },
    { learner: "sneha.patel", assignment: "asg-2", submitted: ago({ hours: 3 }), repo: "https://github.com/snehapatel/mlp-from-scratch", state: "pending" },
    // Healthcare data analysis (due six days ago): the busiest queue.
    {
      learner: "priya.sharma", assignment: "asg-3", submitted: past(at(-7, "18:40")), repo: "https://github.com/priyasharma/healthcare-feature-engineering", state: "evaluated", by: "me",
      points: [22, 26, 21, 17], criterionComments: ["Median imputation per ward is a thoughtful touch.", "", "Plots are clear; add units to the axes.", ""],
      feedback: "Careful cleaning with every imputation justified, and the log transform on the skewed lab values is well chosen. The correlation section lists coefficients but stops short of interpreting them: say what the strongest relationships mean for length of stay.",
      evaluated: ago({ days: 1, hours: 2 }),
    },
    { learner: "rohit.verma", assignment: "asg-3", submitted: past(at(-6, "23:41")), repo: "https://github.com/rohitverma/admissions-analysis", state: "draft", by: "me", points: [20, 24, null, null], criterionComments: ["Outliers are dropped without a stated rule.", "", "", ""], updated: ago({ hours: 3 }) },
    { learner: "sneha.patel", assignment: "asg-3", submitted: past(at(-5, "10:15")), repo: "https://github.com/snehapatel/healthcare-features", comments: "Submitted a day late after a clinic visit; my leave request is TKT-71233.", state: "pending" },
    { learner: "kabir.malhotra", assignment: "asg-3", submitted: past(at(-6, "22:05")), repo: "https://github.com/kabirmalhotra/healthcare-eda", state: "draft", by: "colleague", points: [21, null, null, null], updated: ago({ hours: 5 }) },
    {
      learner: "ananya.iyer", assignment: "asg-3", submitted: past(at(-8, "20:00")), repo: "https://github.com/ananyaiyer/admissions-features", state: "released", by: "me", points: [24, 27, 22, 18],
      feedback: "Excellent work. Cleaning decisions are explained, the features avoid leakage, and the notebook runs top to bottom. For the next project, compare at least two encodings for the categorical fields.",
      evaluated: past(at(-4, "11:20")), released: past(at(-4, "16:00")),
    },
    {
      learner: "vikram.singh", assignment: "asg-3", submitted: past(at(-7, "12:30")), repo: "https://github.com/vikramsingh/healthcare-cleaning", state: "released", by: "colleague", points: [18, 20, 17, 15],
      feedback: "The pipeline works, but missing values are filled with zeros, which pulls the lab averages down. Re-run the analysis with an imputation you can justify and compare the correlations.",
      evaluated: past(at(-3, "13:10")), released: past(at(-3, "15:00")),
    },
    { learner: "meghna.das", assignment: "asg-3", submitted: past(at(-6, "21:00")), file: "feature_engineering.py", state: "pending" },
    // Agent system (due eleven days ago): mostly released, two waiting to go out, one open request.
    {
      learner: "priya.sharma", assignment: "asg-4", submitted: past(at(-12, "19:00")), repo: "https://github.com/priyasharma/research-agent", state: "released", by: "me", points: [27, 22, 22, 17],
      feedback: "A well-structured agent with clear tool schemas and a sensible stopping rule. Link validation catches dead URLs but not redirects to unrelated pages: check the final URL's domain against the claim.",
      evaluated: past(at(-9, "11:40")), released: past(at(-9, "12:00")),
    },
    {
      learner: "rohit.verma", assignment: "asg-4", submitted: past(at(-11, "22:30")), repo: "https://github.com/rohitverma/web-search-agent", state: "released", by: "me", points: [22, 18, 18, 14],
      criterionComments: ["", "Tool errors end the run; no retries seen in the logs.", "Two claims cite pages that weren't fetched.", ""],
      feedback: "The agent completes the task, but tool errors end the run instead of retrying, and the summary cites sources that weren't retrieved. Add retries with backoff and cite only fetched pages.",
      evaluated: past(at(-9, "12:20")), released: past(at(-9, "12:30")),
      request: { status: "Pending", created: ago({ hours: 20 }), reason: "My agent does retry failed tool calls: tools/retry.py wraps every call with exponential backoff (up to three attempts). I think the tool-use score missed it because the wrapper is applied in agent.py line 48, not in the tool definitions." },
    },
    {
      learner: "kabir.malhotra", assignment: "asg-4", submitted: past(at(-11, "20:15")), repo: "https://github.com/kabirmalhotra/agent-summariser", state: "evaluated", by: "me", points: [25, 21, 20, 16],
      feedback: "Solid planning loop and good use of structured output for the summary. The cost limit is hard-coded: make it a setting and log the spend per run.",
      evaluated: ago({ days: 2, hours: 1 }),
    },
    {
      learner: "meghna.das", assignment: "asg-4", submitted: past(at(-12, "09:40")), repo: "https://github.com/meghnadas/sourced-research-agent", state: "evaluated", by: "me", points: [28, 23, 23, 18],
      criterionComments: ["Plan, act and observe are cleanly separated with a 12-step cap.", "", "", ""],
      feedback: "Outstanding. The agent validates links, recovers from tool errors and keeps a readable step log. The executive summary is concise and every claim is sourced.",
      evaluated: ago({ days: 2, hours: 3 }),
    },
    {
      learner: "vikram.singh", assignment: "asg-4", submitted: past(at(-11, "23:50")), repo: "https://github.com/vikramsingh/agent-tools", state: "released", by: "colleague", points: [19, 16, 17, 13],
      feedback: "The agent answers the brief, but it stops at the first tool error and the summary leans on search result pages. Validate links and cite the articles themselves.",
      evaluated: past(at(-8, "13:30")), released: past(at(-8, "14:00")),
      request: {
        status: "Upheld", created: past(at(-6, "10:00")), resolved: past(at(-5, "12:00")),
        reason: "I believe the summary-quality score is too low. The summary covers all five questions in the brief, and every section has a source.",
        resolution: "I re-read the summary against the brief. It answers all five questions, but three of its sources are search result pages rather than the articles, which the rubric counts as unsourced. The score stands.",
      },
    },
    // Similarity paper (due sixteen days ago): released, one revised on request, one request waiting.
    {
      learner: "sneha.patel", assignment: "asg-5", submitted: past(at(-17, "20:00")), repo: "https://github.com/snehapatel/similarity-metrics-paper", file: "similarity_notes.md", state: "released", by: "me", points: [29, 20, 21, 14],
      feedback: "A clear paper with careful experiments. The concentration argument is convincing for the Euclidean case; state its assumptions up front.",
      evaluated: past(at(-14, "10:40")), released: past(at(-14, "11:00")),
      request: {
        status: "Revised", created: past(at(-12, "09:30")), resolved: past(at(-11, "16:00")), revised: [32, 21, 21, 14],
        reason: "Section 3 proves the concentration-of-distances result for any p-norm, not only p = 2. I think the rigour score missed that the proof is general.",
        resolution: "You're right: the proof in section 3 holds for every p-norm, which I had read as the Euclidean case only. I've raised mathematical rigour from 29 to 32, and experimental evidence by one point for the extra p = 1 run.",
      },
    },
    {
      learner: "ananya.iyer", assignment: "asg-5", submitted: past(at(-16, "21:30")), repo: "https://github.com/ananyaiyer/cosine-vs-dot", state: "released", by: "me", points: [27, 20, 20, 12],
      feedback: "Sound derivations and a useful practical section. The experiments rely on synthetic vectors; testing on real embeddings would make the evidence much stronger.",
      evaluated: past(at(-13, "09:40")), released: past(at(-13, "10:00")),
      request: { status: "Pending", created: ago({ hours: 5 }), reason: "The feedback says the experiments only use synthetic data, but appendix B repeats them on the GloVe 300-d embeddings. Could the experimental evidence criterion be checked again?" },
    },
    {
      learner: "ishaan.gupta", assignment: "asg-5", submitted: past(at(-16, "23:10")), repo: "https://github.com/ishaangupta/similarity-report", state: "released", by: "colleague", points: [21, 15, 15, 10],
      feedback: "The main derivation skips the step from the variance bound to the contrast ratio, and the figures have no axis labels. The discussion section is the strongest part.",
      evaluated: past(at(-13, "16:40")), released: past(at(-13, "17:00")),
    },
  ]
}

/* ------------------------------------------------------------------------------------------------------------------ */

async function upsertUser(tx: Tx, u: { email: string; full_name: string; avatar_url: string | null; role: t.Role }) {
  const [found] = await tx.select({ id: t.users.id }).from(t.users).where(sql`lower(${t.users.email}) = ${u.email.toLowerCase()}`).limit(1)
  if (found) {
    await tx.update(t.users).set({ full_name: u.full_name, avatar_url: u.avatar_url, role: u.role, updated_at: new Date() }).where(eq(t.users.id, found.id))
    return found.id
  }
  const [row] = await tx.insert(t.users).values({ email: u.email, full_name: u.full_name, avatar_url: u.avatar_url, role: u.role }).returning({ id: t.users.id })
  return row.id
}

async function upsertEvaluatorProfile(tx: Tx, id: string, p: { title: string; department: string; specializations: string[] }) {
  const values = { title: p.title, department: p.department, specializations: p.specializations, preferences: {}, updated_at: new Date() }
  await tx.insert(t.evaluator_profiles).values({ id, ...values }).onConflictDoUpdate({ target: t.evaluator_profiles.id, set: values })
}

/** Released rubric evaluations for the demo student's graded work (scores add up to the seeded grades). */
const STUDENT_EVALUATIONS: Record<string, { points: number[]; comments: string[] }> = {
  "asg-4": { points: [29, 24, 24, 19], comments: ["Clear planner and executor split with a hard step limit.", "Retries with backoff and validates every link before use.", "", "The step log is easy to follow; add the cost per run."] },
  "asg-5": { points: [35, 24, 24, 15], comments: ["Complete proofs for all three metrics, assumptions stated.", "", "", ""] },
}

/** Adds the rubric breakdown behind the demo student's seeded grades. */
export async function seedStudentEvaluations(tx: Tx, studentId: string) {
  const email = DEMO_ACCOUNTS.find((a) => a.role === "Evaluator")?.email ?? ""
  const [evaluator] = await tx.select({ id: t.users.id }).from(t.users).where(sql`lower(${t.users.email}) = ${email.toLowerCase()}`).limit(1)
  const graded = await tx
    .select()
    .from(t.assignment_submissions)
    .where(and(eq(t.assignment_submissions.student_id, studentId), inArray(t.assignment_submissions.assignment_id, Object.keys(STUDENT_EVALUATIONS)), eq(t.assignment_submissions.status, "Graded")))
  for (const s of graded) {
    const plan = STUDENT_EVALUATIONS[s.assignment_id]
    const { scores, total } = scoresFor(s.assignment_id, plan.points, plan.comments)
    const at = s.graded_at ?? s.submitted_at
    await tx
      .insert(t.evaluations)
      .values({ submission_id: s.id, evaluator_id: evaluator?.id ?? null, status: "released", scores, total, feedback: s.feedback ?? "", started_at: at, updated_at: at, evaluated_at: at, released_at: at })
      .onConflictDoNothing({ target: t.evaluations.submission_id })
  }
}

export interface EvaluatorSeedOptions {
  evaluatorId: string
  anchor: Date
  tz: string
  /** Where the seeded learners' files go. Without it their submissions have no attachments. */
  storage?: Storage
  demoStudentEmail: string
}

/**
 * Restores the demo evaluator's marking world with dates relative to the anchor: the evaluator and a colleague, eight
 * learners and their submissions in every state, and re-evaluation requests. Unreleased work the demo evaluator left
 * on real students' submissions goes back to the queue. The demo student's graded work is restored too.
 */
export async function seedEvaluatorDemo(tx: Tx, o: EvaluatorSeedOptions) {
  const T = seedTime(o.anchor, o.tz)
  await seedRubrics(tx)
  const marked = (await tx.select({ id: t.rubrics.assignment_id }).from(t.rubrics)).map((r) => r.id)

  await tx.update(t.users).set({ full_name: DEMO_PROFILE.name, avatar_url: DEMO_PROFILE.avatar, is_demo: true, updated_at: new Date() }).where(eq(t.users.id, o.evaluatorId))
  await upsertEvaluatorProfile(tx, o.evaluatorId, DEMO_PROFILE)
  const colleagueId = await upsertUser(tx, { email: COLLEAGUE.email, full_name: COLLEAGUE.name, avatar_url: COLLEAGUE.avatar, role: "Evaluator" })
  await upsertEvaluatorProfile(tx, colleagueId, COLLEAGUE)
  for (const evaluator of [o.evaluatorId, colleagueId]) {
    if (marked.length) await tx.insert(t.evaluator_assignments).values(marked.map((a) => ({ evaluator_id: evaluator, assignment_id: a }))).onConflictDoNothing()
  }

  // Unreleased work the demo account left elsewhere goes back to the queue, and requests it took go back to waiting.
  const open = await tx
    .select({ id: t.evaluations.id, submission_id: t.evaluations.submission_id })
    .from(t.evaluations)
    .where(and(eq(t.evaluations.evaluator_id, o.evaluatorId), inArray(t.evaluations.status, ["draft", "evaluated"])))
  if (open.length) {
    await tx.delete(t.evaluations).where(inArray(t.evaluations.id, open.map((e) => e.id)))
    await tx
      .update(t.assignment_submissions)
      .set({ status: "Submitted" })
      .where(and(inArray(t.assignment_submissions.id, open.map((e) => e.submission_id)), eq(t.assignment_submissions.status, "Under Review")))
  }
  await tx
    .update(t.reevaluation_requests)
    .set({ status: "Pending", handled_by: null, updated_at: new Date() })
    .where(and(eq(t.reevaluation_requests.handled_by, o.evaluatorId), eq(t.reevaluation_requests.status, "In Review")))

  // Learners: accounts without sign-in, enrolled in the four core courses. Batched: the reset runs in a request.
  const emails = LEARNERS.map((l) => `${l.key}@${LEARNER_DOMAIN}`)
  const existing = await tx.select({ id: t.users.id, email: t.users.email }).from(t.users).where(inArray(sql`lower(${t.users.email})`, emails))
  const known = new Map(existing.map((u) => [u.email.toLowerCase(), u.id]))
  const ids = Object.fromEntries(LEARNERS.map((l, i) => [l.key, known.get(emails[i]) ?? crypto.randomUUID()])) as Record<LearnerKey, string>
  const fresh = LEARNERS.filter((_, i) => !known.has(emails[i]))
  if (fresh.length) {
    await tx.insert(t.users).values(fresh.map((l) => ({ id: ids[l.key], email: `${l.key}@${LEARNER_DOMAIN}`, full_name: l.name, avatar_url: l.avatar, role: "Student" })))
  }
  for (const l of LEARNERS.filter((x) => !fresh.includes(x))) {
    await tx.update(t.users).set({ full_name: l.name, avatar_url: l.avatar, role: "Student" }).where(eq(t.users.id, ids[l.key]))
  }
  await tx
    .insert(t.profiles)
    .values(LEARNERS.map((l) => ({ id: ids[l.key], roll_number: l.roll, headline: "Learner · AI Engineering" })))
    .onConflictDoUpdate({ target: t.profiles.id, set: { roll_number: sql.raw(`excluded.roll_number`), headline: sql.raw(`excluded.headline`), updated_at: new Date() } })
  await tx
    .insert(t.enrollments)
    .values(LEARNERS.flatMap((l) => ["c-1", "c-2", "c-3", "c-4"].map((c) => ({ student_id: ids[l.key], course_id: c, enrolled_at: T.ago({ days: 60 }) }))))
    .onConflictDoNothing()
  const learnerIds = Object.values(ids)
  await tx.delete(t.assignment_submissions).where(inArray(t.assignment_submissions.student_id, learnerIds))
  await tx.delete(t.notifications).where(inArray(t.notifications.student_id, learnerIds))
  if (o.storage) {
    for (const id of learnerIds) {
      const keys = await o.storage.list(`submissions/${id}/`).catch(() => [])
      if (keys.length) await o.storage.remove(keys).catch(() => undefined)
    }
  }

  const evaluatorFor = (by: By | undefined) => (by === "colleague" ? colleagueId : o.evaluatorId)
  const submissions: (typeof t.assignment_submissions.$inferInsert)[] = []
  const evaluationRows: (typeof t.evaluations.$inferInsert)[] = []
  const requestRows: (typeof t.reevaluation_requests.$inferInsert)[] = []
  for (const p of plan(T)) {
    const studentId = ids[p.learner]
    const submissionId = crypto.randomUUID()
    let filePath: string | null = null
    if (p.file && o.storage) {
      filePath = `submissions/${studentId}/${p.assignment}/seed-${p.file}`
      const ok = await o.storage.put(filePath, Buffer.from(FILES[p.file]), p.file.endsWith(".md") ? "text/markdown" : "text/x-python").then(() => true, () => false)
      if (!ok) filePath = null
    }
    const finalPoints = p.request?.revised ?? p.points ?? []
    const { scores, total } = scoresFor(p.assignment, finalPoints, p.criterionComments)
    const released = p.state === "released"
    submissions.push({
      id: submissionId,
      student_id: studentId,
      assignment_id: p.assignment,
      status: released ? "Graded" : p.state === "pending" ? "Submitted" : "Under Review",
      repo_url: p.repo ?? null,
      comments: p.comments ?? null,
      file_path: filePath,
      file_name: filePath ? p.file! : null,
      file_size: filePath ? `${(Buffer.byteLength(FILES[p.file!]) / 1024).toFixed(1)} KB` : null,
      submitted_at: p.submitted,
      score: released ? total : null,
      grade: released ? letterGrade(total) : null,
      feedback: released ? (p.feedback ?? null) : null,
      graded_at: released ? (p.request?.resolved ?? p.released ?? null) : null,
    })
    if (p.state === "pending") continue
    evaluationRows.push({
      submission_id: submissionId,
      evaluator_id: evaluatorFor(p.by),
      status: p.state,
      scores,
      total,
      feedback: p.feedback ?? "",
      private_note: "",
      started_at: new Date(Math.max(p.submitted.getTime(), (p.evaluated ?? p.updated ?? T.anchor).getTime() - 40 * 60_000)),
      updated_at: p.request?.resolved ?? p.released ?? p.evaluated ?? p.updated ?? T.anchor,
      evaluated_at: p.evaluated ?? null,
      released_at: p.released ?? null,
    })
    if (p.request) {
      const resolved = p.request.status !== "Pending"
      requestRows.push({
        submission_id: submissionId,
        student_id: studentId,
        reason: p.request.reason,
        status: p.request.status,
        original_score: (p.points ?? []).reduce<number>((s, x) => s + (x ?? 0), 0),
        revised_score: p.request.status === "Revised" ? total : null,
        resolution: p.request.resolution ?? null,
        handled_by: resolved ? o.evaluatorId : null,
        created_at: p.request.created,
        updated_at: p.request.resolved ?? p.request.created,
        resolved_at: p.request.resolved ?? null,
      })
    }
  }
  if (submissions.length) await tx.insert(t.assignment_submissions).values(submissions)
  if (evaluationRows.length) await tx.insert(t.evaluations).values(evaluationRows)
  if (requestRows.length) await tx.insert(t.reevaluation_requests).values(requestRows)

  // The demo student's graded work, as the student demo seeds it.
  const [student] = await tx.select({ id: t.users.id }).from(t.users).where(sql`lower(${t.users.email}) = ${o.demoStudentEmail.toLowerCase()}`).limit(1)
  if (student) await restoreStudentGrading(tx, student.id, T)
}

/** Puts the demo student's seeded submissions (and their evaluations) back the way the student demo seeds them. */
async function restoreStudentGrading(tx: Tx, studentId: string, T: SeedTime) {
  const has = await tx.query.profiles.findFirst({ where: eq(t.profiles.id, studentId), columns: { id: true } })
  if (!has) return
  const seeded = demoRows(T, studentId, "").assignment_submissions
  const assignmentIds = seeded.map((s) => s.assignment_id)
  await tx.delete(t.assignment_submissions).where(and(eq(t.assignment_submissions.student_id, studentId), inArray(t.assignment_submissions.assignment_id, assignmentIds)))
  await tx.insert(t.assignment_submissions).values(seeded)
  await seedStudentEvaluations(tx, studentId)
}
