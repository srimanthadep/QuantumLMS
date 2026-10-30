import type { InterviewQuestion, InterviewType } from "../studentTypes"

export const ROLES = ["AI Engineer", "ML Engineer", "Data Scientist", "LLM Application Developer", "MLOps Engineer"] as const
export const LEVELS = ["Fresher", "1-2 Years", "3-5 Years", "5+ Years"] as const
export const PRACTICE_TYPES: InterviewType[] = ["Technical", "Coding", "Behavioral", "HR"]

export const QUESTION_BANK: Record<InterviewType, InterviewQuestion[]> = {
  Technical: [
    {
      id: "t1",
      category: "Technical",
      question: "Walk me through how you would design a retrieval-augmented generation (RAG) system for a large internal knowledge base.",
      expectedConcepts: ["chunking", "embedding", "vector", "retrieval", "rerank", "prompt", "evaluation", "hallucination"],
      sampleAnswer:
        "Ingest documents, chunk them by structure with overlap, embed the chunks and store them in a vector index with metadata. At query time, run hybrid retrieval, rerank the top candidates with a cross-encoder, and build a grounded prompt with citations. Evaluate faithfulness and context recall offline, and guard against hallucination by refusing when retrieval confidence is low.",
      tip: "Cover ingestion, retrieval, generation and evaluation. Name one trade-off you would measure.",
    },
    {
      id: "t2",
      category: "Technical",
      question: "Explain the bias-variance trade-off and how you would diagnose which one is hurting a model.",
      expectedConcepts: ["bias", "variance", "overfitting", "underfitting", "training", "validation", "regularization", "learning curve"],
      sampleAnswer:
        "High bias means the model underfits: training and validation error are both high. High variance means it overfits: training error is low but validation error is high. Learning curves show which one you have. Fix bias with a richer model or features, and variance with more data, regularization or simpler models.",
      tip: "Tie each failure mode to what you would see in training versus validation error.",
    },
    {
      id: "t3",
      category: "Technical",
      question: "How does self-attention work in a Transformer, and why does it scale quadratically?",
      expectedConcepts: ["query", "key", "value", "softmax", "dot product", "sequence length", "quadratic", "heads"],
      sampleAnswer:
        "Each token projects to query, key and value vectors. Attention weights are the softmax of scaled query-key dot products, and the output is a weighted sum of values. Every token attends to every other token, so the score matrix grows with the square of the sequence length. Multiple heads learn different relations in parallel.",
      tip: "Describe Q, K, V first, then the n×n score matrix.",
    },
    {
      id: "t4",
      category: "Technical",
      question: "When would you fine-tune a model instead of using prompting or RAG?",
      expectedConcepts: ["fine-tune", "lora", "style", "format", "latency", "cost", "data", "knowledge"],
      sampleAnswer:
        "Prompting and RAG are best for adding knowledge that changes. Fine-tuning, often with LoRA, fits when you need a consistent style or output format, lower latency or cost from a smaller model, and you have enough high-quality labelled data. It is a poor way to inject fresh facts.",
      tip: "Contrast changing knowledge with stable behaviour.",
    },
  ],
  Coding: [
    {
      id: "c1",
      category: "Coding",
      question: "How would you find the top k most similar vectors to a query among a million embeddings efficiently?",
      expectedConcepts: ["cosine", "normalize", "heap", "matrix", "approximate", "index", "hnsw", "complexity"],
      sampleAnswer:
        "Normalize vectors so cosine similarity becomes a dot product, then compute scores with one matrix multiply and select the top k with a heap or argpartition in O(n log k). At scale, use an approximate nearest-neighbour index such as HNSW or IVF to avoid scanning every vector.",
      tip: "Start with the exact approach and its complexity, then scale it.",
    },
    {
      id: "c2",
      category: "Coding",
      question: "Describe how you would implement a rate limiter for calls to an LLM API.",
      expectedConcepts: ["token bucket", "sliding window", "retry", "backoff", "queue", "concurrency", "429"],
      sampleAnswer:
        "Use a token bucket that refills at the provider's limit and blocks or queues requests when empty. Cap concurrency with a semaphore, and on 429 responses retry with exponential backoff and jitter. Track token usage per minute as well as request counts.",
      tip: "Mention both request and token limits.",
    },
    {
      id: "c3",
      category: "Coding",
      question: "How do you detect and handle data leakage when building a training pipeline?",
      expectedConcepts: ["split", "leakage", "time", "target", "cross-validation", "pipeline", "fit", "test"],
      sampleAnswer:
        "Split before any preprocessing and fit scalers or encoders on the training fold only, ideally inside a pipeline. Use time-based splits for temporal data, check for features derived from the target, and confirm that the test set is never touched until the end.",
      tip: "Think about where statistics get computed.",
    },
  ],
  Behavioral: [
    {
      id: "b1",
      category: "Behavioral",
      question: "Tell me about a time a model you built didn't perform as expected in production.",
      expectedConcepts: ["situation", "monitoring", "root cause", "data", "fix", "result", "learned"],
      sampleAnswer:
        "Our churn model's precision dropped after launch. Monitoring showed feature drift because a field changed upstream. I traced the root cause, added schema checks, retrained on recent data and set up drift alerts. Precision recovered within a week, and I learned to validate data contracts before deploying.",
      tip: "Use STAR: situation, task, action, result, and end with what you learned.",
    },
    {
      id: "b2",
      category: "Behavioral",
      question: "Describe a disagreement with a teammate about a technical decision and how you resolved it.",
      expectedConcepts: ["listen", "data", "experiment", "trade-off", "compromise", "outcome", "relationship"],
      sampleAnswer:
        "A teammate wanted a larger model while I preferred a smaller fine-tuned one. I listened to their concerns, and we agreed on a quick experiment comparing quality, latency and cost. The data favoured a hybrid, which we shipped, and we kept a good working relationship.",
      tip: "Show that you used evidence instead of opinion.",
    },
    {
      id: "b3",
      category: "Behavioral",
      question: "Tell me about a time you had to learn a new technology quickly.",
      expectedConcepts: ["deadline", "plan", "documentation", "prototype", "mentor", "delivered", "result"],
      sampleAnswer:
        "With two weeks before a hackathon, I had to learn LangGraph. I planned the core concepts, read the documentation, built a small prototype each day and asked a mentor to review my design. We delivered a working multi-agent demo and placed second.",
      tip: "Make the learning process concrete.",
    },
  ],
  HR: [
    {
      id: "h1",
      category: "HR",
      question: "Why do you want to work in AI engineering?",
      expectedConcepts: ["impact", "projects", "skills", "growth", "users", "motivation"],
      sampleAnswer:
        "I enjoy turning research into products that help users. My projects in RAG and agents taught me the engineering side, and I want to grow my skills on a team that ships AI features with measurable impact.",
      tip: "Connect your motivation to evidence from your projects.",
    },
    {
      id: "h2",
      category: "HR",
      question: "Where do you see yourself in three years?",
      expectedConcepts: ["ownership", "mentor", "expertise", "lead", "learning", "team"],
      sampleAnswer:
        "I'd like to own a production ML system end to end, have deep expertise in LLM evaluation, and mentor newer engineers. I want to keep learning while helping the team ship reliable products.",
      tip: "Be ambitious but grounded in the role.",
    },
    {
      id: "h3",
      category: "HR",
      question: "What is your greatest strength and one area you're improving?",
      expectedConcepts: ["strength", "example", "weakness", "improving", "feedback", "steps"],
      sampleAnswer:
        "My strength is breaking ambiguous problems into experiments, for example in my RAG benchmarking project. I'm improving at estimating timelines: I now break work into smaller tasks and ask for feedback on my estimates each sprint.",
      tip: "Give an example for the strength and concrete steps for the weakness.",
    },
  ],
  Aptitude: [],
}

export interface InterviewResponse {
  questionId: string
  question: string
  answer: string
  score: number
  found: string[]
  missed: string[]
  sampleAnswer: string
}

export interface InterviewSessionResult {
  id: string
  date: string
  role: string
  type: InterviewType
  level: string
  score: number
  durationSeconds: number
  responses: InterviewResponse[]
}

/** Keyword-coverage scoring: concepts mentioned (prefix match) plus a small bonus for depth. */
export function scoreAnswer(q: InterviewQuestion, answer: string): Omit<InterviewResponse, "questionId" | "question" | "answer" | "sampleAnswer"> {
  const text = answer.toLowerCase()
  const has = (concept: string) => {
    const c = concept.toLowerCase()
    return text.includes(c) || (c.length > 5 && text.includes(c.slice(0, Math.max(5, c.length - 2))))
  }
  const found = q.expectedConcepts.filter(has)
  const missed = q.expectedConcepts.filter((c) => !has(c))
  const words = answer.trim().split(/\s+/).filter(Boolean).length
  const coverage = q.expectedConcepts.length ? found.length / q.expectedConcepts.length : 0
  const score = words === 0 ? 0 : Math.min(100, Math.round(coverage * 80 + Math.min(20, words / 4)))
  return { score, found, missed }
}

export function countConcepts(q: InterviewQuestion, answer: string): number {
  return scoreAnswer(q, answer).found.length
}

export const SEED_HISTORY: InterviewSessionResult[] = [
  { id: "iv-1", date: "Oct 18, 2026", role: "AI Engineer", type: "Technical", level: "Fresher", score: 81, durationSeconds: 1260, responses: [] },
  { id: "iv-2", date: "Oct 12, 2026", role: "ML Engineer", type: "Behavioral", level: "Fresher", score: 72, durationSeconds: 980, responses: [] },
]

export interface ResumeEntry {
  id: string
  title: string
  org: string
  period: string
  points: string
}

export interface ResumeState {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  links: string
  summary: string
  skills: string[]
  experience: ResumeEntry[]
  projects: ResumeEntry[]
  education: ResumeEntry[]
}

export const DEFAULT_RESUME: ResumeState = {
  name: "Aarav Mehta",
  headline: "AI Engineer · Generative AI & Agentic Systems",
  email: "aarav.mehta@learner.ai",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  links: "github.com/aaravmehta · linkedin.com/in/aaravmehta",
  summary:
    "AI engineering student building retrieval-augmented and multi-agent systems. Shipped a RAG assistant that answers course questions with citations and an agent that automates code review.",
  skills: ["Python", "PyTorch", "LangChain", "LangGraph", "Vector databases", "FastAPI", "Docker"],
  experience: [
    {
      id: "ex-1",
      title: "AI Research Intern",
      org: "Quantum School of AI Labs",
      period: "May 2026 – Aug 2026",
      points: "Benchmarked chunking strategies across 50,000 documents and improved retrieval recall by 18%\nBuilt an evaluation harness with Ragas used by 3 research teams",
    },
  ],
  projects: [
    {
      id: "pr-1",
      title: "Course RAG Assistant",
      org: "LangChain · ChromaDB · FastAPI",
      period: "2026",
      points: "Answers student questions with cited sources; 92% faithfulness on a 500-question benchmark",
    },
    { id: "pr-2", title: "Code Review Agent", org: "LangGraph · GitHub API", period: "2026", points: "" },
  ],
  education: [{ id: "ed-1", title: "B.S. Artificial Intelligence", org: "Quantum School of AI", period: "2023 – 2027", points: "GPA 3.88 / 4.0 · Dean's Honor List" }],
}

export interface AtsCheck {
  id: string
  label: string
  weight: number
  passed: boolean
  hint: string
}

export function atsChecks(r: ResumeState): AtsCheck[] {
  const quantified = [...r.experience, ...r.projects].some((e) => /\d/.test(e.points))
  const described = r.projects.filter((p) => p.points.trim().length > 20).length
  return [
    { id: "contact", label: "Complete contact details", weight: 15, passed: !!(r.email && r.phone && r.location && r.links), hint: "Add email, phone, location and links." },
    { id: "summary", label: "Summary of 150–600 characters", weight: 15, passed: r.summary.trim().length >= 150 && r.summary.trim().length <= 600, hint: "Write a focused 2–3 sentence summary." },
    { id: "skills", label: "At least 8 skills", weight: 15, passed: r.skills.length >= 8, hint: `Add ${Math.max(0, 8 - r.skills.length)} more relevant skills.` },
    { id: "projects", label: "2+ projects with descriptions", weight: 20, passed: described >= 2, hint: "Describe what each project does and its result." },
    { id: "impact", label: "Quantified impact", weight: 20, passed: quantified, hint: "Add numbers: %, users, latency, dataset size." },
    { id: "education", label: "Education listed", weight: 15, passed: r.education.length > 0, hint: "Add your degree." },
  ]
}

export const atsScore = (r: ResumeState) => atsChecks(r).reduce((s, c) => s + (c.passed ? c.weight : 0), 0)

export function resumeToText(r: ResumeState): string {
  const section = (title: string, items: ResumeEntry[]) =>
    items.length
      ? [`\n${title.toUpperCase()}`, ...items.map((e) => [`${e.title} · ${e.org} · ${e.period}`, ...e.points.split("\n").filter(Boolean).map((p) => `  - ${p}`)].join("\n"))].join("\n")
      : ""
  return [
    r.name,
    r.headline,
    [r.email, r.phone, r.location].filter(Boolean).join(" | "),
    r.links,
    `\nSUMMARY\n${r.summary}`,
    `\nSKILLS\n${r.skills.join(", ")}`,
    section("Experience", r.experience),
    section("Projects", r.projects),
    section("Education", r.education),
  ]
    .filter(Boolean)
    .join("\n")
}
