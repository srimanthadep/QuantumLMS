import {
  Course,
  Batch,
  LiveClassSession,
  LectureRecording,
  StudentDoubt,
  TestSubmission,
  SupportTicket,
  PaymentTransaction,
  CertificateRecord,
  AuditLogEntry,
} from "@/types/lms";

export const MOCK_COURSES: Course[] = [
  {
    id: "course-ai-eng",
    title: "Full-Stack AI & LLM Systems Engineering",
    slug: "full-stack-ai-engineering",
    description: "Architect and deploy production LLM applications, RAG pipelines, fine-tuned models, and scalable GPU backends.",
    category: "LLM Engineering",
    level: "Advanced",
    modulesCount: 12,
    totalHours: 84,
    rating: 4.9,
    enrolledStudentsCount: 340,
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    priceRupees: 64999,
    status: "active",
  },
  {
    id: "course-agents",
    title: "Autonomous Multi-Agent Architectures",
    slug: "autonomous-multi-agent-architectures",
    description: "Design coordinating agent swarms with memory, tool routing, human-in-the-loop oversight, and resilient recovery.",
    category: "Agentic Systems",
    level: "Intermediate",
    modulesCount: 8,
    totalHours: 56,
    rating: 4.85,
    enrolledStudentsCount: 220,
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80",
    priceRupees: 49999,
    status: "active",
  },
  {
    id: "course-genai-vision",
    title: "Diffusion Models & Generative Vision",
    slug: "diffusion-models-vision",
    description: "Deep dive into latent diffusion, ControlNet conditioning, LoRA adapters, and real-time visual neural synthesis.",
    category: "Computer Vision",
    level: "Advanced",
    modulesCount: 10,
    totalHours: 70,
    rating: 4.92,
    enrolledStudentsCount: 180,
    thumbnail: "https://images.unsplash.com/photo-1633493106115-fa431f4713e7?w=800&auto=format&fit=crop&q=80",
    priceRupees: 54999,
    status: "active",
  },
  {
    id: "course-mlops",
    title: "Production MLOps & Vector Infrastructure",
    slug: "production-mlops-vector-infra",
    description: "Containerization, Kubernetes GPU scheduling, Milvus/Qdrant vector indexes, and continuous evaluation frameworks.",
    category: "MLOps",
    level: "Intermediate",
    modulesCount: 8,
    totalHours: 48,
    rating: 4.78,
    enrolledStudentsCount: 150,
    thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
    priceRupees: 44999,
    status: "active",
  },
];

export const MOCK_BATCHES: Batch[] = [
  {
    id: "batch-c7-live",
    courseId: "course-ai-eng",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    name: "Cohort 7 (Live Synchronous + Replays)",
    cohortCode: "AI-ENG-C7",
    startDate: "01 Sep 2026",
    endDate: "31 Dec 2026",
    teacherId: "usr-teacher-1",
    teacherName: "Prof. Rajesh Verma",
    maxSeats: 120,
    enrolledCount: 112,
    status: "active",
    entitlement: {
      accessType: "live_and_replay",
      replayReleaseDelayHours: 0,
      accessExpiryDate: "31 Dec 2026",
      allowLiveChat: true,
      allowDoubts: true,
      allowAiTutor: true,
      allowCertificates: true,
    },
  },
  {
    id: "batch-c8-replay",
    courseId: "course-ai-eng",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    name: "Cohort 8 (Self-Paced Replay-Only Access)",
    cohortCode: "AI-ENG-C8-RO",
    startDate: "15 Sep 2026",
    endDate: "31 Mar 2027",
    teacherId: "usr-teacher-1",
    teacherName: "Prof. Rajesh Verma",
    maxSeats: 250,
    enrolledCount: 185,
    status: "active",
    entitlement: {
      accessType: "replay_only",
      replayReleaseDelayHours: 24, // 24-hour delay release
      accessExpiryDate: "31 Mar 2027",
      allowLiveChat: false,
      allowDoubts: true,
      allowAiTutor: true,
      allowCertificates: true,
    },
  },
  {
    id: "batch-agents-c3",
    courseId: "course-agents",
    courseTitle: "Autonomous Multi-Agent Architectures",
    name: "Agentic Systems Bootcamp (Weekend Cohort)",
    cohortCode: "AGT-WKND-C3",
    startDate: "10 Oct 2026",
    endDate: "15 Jan 2027",
    teacherId: "usr-teacher-1",
    teacherName: "Prof. Rajesh Verma",
    maxSeats: 80,
    enrolledCount: 78,
    status: "active",
    entitlement: {
      accessType: "live_and_replay",
      replayReleaseDelayHours: 0,
      accessExpiryDate: "15 Jan 2027",
      allowLiveChat: true,
      allowDoubts: true,
      allowAiTutor: true,
      allowCertificates: true,
    },
  },
];

export const MOCK_LIVE_CLASSES: LiveClassSession[] = [
  {
    id: "class-agentic-101",
    batchId: "batch-agents-c3",
    batchName: "Agentic Systems Bootcamp",
    courseTitle: "Autonomous Multi-Agent Architectures",
    title: "Session 4: Multi-Agent Consensus & Hierarchical Supervision",
    description: "Designing supervisor agents, reflection loops, and resilient state machines in LangGraph.",
    instructorId: "usr-teacher-1",
    instructorName: "Prof. Rajesh Verma",
    scheduledAt: "Today, 06:30 PM IST",
    durationMinutes: 90,
    status: "live",
    viewerCount: 72,
    activeTopic: "Hierarchical Supervisor Node Execution",
    confusionCount: 3,
    handRaisesCount: 2,
  },
  {
    id: "class-rag-scale",
    batchId: "batch-c7-live",
    batchName: "Cohort 7 (Live + Replay)",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    title: "Session 9: Hybrid Search, Reranking & Lost-in-the-Middle Mitigation",
    description: "Combining BM25 keyword search with dense HNSW vectors, Cohere rerankers, and contextual compression.",
    instructorId: "usr-teacher-1",
    instructorName: "Prof. Rajesh Verma",
    scheduledAt: "Tomorrow, 08:00 PM IST",
    durationMinutes: 90,
    status: "scheduled",
    viewerCount: 0,
  },
  {
    id: "class-diffusion-math",
    batchId: "batch-c7-live",
    batchName: "Cohort 7 (Live + Replay)",
    courseTitle: "Diffusion Models & Generative Vision",
    title: "Session 12: Noise Schedulers & Classifier-Free Guidance (CFG)",
    description: "Mathematical derivation of DDPM variance schedules and conditioning vectors.",
    instructorId: "usr-teacher-1",
    instructorName: "Prof. Rajesh Verma",
    scheduledAt: "16 Oct 2026, 07:00 PM IST",
    durationMinutes: 120,
    status: "scheduled",
    viewerCount: 0,
  },
];

export const MOCK_RECORDINGS: LectureRecording[] = [
  {
    id: "rep-rag-8",
    classId: "class-prev-8",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    title: "Lecture 8: Vector Databases, Chunking Strategies & Embedding Alignment",
    durationFormatted: "01:28:45",
    publishedAt: "Yesterday, 09:30 PM",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    pdfNotesUrl: "/assets/notes-lecture-8.pdf",
    dppAttachmentUrl: "/assets/dpp-practice-8.pdf",
    status: "published",
    aiSummary: "In this comprehensive lecture, Prof. Verma introduced embedding chunking heuristics (recursive character splitting vs. semantic windowing), vector indexing structures (HNSW vs IVF-PQ), cosine similarity metric nuances, and mitigation of embedding drift in production.",
    keyConcepts: [
      "Recursive Character Chunking (500 tokens with 50-token overlap)",
      "Hierarchical Navigable Small World (HNSW) graph indexing",
      "Cosine Similarity vs Inner Product normalization",
      "Embedding drift monitoring with Kolmogorov-Smirnov test",
    ],
    chapters: [
      {
        id: "ch-1",
        timestampSeconds: 0,
        timestampFormatted: "00:00:00",
        title: "Introduction & Context of Semantic Retrieval",
        summary: "Overview of limitations with standard lexical search and motivation for dense vector representations.",
        keyKeywords: ["Overview", "Vector Space", "Recall"],
      },
      {
        id: "ch-2",
        timestampSeconds: 525,
        timestampFormatted: "00:08:45",
        title: "Chunking Heuristics: Fixed vs Semantic Boundaries",
        summary: "Why fixed character chunking breaks mid-sentence and how semantic boundary tokenization preserves intent.",
        keyKeywords: ["Tokenization", "Chunk Size", "Overlap"],
      },
      {
        id: "ch-3",
        timestampSeconds: 1458,
        timestampFormatted: "00:24:18",
        title: "HNSW Graph Construction & Recall-Latency Tradeoffs",
        summary: "Mathematical mechanics of multi-layer skip-list graphs in high-dimensional vector spaces.",
        keyKeywords: ["HNSW", "efSearch", "Index Time"],
      },
      {
        id: "ch-4",
        timestampSeconds: 2790,
        timestampFormatted: "00:46:30",
        title: "Mitigating Lost-in-the-Middle with Context Reranking",
        summary: "How cross-encoders reorder candidate vectors before injecting them into the LLM context prompt.",
        keyKeywords: ["Reranking", "Cross-Encoder", "Context Window"],
      },
      {
        id: "ch-5",
        timestampSeconds: 4330,
        timestampFormatted: "01:12:10",
        title: "Live Q&A: Inverted File Index vs Graph Indexes",
        summary: "Student doubts answered on memory footprint tradeoffs between Milvus, Qdrant, and pgvector.",
        keyKeywords: ["pgvector", "Memory Consumption", "SLA"],
      },
    ],
    transcript: [
      {
        id: "tr-1",
        timestampSeconds: 15,
        timestampFormatted: "00:00:15",
        speaker: "Prof. Verma",
        text: "Good evening everyone. Welcome to session eight. Today we tackle the core bottleneck in real-world LLM systems: vector retrieval precision.",
      },
      {
        id: "tr-2",
        timestampSeconds: 540,
        timestampFormatted: "00:09:00",
        speaker: "Prof. Verma",
        text: "When you blindly chunk documents at 500 characters, sentences get split across two vectors. The embeddings become diluted. Always chunk along natural paragraph breaks with a 10% overlap.",
      },
      {
        id: "tr-3",
        timestampSeconds: 1465,
        timestampFormatted: "00:24:25",
        speaker: "Prof. Verma",
        text: "Notice that HNSW creates hierarchical layers like an express subway system. Upper layers have sparse long-distance leaps, while the bottom layer has dense local clusters.",
      },
      {
        id: "tr-4",
        timestampSeconds: 2800,
        timestampFormatted: "00:46:40",
        speaker: "Prof. Verma",
        text: "If you feed 20 retrieved chunks directly to Claude or GPT-4, the model attends heavily to the start and end of the prompt. This is the documented lost-in-the-middle phenomenon.",
      },
      {
        id: "tr-5",
        timestampSeconds: 4345,
        timestampFormatted: "01:12:25",
        speaker: "Student Query",
        text: "Sir, when should we use IVF-PQ instead of HNSW in a memory-constrained production environment?",
      },
      {
        id: "tr-6",
        timestampSeconds: 4360,
        timestampFormatted: "01:12:40",
        speaker: "Prof. Verma",
        text: "Great question! When your vectors exceed RAM limits, Product Quantization (PQ) compresses 1536-dim floats down to 8-bit centroids, reducing memory by up to 80% at a slight cost in recall.",
      },
    ],
  },
  {
    id: "rep-langgraph-7",
    classId: "class-prev-7",
    courseTitle: "Autonomous Multi-Agent Architectures",
    title: "Lecture 3: LangGraph State Graphs & Human-in-the-Loop Interrupts",
    durationFormatted: "01:15:30",
    publishedAt: "3 days ago",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    status: "published",
    aiSummary: "Exploration of cyclic execution graphs, thread-based checkpoint memory, and interrupt patterns allowing human review before executing sensitive external API tools.",
    keyConcepts: [
      "StateGraph message history reducers",
      "Checkpointer persistence with SQLite & Postgres",
      "Human-in-the-loop breakpoint execution",
    ],
    chapters: [
      {
        id: "ch-lg-1",
        timestampSeconds: 0,
        timestampFormatted: "00:00:00",
        title: "From Linear DAGs to Stateful Cyclic Graphs",
        summary: "Why real-world agent collaboration requires cycles rather than acyclic pipelines.",
        keyKeywords: ["Cyclic Graphs", "LangGraph"],
      },
      {
        id: "ch-lg-2",
        timestampSeconds: 1200,
        timestampFormatted: "00:20:00",
        title: "Configuring Dynamic Breakpoints for Approval",
        summary: "Implementing interrupts before high-cost tool calls or irreversible database writes.",
        keyKeywords: ["Interrupts", "Approvals"],
      },
    ],
    transcript: [
      {
        id: "tr-lg-1",
        timestampSeconds: 10,
        timestampFormatted: "00:00:10",
        speaker: "Prof. Verma",
        text: "Welcome back. Today we transition from naive chain execution to stateful cyclic agent graphs.",
      },
    ],
  },
];

export const MOCK_DOUBTS: StudentDoubt[] = [
  {
    id: "doubt-1",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    classTitle: "Lecture 8: Vector Databases & Chunking",
    timestampSeconds: 1458,
    timestampFormatted: "00:24:18",
    question: "How does the efSearch parameter in HNSW affect latency versus recall during high concurrency?",
    status: "ai_answered",
    aiAnswer: "Based on Lecture 8 @ 00:24:18: HNSW's `efSearch` controls the size of the dynamic candidate list evaluated during query exploration. A higher `efSearch` explores deeper branches in the graph, increasing recall at the expense of query latency. In production, an `efSearch` of 64-128 typically achieves 98%+ recall with under 15ms latency.",
    createdAt: "2 hours ago",
  },
  {
    id: "doubt-2",
    studentId: "usr-student-2",
    studentName: "Pooja Hegde",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    classTitle: "Lecture 3: LangGraph State Graphs",
    timestampSeconds: 1200,
    timestampFormatted: "00:20:00",
    question: "Can an interrupt in LangGraph persist across server restarts if the client disconnects?",
    status: "teacher_replied",
    teacherReply: "Yes Pooja! Because LangGraph relies on the thread checkpointer (e.g. Postgres or Redis Saver), the complete state snapshot is persisted in the DB. When the client reconnects, you simply resume the thread ID with the human approval payload.",
    createdAt: "Yesterday",
  },
  {
    id: "doubt-3",
    studentId: "usr-student-3",
    studentName: "Rohan Nair",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    classTitle: "Lecture 8: Vector Databases & Chunking",
    timestampSeconds: 2790,
    timestampFormatted: "00:46:30",
    question: "Is Cohere Rerank v3 faster than a locally hosted BGE-Reranker-Large?",
    status: "open",
    createdAt: "30 mins ago",
  },
];

export const MOCK_SUBMISSIONS: TestSubmission[] = [
  {
    id: "sub-1",
    testId: "test-rag-eval",
    testTitle: "Milestone 2: Hybrid RAG System with Cohere Rerank",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta (Candidate #4810)",
    submittedAt: "12 Oct 2026, 04:30 PM",
    status: "re_evaluation_requested",
    priority: "urgent",
    deadline: "14 Oct 2026, 11:59 PM",
    slaTimeRemaining: "4 hours left",
    isOverdue: false,
    objectiveScore: 40,
    objectiveMaxScore: 40,
    reEvaluationReason: "Candidate contested the 2-point deduction in Error Handling. LangChain's Cohere wrapper includes built-in exponential backoff, making application-level retry redundant.",
    codeSubmission: `import os
from langchain_community.vectorstores import Qdrant
from langchain_cohere import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever

def build_hybrid_pipeline(embeddings, client):
    vector_retriever = Qdrant(
        client=client,
        collection_name="enterprise_docs",
        embeddings=embeddings
    ).as_retriever(search_kwargs={"k": 25})
    
    compressor = CohereRerank(model="rerank-english-v3.0", top_n=5)
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=vector_retriever
    )`,
    files: [
      {
        name: "hybrid_retriever.py",
        language: "python",
        content: `import os
from langchain_community.vectorstores import Qdrant
from langchain_cohere import CohereRerank
from langchain.retrievers import ContextualCompressionRetriever

def build_hybrid_pipeline(embeddings, client):
    """
    Constructs a two-stage recall and compression pipeline.
    Stage 1: Fast approximate ANN recall over Qdrant (top 25 candidates).
    Stage 2: Cross-encoder reranking via Cohere Rerank v3.
    """
    vector_retriever = Qdrant(
        client=client,
        collection_name="enterprise_docs",
        embeddings=embeddings
    ).as_retriever(search_kwargs={"k": 25})
    
    compressor = CohereRerank(model="rerank-english-v3.0", top_n=5)
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=vector_retriever
    )`
      },
      {
        name: "rerank_config.yaml",
        language: "yaml",
        content: `rag_pipeline:
  embedding_model: text-embedding-3-small
  vector_db:
    provider: qdrant
    distance_metric: cosine
    ef_search: 128
  reranker:
    model: rerank-english-v3.0
    initial_k: 25
    top_n: 5
    score_threshold: 0.65`
      },
      {
        name: "README.md",
        language: "markdown",
        content: `# Hybrid RAG Implementation
This project evaluates the reduction in *Lost-in-the-Middle* degradation when pairing high-recall vector search with deep cross-encoder re-ranking.
Benchmarks show an 18.4% improvement in MRR@5 over pure cosine similarity.`
      }
    ],
    descriptiveAnswers: [
      {
        question: "Explain your rationale for choosing top_n=5 after reranking 25 initial candidates.",
        answer: "Initial vector search casts a wide net with high recall (k=25). The cross-encoder then reranks by full contextual similarity. Limiting context to top 5 eliminates noisy background passages and prevents lost-in-the-middle degradation.",
      },
      {
        question: "How does your pipeline handle transient network timeouts from the Cohere API?",
        answer: "The Cohere client internally utilizes urllib3 connection pools with 3 automatic retry attempts on HTTP 429 and 503 status codes with exponential jitter.",
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Vector Pipeline Architecture", maxScore: 20, score: 19, rationale: "Excellent clean implementation using Qdrant client." },
      { id: "r2", criteria: "Reranker Integration & Optimization", maxScore: 20, score: 18, rationale: "Proper compression wrapper with appropriate top_n constraints." },
      { id: "r3", criteria: "Lost-in-the-middle Mitigation Logic", maxScore: 10, score: 10, rationale: "Thorough conceptual understanding displayed." },
      { id: "r4", criteria: "Code Quality & Error Handling", maxScore: 10, score: 8, rationale: "Missing try/except block around Cohere API network timeouts." },
    ],
    aiSuggestedScore: 94,
    aiRationale: "High degree of alignment with reference solution. Passes 100% of synthetic test cases. Minor deduction for absence of application-level retry decorator.",
    evaluatorFeedback: "Outstanding submission! Your separation of dense retrieval from the compression layer is production-grade. To improve further, wrap remote Cohere API calls in a tenacity retry decorator to handle transient rate limits.",
    totalScore: 95,
    maxScore: 100,
    releasedToStudent: false,
    gradeHistory: [
      { date: "12 Oct 2026, 06:15 PM", evaluator: "Kavita Rao", totalScore: 95, changeReason: "Initial evaluation submitted." },
      { date: "13 Oct 2026, 11:20 AM", evaluator: "Kavita Rao", totalScore: 95, changeReason: "Reassessment request received from candidate." }
    ]
  },
  {
    id: "sub-2",
    testId: "test-agent-graph",
    testTitle: "Capstone 1: Multi-Agent Research Assistant with Human Oversight",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    studentId: "usr-student-4",
    studentName: "Pooja Sharma (Candidate #8219)",
    submittedAt: "13 Oct 2026, 09:15 PM",
    status: "pending",
    priority: "urgent",
    deadline: "14 Oct 2026, 06:00 PM",
    slaTimeRemaining: "1h 30m remaining",
    isOverdue: false,
    objectiveScore: 35,
    objectiveMaxScore: 40,
    codeSubmission: `# Supervisor Agent Node
from langgraph.graph import StateGraph, END

def supervisor_node(state):
    # Routing decision based on latest message
    messages = state["messages"]
    last_action = state.get("last_action")
    if "FINAL ANSWER" in messages[-1].content:
        return {"next": END}
    return {"next": "researcher"}`,
    files: [
      {
        name: "agent_graph.py",
        language: "python",
        content: `from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List

class AgentState(TypedDict):
    messages: List[str]
    current_actor: str
    approved_by_human: bool

def supervisor_node(state: AgentState):
    if state.get("approved_by_human"):
        return {"next": "tool_executor"}
    return {"next": "human_reviewer"}`
      }
    ],
    descriptiveAnswers: [
      {
        question: "Explain the safety bounds preventing infinite supervisor-worker routing loops.",
        answer: "A global recursion_limit=25 is set in the StateGraph runtime, and the supervisor maintains a step_counter that forces a fallback human escalation node if unanswered after 4 cycles."
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Graph Topology & Node Design", maxScore: 25, score: 22, rationale: "Clear conditional branching and state schema." },
      { id: "r2", criteria: "Human Interrupt Implementation", maxScore: 25, score: 20, rationale: "Proper interrupt_before logic on dangerous tools." },
      { id: "r3", criteria: "Memory Persistence & Checkpointing", maxScore: 10, score: 8, rationale: "Uses PostgresSaver, needs connection pool tuning." },
    ],
    aiSuggestedScore: 85,
    aiRationale: "Clean state graph compilation. Human interrupt executes correctly before destructive database mutation tools.",
    evaluatorFeedback: "",
    totalScore: 0,
    maxScore: 100,
    releasedToStudent: false
  },
  {
    id: "sub-3",
    testId: "test-lora-tuning",
    testTitle: "Lab 4: Fine-Tuning Llama-3-8B with LoRA & Unsloth",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    studentId: "usr-student-2",
    studentName: "Vikram Adve (Candidate #3104)",
    submittedAt: "11 Oct 2026, 11:45 PM",
    status: "pending",
    priority: "urgent",
    deadline: "13 Oct 2026, 11:59 PM",
    slaTimeRemaining: "Overdue by 16 hours",
    isOverdue: true,
    objectiveScore: 38,
    objectiveMaxScore: 40,
    codeSubmission: `from unsloth import FastLanguageModel
import torch

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
    load_in_4bit=True
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha=16,
    lora_dropout=0
)`,
    files: [
      {
        name: "train_lora.py",
        language: "python",
        content: `from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

# Model loading and 4-bit quantization config
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
    load_in_4bit=True
)`
      }
    ],
    descriptiveAnswers: [
      {
        question: "Why was lora_dropout set to 0 when using Unsloth?",
        answer: "Unsloth achieves maximum kernel fusion and speedups when dropout is disabled, as recommended by their kernel benchmarks."
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Hyperparameter Selection", maxScore: 20, score: 18, rationale: "Proper r=16 and alpha=16 scaling factor." },
      { id: "r2", criteria: "Loss Convergence & Overfitting Check", maxScore: 20, score: 19, rationale: "Validation loss curve demonstrates solid generalization." },
      { id: "r3", criteria: "Inference Latency Benchmark", maxScore: 20, score: 17, rationale: "Tested on T4 GPU; 42 tokens/sec achieved." },
    ],
    aiSuggestedScore: 92,
    aiRationale: "High training efficiency. WandB loss graph demonstrates monotonic convergence without validation loss explosion.",
    evaluatorFeedback: "",
    totalScore: 0,
    maxScore: 100,
    releasedToStudent: false
  },
  {
    id: "sub-4",
    testId: "test-diff-vision",
    testTitle: "Milestone 3: Stable Diffusion ControlNet Multi-Modal Conditioning",
    courseTitle: "Diffusion Models & Generative Vision",
    batchName: "Weekend Generative Vision Cohort",
    studentId: "usr-student-6",
    studentName: "Aditi Rao (Candidate #5912)",
    submittedAt: "13 Oct 2026, 03:20 PM",
    status: "draft",
    priority: "normal",
    deadline: "15 Oct 2026, 11:59 PM",
    slaTimeRemaining: "1 day 8h remaining",
    isOverdue: false,
    objectiveScore: 32,
    objectiveMaxScore: 40,
    codeSubmission: `from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
import torch

controlnet = ControlNetModel.from_pretrained("lllyasviel/control_v11p_sd15_canny")
pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float16
).to("cuda")`,
    files: [
      {
        name: "controlnet_pipeline.py",
        language: "python",
        content: `import cv2
import numpy as np
from PIL import Image

def preprocess_canny(image_path: str, low_threshold=100, high_threshold=200):
    image = cv2.imread(image_path)
    canny = cv2.Canny(image, low_threshold, high_threshold)
    return Image.fromarray(canny)`
      }
    ],
    descriptiveAnswers: [
      {
        question: "Explain the memory tradeoff between zero-convolutions vs full LoRA conditioning on ControlNet.",
        answer: "Zero convolutions preserve original SD weights by starting with zero weights that gradually learn residual features, avoiding catastrophic forgetting while requiring minimal VRAM."
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Edge Conditioning Quality", maxScore: 25, score: 23, rationale: "Clean Canny preprocessing with adaptive thresholds." },
      { id: "r2", criteria: "Prompt Guidance & Seed Reproducibility", maxScore: 20, score: 18, rationale: "Deterministic seeds logged in output metadata." },
      { id: "r3", criteria: "Memory Footprint Optimization", maxScore: 15, score: 14, rationale: "Applied xFormers attention and torch.float16." },
    ],
    aiSuggestedScore: 87,
    aiRationale: "Effective multi-modal conditioning. Correct memory optimization utilizing fp16 and attention slicing.",
    evaluatorFeedback: "Draft in progress: Preprocessing logic is sound. Verifying prompt adherence test cases.",
    totalScore: 87,
    maxScore: 100,
    releasedToStudent: false
  },
  {
    id: "sub-5",
    testId: "test-mlops-k8s",
    testTitle: "Capstone 2: Production Triton GPU Inference on K8s",
    courseTitle: "Production MLOps & Vector Infrastructure",
    batchName: "Enterprise MLOps Masterclass",
    studentId: "usr-student-7",
    studentName: "Karan Johar (Candidate #1920)",
    submittedAt: "10 Oct 2026, 02:10 PM",
    status: "graded",
    priority: "low",
    deadline: "12 Oct 2026, 11:59 PM",
    slaTimeRemaining: "Completed on-time",
    isOverdue: false,
    objectiveScore: 40,
    objectiveMaxScore: 40,
    codeSubmission: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: triton
        image: nvcr.io/nvidia/tritonserver:24.01-py3
        resources:
          limits:
            nvidia.com/gpu: 1`,
    files: [
      {
        name: "triton_deployment.yaml",
        language: "yaml",
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-cluster
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: triton
        image: nvcr.io/nvidia/tritonserver:24.01-py3
        args: ["tritonserver", "--model-repository=/models"]
        resources:
          limits:
            nvidia.com/gpu: 1`
      }
    ],
    descriptiveAnswers: [
      {
        question: "How did you configure dynamic batching in config.pbtxt?",
        answer: "Configured max_queue_delay_microseconds: 50000 and max_batch_size: 32 to maximize GPU saturation during traffic spikes."
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Kubernetes Manifest Resilience", maxScore: 25, score: 25, rationale: "Includes readiness/liveness probes and GPU node affinity." },
      { id: "r2", criteria: "Dynamic Batching Configuration", maxScore: 20, score: 20, rationale: "Optimal queue delay parameters." },
      { id: "r3", criteria: "Prometheus Metric Export", maxScore: 15, score: 14, rationale: "Custom scrapers hooked into /metrics endpoint." },
    ],
    aiSuggestedScore: 99,
    aiRationale: "Flawless enterprise deployment architecture. Passed all load testing probes at 1200 QPS with p99 latency < 45ms.",
    evaluatorFeedback: "Exceptional mastery of distributed Triton serving and Kubernetes GPU scheduling. Grade released to learner.",
    totalScore: 99,
    maxScore: 100,
    releasedToStudent: true
  },
  {
    id: "sub-6",
    testId: "test-rag-eval",
    testTitle: "Milestone 2: Hybrid RAG System with Cohere Rerank",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    studentId: "usr-student-3",
    studentName: "Neha Gupta (Candidate #7731)",
    submittedAt: "14 Oct 2026, 01:15 AM",
    status: "pending",
    priority: "normal",
    deadline: "16 Oct 2026, 11:59 PM",
    slaTimeRemaining: "1 day 18h left",
    isOverdue: false,
    objectiveScore: 36,
    objectiveMaxScore: 40,
    codeSubmission: `def run_retrieval(query, retriever, reranker):
    docs = retriever.get_relevant_documents(query)
    reranked = reranker.compress_documents(docs, query)
    return reranked`,
    files: [
      {
        name: "simple_pipeline.py",
        language: "python",
        content: `def run_retrieval(query, retriever, reranker):
    docs = retriever.get_relevant_documents(query)
    reranked = reranker.compress_documents(docs, query)
    return reranked`
      }
    ],
    descriptiveAnswers: [
      {
        question: "Explain your rationale for choosing top_n=5 after reranking 25 initial candidates.",
        answer: "To reduce prompt token cost and improve relevance."
      }
    ],
    rubricScores: [
      { id: "r1", criteria: "Vector Pipeline Architecture", maxScore: 20, score: 15, rationale: "Basic wrapper implementation, lacks modular configuration." },
      { id: "r2", criteria: "Reranker Integration & Optimization", maxScore: 20, score: 14, rationale: "Missing metadata score preservation." },
      { id: "r3", criteria: "Lost-in-the-middle Mitigation Logic", maxScore: 10, score: 7, rationale: "Brief explanation without citation of positional attention bias." },
      { id: "r4", criteria: "Code Quality & Error Handling", maxScore: 10, score: 7, rationale: "No exception handling or type annotations." },
    ],
    aiSuggestedScore: 78,
    aiRationale: "Working baseline implementation, but lacks production error boundaries, type hints, and parameter configuration.",
    evaluatorFeedback: "",
    totalScore: 0,
    maxScore: 100,
    releasedToStudent: false
  }
];

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "tkt-1082",
    ticketNumber: "TKT-1082",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    studentEmail: "arjun.m@learner.ai",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "batch_change",
    priority: "medium",
    status: "open",
    assignedAgent: "Nikhil Joshi",
    subject: "Requesting move from Weekday Evening to Weekend Intensive cohort",
    createdAt: "Today, 09:30 AM",
    messages: [
      {
        id: "msg-1",
        sender: "Arjun Mehta",
        role: "student",
        message: "Hello Support Team, due to new office timings I am unable to attend the 8 PM weekday live lectures. Can I please be moved to the Weekend Cohort?",
        timestamp: "09:30 AM",
      },
      {
        id: "msg-2",
        sender: "Nikhil Joshi",
        role: "agent",
        message: "Hi Arjun, I have verified your attendance and course progress (78% completion). I am proposing a batch shift to Agentic Systems Weekend Cohort for Admin review. Your historical progress will be fully preserved.",
        timestamp: "10:15 AM",
      },
    ],
    proposedAction: {
      type: "batch_move",
      targetBatchName: "Agentic Systems Bootcamp (Weekend Cohort)",
      status: "proposed",
    },
  },
  {
    id: "tkt-1083",
    ticketNumber: "TKT-1083",
    studentId: "usr-student-5",
    studentName: "Simran Kaur",
    studentEmail: "simran.k@example.com",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "extension",
    priority: "high",
    status: "pending",
    assignedAgent: "Nikhil Joshi",
    subject: "Medical pause: Requesting 30-day access validity extension",
    createdAt: "Yesterday, 02:40 PM",
    messages: [
      {
        id: "msg-3",
        sender: "Simran Kaur",
        role: "student",
        message: "I was hospitalized last week with dengue. Could my access expiry date be extended by 30 days so I can finish the milestones?",
        timestamp: "Yesterday, 02:40 PM",
      },
    ],
    proposedAction: {
      type: "validity_extension",
      extensionDays: 30,
      status: "proposed",
    },
  },
];

export const MOCK_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "txn-901",
    orderId: "order_Qz89104",
    paymentId: "pay_Kla98012",
    studentName: "Arjun Mehta",
    studentEmail: "arjun.m@learner.ai",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    amountRupees: 64999,
    status: "captured",
    method: "UPI (Google Pay)",
    date: "28 Aug 2026, 02:15 PM",
    invoiceNumber: "INV-2026-0891",
  },
  {
    id: "txn-902",
    orderId: "order_Qz89105",
    paymentId: "pay_Kla98013",
    studentName: "Pooja Hegde",
    studentEmail: "pooja.h@example.com",
    courseTitle: "Autonomous Multi-Agent Architectures",
    batchName: "Agentic Systems Bootcamp",
    amountRupees: 49999,
    status: "captured",
    method: "Razorpay NetBanking",
    date: "05 Oct 2026, 11:45 AM",
    invoiceNumber: "INV-2026-0924",
  },
  {
    id: "txn-903",
    orderId: "order_Qz89106",
    paymentId: "pay_Kla98014",
    studentName: "Devendra Patel",
    studentEmail: "dev.patel@tech.in",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 8 (Replay Only)",
    amountRupees: 39999,
    status: "captured",
    method: "Credit Card",
    date: "10 Oct 2026, 06:20 PM",
    invoiceNumber: "INV-2026-0955",
  },
];

export const MOCK_CERTIFICATES: CertificateRecord[] = [
  {
    id: "cert-2026-1",
    certificateNumber: "APEX-AI-2026-891",
    studentName: "Arjun Mehta",
    studentId: "usr-student-1",
    courseTitle: "Full-Stack AI & LLM Systems Engineering",
    batchName: "Cohort 7 (Live + Replay)",
    issueDate: "12 Oct 2026",
    verificationCode: "VF-9812-AI",
    gradeAwarded: "Distinction (95%)",
    pdfUrl: "/assets/cert-sample.pdf",
  },
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    actorName: "Dr. Vikram Sethi",
    actorRole: "Super Admin",
    action: "Updated OpenAI API Provider Endpoint",
    targetResource: "System Integrations",
    details: "Switched default LLM inference model to gpt-4o-2026-08-06 with 128k context.",
    ipAddress: "103.24.120.4",
    timestamp: "Today, 08:30 AM",
    status: "success",
  },
  {
    id: "log-2",
    actorName: "Ananya Iyer",
    actorRole: "Admin",
    action: "Approved Batch Move for Arjun Mehta",
    targetResource: "Batch: Agentic Systems Weekend",
    details: "Student moved from Cohort 7 Weekday to Weekend Bootcamp per ticket TKT-1082.",
    ipAddress: "49.207.210.15",
    timestamp: "Today, 10:20 AM",
    status: "success",
  },
  {
    id: "log-3",
    actorName: "System Security Sentinel",
    actorRole: "Automated",
    action: "Blocked Multiple Failed 2FA Attempts",
    targetResource: "usr-teacher-9",
    details: "5 consecutive invalid TOTP attempts detected from unknown IP.",
    ipAddress: "185.220.101.5",
    timestamp: "Yesterday, 11:45 PM",
    status: "warning",
  },
];

// Service with simulated updates
class MockDataService {
  getCourses() { return [...MOCK_COURSES]; }
  getBatches() { return [...MOCK_BATCHES]; }
  getLiveClasses() { return [...MOCK_LIVE_CLASSES]; }
  getRecordings() { return [...MOCK_RECORDINGS]; }
  getDoubts() { return [...MOCK_DOUBTS]; }
  getSubmissions() { return [...MOCK_SUBMISSIONS]; }
  getTickets() { return [...MOCK_TICKETS]; }
  getTransactions() { return [...MOCK_TRANSACTIONS]; }
  getCertificates() { return [...MOCK_CERTIFICATES]; }
  getAuditLogs() { return [...MOCK_AUDIT_LOGS]; }

  addDoubt(doubt: Omit<StudentDoubt, "id" | "createdAt">): StudentDoubt {
    const newDoubt: StudentDoubt = {
      ...doubt,
      id: `doubt-${Date.now()}`,
      createdAt: "Just now",
    };
    MOCK_DOUBTS.unshift(newDoubt);
    return newDoubt;
  }

  saveDraftGrade(submissionId: string, rubricScores: any[], feedback: string): boolean {
    const sub = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
    if (sub) {
      sub.rubricScores = rubricScores;
      sub.evaluatorFeedback = feedback;
      sub.status = "draft";
      return true;
    }
    return false;
  }

  submitGrade(submissionId: string, rubricScores: any[], feedback: string): boolean {
    const sub = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
    if (sub) {
      sub.rubricScores = rubricScores;
      sub.evaluatorFeedback = feedback;
      const total = rubricScores.reduce((acc, curr) => acc + (curr.score || 0), sub.objectiveScore);
      sub.totalScore = total;
      sub.status = "graded";
      return true;
    }
    return false;
  }

  returnSubmissionForResubmission(submissionId: string, note: string): boolean {
    const sub = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
    if (sub) {
      sub.returnedForResubmission = true;
      sub.resubmissionNote = note;
      sub.status = "draft";
      return true;
    }
    return false;
  }

  resolveReassessment(submissionId: string, newScore: number, explanation: string, action: "upheld" | "adjusted"): boolean {
    const sub = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
    if (sub) {
      if (action === "adjusted") {
        sub.totalScore = newScore;
      }
      sub.status = "graded";
      if (!sub.gradeHistory) sub.gradeHistory = [];
      sub.gradeHistory.push({
        date: "Just now",
        evaluator: "Kavita Rao",
        totalScore: sub.totalScore,
        changeReason: `Reassessment ${action.toUpperCase()}: ${explanation}`
      });
      return true;
    }
    return false;
  }

  releaseGrade(submissionId: string): boolean {
    const sub = MOCK_SUBMISSIONS.find((s) => s.id === submissionId);
    if (sub) {
      sub.releasedToStudent = true;
      return true;
    }
    return false;
  }

  releaseAllGrades(testId?: string): number {
    let count = 0;
    MOCK_SUBMISSIONS.forEach((s) => {
      if ((!testId || s.testId === testId) && s.status === "graded") {
        s.releasedToStudent = true;
        count++;
      }
    });
    return count;
  }

  updateTicketStatus(ticketId: string, status: "open" | "pending" | "resolved"): boolean {
    const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      return true;
    }
    return false;
  }
}

export const mockDataService = new MockDataService();
