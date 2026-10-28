import type {
  EvaluatorAssessment,
  StudentSubmission,
  ReassessmentRequest,
  EvaluatorNotification,
  EvaluatorActivity,
  EvaluatorProfile,
  EvaluatorSettings,
  Rubric,
} from "../types"

export const initialEvaluatorProfile: EvaluatorProfile = {
  id: "eval-01",
  name: "Dr. Alistair Vance",
  role: "Combined Evaluator",
  title: "Senior Academic Assessor & Exam Board Fellow",
  email: "a.vance@quantum-lms.edu",
  avatar: "/assets/srimanth.png",
  department: "School of AI, Distributed Systems & Software Engineering",
  assignedSpecializations: [
    "Distributed Systems",
    "Deep Learning Architectures",
    "Cloud Computing & DevOps",
    "Systems Security & Viva Assessment",
  ],
  assignedCourses: [
    "CS401: Advanced Distributed & Cloud Systems",
    "AI302: Deep Learning & Neural Architectures",
    "SE310: Full-Stack Web Systems & DevOps",
    "CS408: Operating Systems & System Programming",
  ],
}

// -------------------------------------------------------------
// Official Rubrics (Read-only for Evaluator)
// -------------------------------------------------------------
export const mockRubrics: Record<string, Rubric> = {
  "rubric-project-cloud": {
    id: "rubric-project-cloud",
    name: "Microservices & Cloud Systems Capstone Rubric",
    version: "v3.2 (Approved by Academic Senate)",
    totalMarks: 100,
    assessmentType: "Project",
    isOfficialLocked: true,
    partialCreditRules: "Partial credit permitted up to 0.5 increments per criterion level.",
    instructions:
      "Assess architecture robustness, container orchestration, zero-downtime deployment pipelines, and code clarity. Every criterion requires specific rationale.",
    criteria: [
      {
        id: "c1",
        name: "Architectural Design & Scalability",
        description: "Decoupled microservice topology, event-driven messaging, fault tolerance, and load distribution.",
        maxMarks: 30,
        weightPercentage: 30,
        partialCreditAllowed: true,
        markingInstructions: "Deduct 5 marks if inter-service sync calls create circular dependencies.",
        performanceLevels: [
          { level: "Exemplary", points: 30, description: "Highly decoupled, gRPC/Kafka pipeline, circuit breakers, and automatic failover." },
          { level: "Proficient", points: 24, description: "Solid microservice structure with minor coupling; robust caching implemented." },
          { level: "Developing", points: 18, description: "Basic service separation; monolithic database bottleneck observed." },
          { level: "Novice", points: 10, description: "Tight coupling resembling distributed monolith; missing fault tolerance." },
        ],
      },
      {
        id: "c2",
        name: "Implementation Quality & Code Cleanliness",
        description: "Adherence to idiomatic patterns, modularity, type safety, error wrapping, and test coverage.",
        maxMarks: 25,
        weightPercentage: 25,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 25, description: "Immaculate modular code, >85% unit/integration tests, zero unhandled errors." },
          { level: "Proficient", points: 20, description: "Clean code with standard abstractions; >70% test coverage." },
          { level: "Developing", points: 15, description: "Working code but inconsistent conventions; minimal automated tests." },
          { level: "Novice", points: 8, description: "Hardcoded credentials, scattered business logic, lack of tests." },
        ],
      },
      {
        id: "c3",
        name: "Containerization & CI/CD Pipelines",
        description: "Docker multi-stage builds, Kubernetes manifests/Helm charts, and automated deployment pipelines.",
        maxMarks: 25,
        weightPercentage: 25,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 25, description: "Production-ready Helm charts, minimal distroless images, automated GitHub Actions workflow." },
          { level: "Proficient", points: 20, description: "Well-structured Dockerfiles and working Kubernetes deployment manifests." },
          { level: "Developing", points: 14, description: "Single-stage large container images, basic docker-compose only." },
          { level: "Novice", points: 7, description: "Container build fails or missing deployment automation." },
        ],
      },
      {
        id: "c4",
        name: "Technical Documentation & Observability",
        description: "Architecture diagrams, OpenAPI specifications, Prometheus/Grafana telemetrics integration.",
        maxMarks: 20,
        weightPercentage: 20,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 20, description: "Comprehensive C4 architecture diagrams, Swagger specs, OpenTelemetry tracing." },
          { level: "Proficient", points: 16, description: "Detailed README, API endpoints cataloged, standard log aggregations." },
          { level: "Developing", points: 11, description: "High-level summary with incomplete setup instructions." },
          { level: "Novice", points: 5, description: "Minimal or generic template documentation." },
        ],
      },
    ],
  },

  "rubric-assignment-transformer": {
    id: "rubric-assignment-transformer",
    name: "Transformer Architecture & Attention Grading Rubric",
    version: "v2.1",
    totalMarks: 50,
    assessmentType: "Assignment",
    isOfficialLocked: true,
    partialCreditRules: "Full and partial marks supported per criterion; justify score deviations.",
    instructions: "Evaluate multi-head scaled dot-product attention derivation and PyTorch custom head implementation.",
    criteria: [
      {
        id: "ta1",
        name: "Mathematical Formulation & Derivation",
        description: "Correct derivation of scaled dot-product attention, softmax stabilization, and causal masking.",
        maxMarks: 15,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 15, description: "Flawless mathematical rigor, matrix dimensional proofs included." },
          { level: "Proficient", points: 12, description: "Accurate formulas with minor algebraic notation skips." },
          { level: "Developing", points: 8, description: "Incomplete derivation or confusion between self-attention and cross-attention." },
          { level: "Novice", points: 4, description: "Incorrect equations or copied without explanatory derivation." },
        ],
      },
      {
        id: "ta2",
        name: "PyTorch Module Implementation",
        description: "Custom PyTorch layer implementing multi-head projection, einsum/bmm scaling, and residual dropout.",
        maxMarks: 20,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 20, description: "Vectorized tensor operations, efficient head splitting, numerical stability." },
          { level: "Proficient", points: 16, description: "Functional implementation with slight inefficiency in tensor reshaping." },
          { level: "Developing", points: 11, description: "Module runs but has shape mismatch on batched variable length sequences." },
          { level: "Novice", points: 5, description: "Runtime errors during forward pass or gradient propagation failure." },
        ],
      },
      {
        id: "ta3",
        name: "Empirical Analysis & Attention Map Visualizations",
        description: "Heatmaps of attention weights across heads, layer-wise entropy analysis, and convergence graphs.",
        maxMarks: 15,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 15, description: "Insightful heatmaps showing syntactic vs semantic token binding across heads." },
          { level: "Proficient", points: 12, description: "Clear visualizations with correct token alignment and basic interpretation." },
          { level: "Developing", points: 8, description: "Heatmaps provided but missing interpretive depth." },
          { level: "Novice", points: 3, description: "Missing plots or unreadable unlabelled visual data." },
        ],
      },
    ],
  },

  "rubric-viva-algorithms": {
    id: "rubric-viva-algorithms",
    name: "System Defense & Algorithms Oral Viva Rubric",
    version: "v4.0",
    totalMarks: 30,
    assessmentType: "Viva Assessment",
    isOfficialLocked: true,
    partialCreditRules: "Marked on 5-point scale per criterion.",
    instructions: "Live 20-minute oral defense examination covering consensus algorithms, deadlock resolution, and algorithmic trade-offs.",
    criteria: [
      {
        id: "va1",
        name: "Theoretical Depth & Algorithm Fluency",
        description: "Ability to explain Paxos, Raft leader election, and log compaction without hesitation.",
        maxMarks: 10,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 10, description: "Deep conceptual mastery, explains split-brain mitigation instantly." },
          { level: "Proficient", points: 8, description: "Answers all core questions accurately with slight prompting on edge cases." },
          { level: "Developing", points: 5, description: "Basic understanding; struggles with split-vote randomized timers." },
          { level: "Novice", points: 2, description: "Unable to explain core protocol steps." },
        ],
      },
      {
        id: "va2",
        name: "Problem-Solving & Failure Scenario Response",
        description: "Response to hypothetical network partitions, Byzantine nodes, and cascading latency spikes.",
        maxMarks: 10,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 10, description: "Systematic architectural reasoning and graceful degradation strategies." },
          { level: "Proficient", points: 8, description: "Identifies primary bottlenecks and proposes viable remediation." },
          { level: "Developing", points: 5, description: "Hesitant; requires substantial hints to diagnose partition behavior." },
          { level: "Novice", points: 2, description: "Incoherent troubleshooting approach." },
        ],
      },
      {
        id: "va3",
        name: "Technical Articulation & Defense Demeanor",
        description: "Clarity of verbal expression, concise technical vocabulary, and responsiveness to critique.",
        maxMarks: 10,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 10, description: "Professional, lucid, and precise defense." },
          { level: "Proficient", points: 8, description: "Clear communication with minor over-elaboration." },
          { level: "Developing", points: 5, description: "Vague or imprecise terminology used frequently." },
          { level: "Novice", points: 2, description: "Poor articulation or defensive reaction to probing questions." },
        ],
      },
    ],
  },

  "rubric-practical-cuda": {
    id: "rubric-practical-cuda",
    name: "GPU CUDA Kernel Practical Examination Rubric",
    version: "v1.8",
    totalMarks: 40,
    assessmentType: "Practical Examination",
    isOfficialLocked: true,
    partialCreditRules: "Benchmark speedup and memory coalesce rules strictly enforced.",
    instructions: "Evaluate shared memory tiling, thread divergence mitigation, and memory bandwidth utilization.",
    criteria: [
      {
        id: "cuda1",
        name: "Kernel Execution Correctness",
        description: "Numerical parity with CPU reference implementation for matrix-matrix multiplication.",
        maxMarks: 15,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 15, description: "Zero epsilon delta across arbitrary floating-point matrix sizes." },
          { level: "Proficient", points: 12, description: "Exact match for power-of-two dimensions, edge case padding needed." },
          { level: "Developing", points: 8, description: "Runs but produces numerical drift due to float precision accumulation." },
          { level: "Novice", points: 3, description: "CUDA launch error or incorrect index boundary math." },
        ],
      },
      {
        id: "cuda2",
        name: "Memory Hierarchy & Shared Tiling",
        description: "Effective utilization of __shared__ cache, bank conflict elimination, and coalesced global loads.",
        maxMarks: 15,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 15, description: "Shared memory tiling with zero 32-way bank conflicts verified via nvprof." },
          { level: "Proficient", points: 12, description: "Shared memory tiling implemented with minimal bank contention." },
          { level: "Developing", points: 7, description: "Naive global memory reads inside compute loops without caching." },
          { level: "Novice", points: 2, description: "No shared memory utilized." },
        ],
      },
      {
        id: "cuda3",
        name: "Occupancy & Benchmark Speedup",
        description: "Achieved GFLOPS throughput against target hardware baseline and warp efficiency.",
        maxMarks: 10,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 10, description: ">15x speedup over sequential CPU benchmark with >80% warp occupancy." },
          { level: "Proficient", points: 8, description: "10x-14x speedup over CPU with acceptable warp occupancy." },
          { level: "Developing", points: 5, description: "3x-9x speedup; noticeable warp divergence due to branches." },
          { level: "Novice", points: 1, description: "Slower than or equivalent to multi-threaded CPU." },
        ],
      },
    ],
  },

  "rubric-generic": {
    id: "rubric-generic",
    name: "Standard Academic Evaluation Rubric",
    version: "v2.0",
    totalMarks: 50,
    assessmentType: "Assignment",
    isOfficialLocked: true,
    partialCreditRules: "Marks awarded proportionately based on completeness and accuracy.",
    instructions: "Evaluate conceptual comprehension, technical precision, and analytical depth.",
    criteria: [
      {
        id: "gen1",
        name: "Technical Accuracy & Completeness",
        description: "All parts of the prompt answered thoroughly and with correct technical principles.",
        maxMarks: 25,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 25, description: "Comprehensive, rigorous, and fully accurate." },
          { level: "Proficient", points: 20, description: "Accurate with minor non-critical omissions." },
          { level: "Developing", points: 15, description: "Partially complete; some misconceptions present." },
          { level: "Novice", points: 5, description: "Major factual or conceptual errors." },
        ],
      },
      {
        id: "gen2",
        name: "Methodology & Critical Analysis",
        description: "Logical structuring, validation of hypotheses, and defense of technical choices.",
        maxMarks: 15,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 15, description: "Exceptional analysis with compelling evidence and trade-off evaluation." },
          { level: "Proficient", points: 12, description: "Sound methodology with structured justification." },
          { level: "Developing", points: 8, description: "Superficial analysis with unverified assertions." },
          { level: "Novice", points: 3, description: "Lack of reasoning or unsubstantiated claims." },
        ],
      },
      {
        id: "gen3",
        name: "Presentation & Professional Standards",
        description: "Organization, code formatting, clear diagrams, and clarity of documentation.",
        maxMarks: 10,
        partialCreditAllowed: true,
        performanceLevels: [
          { level: "Exemplary", points: 10, description: "Publication quality presentation, clean code formatting and typography." },
          { level: "Proficient", points: 8, description: "Clean presentation following standard academic conventions." },
          { level: "Developing", points: 5, description: "Disorganized formatting or unformatted code snippets." },
          { level: "Novice", points: 2, description: "Haphazard submission lacking structure." },
        ],
      },
    ],
  },
}

// -------------------------------------------------------------
// 10 Assigned Assessments (Assigned by Admin to Evaluator)
// -------------------------------------------------------------
export const initialAssessments: EvaluatorAssessment[] = [
  {
    id: "asm-01",
    title: "Cloud Architecture Microservices Capstone",
    code: "CS401-CAP",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    batch: "Cohort 2026 · Group A",
    type: "Project",
    description: "Multi-tenant cloud architecture project with autonomous service discovery, Redis pub/sub, and Kubernetes Helm automation.",
    instructions: "Evaluate the submitted GitHub repository, architectural report, and deployment telemetry. Ensure each criterion in the official rubric is scored.",
    maxMarks: 100,
    rubric: mockRubrics["rubric-project-cloud"],
    assignedStudentsCount: 28,
    submissionCount: 26,
    evaluatedCount: 19,
    pendingCount: 7,
    deadline: "2026-10-30T23:59:00Z",
    status: "Active",
  },
  {
    id: "asm-02",
    title: "Transformer Attention Mechanism Analysis",
    code: "AI302-A2",
    course: "Deep Learning & Neural Architectures",
    courseCode: "AI302",
    batch: "M.Sc. AI Core 2026",
    type: "Assignment",
    description: "Detailed mathematical derivation of multi-head scaled dot-product attention and PyTorch implementation with attention maps.",
    instructions: "Verify tensor dimensions, attention head split efficiency, and interpretation of self-attention entropy over sequence length.",
    maxMarks: 50,
    rubric: mockRubrics["rubric-assignment-transformer"],
    assignedStudentsCount: 34,
    submissionCount: 32,
    evaluatedCount: 28,
    pendingCount: 4,
    deadline: "2026-10-28T18:00:00Z",
    status: "Active",
  },
  {
    id: "asm-03",
    title: "Distributed Consensus & Raft Protocol Quiz",
    code: "CS401-Q1",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    batch: "Cohort 2026 · Group A",
    type: "Quiz",
    description: "Technical quiz assessing Raft leader election, log replication edge cases, and safety invariants.",
    instructions: "Multiple-choice questions are auto-scored. Grade the two subjective design questions (Split-brain recovery & compaction invariants).",
    maxMarks: 25,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 28,
    submissionCount: 28,
    evaluatedCount: 22,
    pendingCount: 6,
    deadline: "2026-10-27T12:00:00Z",
    status: "Active",
  },
  {
    id: "asm-04",
    title: "Midterm: Deep Neural Network Optimization",
    code: "AI302-MID",
    course: "Deep Learning & Neural Architectures",
    courseCode: "AI302",
    batch: "M.Sc. AI Core 2026",
    type: "Midterm Examination",
    description: "Formal midterm examination comprising gradient explosion mitigation, AdamW vs SGD momentum analysis, and weight normalization.",
    instructions: "Award question-by-question marks based on formal answer keys and partial credit guidelines. Calculate total automatically.",
    maxMarks: 75,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 34,
    submissionCount: 34,
    evaluatedCount: 30,
    pendingCount: 4,
    deadline: "2026-10-29T15:00:00Z",
    status: "Active",
  },
  {
    id: "asm-05",
    title: "Concurrent Memory Management & Virtual Paging",
    code: "CS408-FIN",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    batch: "B.Tech Year 4 Computer Science",
    type: "Final Examination",
    description: "Comprehensive final examination covering page fault handlers, lock-free queues, and TLB shootdown synchronization.",
    instructions: "Full question-level marks must be validated. Double-check synchronization race condition answers.",
    maxMarks: 100,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 30,
    submissionCount: 30,
    evaluatedCount: 25,
    pendingCount: 5,
    deadline: "2026-11-04T17:00:00Z",
    status: "Active",
  },
  {
    id: "asm-06",
    title: "GPU Kernel Acceleration with CUDA",
    code: "CS408-PRAC",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    batch: "B.Tech Year 4 Systems Track",
    type: "Practical Examination",
    description: "Live practical examination where students submit CUDA C++ kernels optimizing 2D GEMM matrix multiplication.",
    instructions: "Evaluate shared memory tiling implementation, bank conflict mitigation, and verify speedup results against baseline.",
    maxMarks: 40,
    rubric: mockRubrics["rubric-practical-cuda"],
    assignedStudentsCount: 24,
    submissionCount: 23,
    evaluatedCount: 18,
    pendingCount: 5,
    deadline: "2026-11-01T20:00:00Z",
    status: "Active",
  },
  {
    id: "asm-07",
    title: "Kubernetes Ingress & Helm Deployments Lab",
    code: "SE310-LAB",
    course: "Full-Stack Web Systems & DevOps",
    courseCode: "SE310",
    batch: "Cohort Autumn 2026",
    type: "Lab Assessment",
    description: "Hands-on lab deploying Traefik ingress controller, TLS certificate automation, and Helm templating.",
    instructions: "Review YAML configurations, helm lint logs, and curl verify outputs in the student's lab report.",
    maxMarks: 30,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 26,
    submissionCount: 25,
    evaluatedCount: 20,
    pendingCount: 5,
    deadline: "2026-11-02T19:00:00Z",
    status: "Active",
  },
  {
    id: "asm-08",
    title: "Zero Trust Architecture & Security Posture",
    code: "CS401-PRES",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    batch: "Cohort 2026 · Group A",
    type: "Presentation",
    description: "Recorded presentation and slide deck dissecting Google BeyondCorp and mTLS identity federation.",
    instructions: "Review submitted video recording link and slide deck. Award marks according to oral communication and threat model depth.",
    maxMarks: 50,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 28,
    submissionCount: 27,
    evaluatedCount: 24,
    pendingCount: 3,
    deadline: "2026-10-31T16:00:00Z",
    status: "Active",
  },
  {
    id: "asm-09",
    title: "Advanced Algorithms & System Defense Viva Voce",
    code: "CS408-VIVA",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    batch: "B.Tech Year 4 Systems Track",
    type: "Viva Assessment",
    description: "20-minute synchronous oral viva defense on consensus protocols, synchronization primitives, and cache coherency.",
    instructions: "Record viva outcome, theoretical depth score, and technical articulation score according to the oral defense rubric.",
    maxMarks: 30,
    rubric: mockRubrics["rubric-viva-algorithms"],
    assignedStudentsCount: 22,
    submissionCount: 22,
    evaluatedCount: 17,
    pendingCount: 5,
    deadline: "2026-10-27T16:30:00Z",
    status: "Active",
  },
  {
    id: "asm-10",
    title: "RESTful API High-Load Stress Testing",
    code: "SE310-T1",
    course: "Full-Stack Web Systems & DevOps",
    courseCode: "SE310",
    batch: "Cohort Autumn 2026",
    type: "Test",
    description: "Benchmarking k6 load testing scripts, p99 latency profiling, and database connection pool optimization.",
    instructions: "Evaluate the student's load test harness, latency distribution charts, and connection leak remediation report.",
    maxMarks: 40,
    rubric: mockRubrics["rubric-generic"],
    assignedStudentsCount: 26,
    submissionCount: 26,
    evaluatedCount: 26,
    pendingCount: 0,
    deadline: "2026-10-24T23:59:00Z",
    status: "Completed",
  },
]

// -------------------------------------------------------------
// Realistic Student Submissions
// -------------------------------------------------------------
export const initialSubmissions: StudentSubmission[] = [
  // 1. Cloud Project - Draft Saved (Ready to resume grading)
  {
    id: "sub-101",
    studentId: "usr-s1",
    studentName: "Arjun Mehta",
    studentRoll: "CS26-042",
    studentAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-01",
    assessmentTitle: "Cloud Architecture Microservices Capstone",
    assessmentType: "Project",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    submissionDate: "2026-10-25T14:32:00Z",
    version: "v1.2",
    status: "Draft Saved",
    releaseStatus: "Draft",
    maxMarks: 100,
    projectRepoUrl: "https://github.com/arjunmehta/quantum-microservices-mesh",
    projectDemoUrl: "https://mesh.arjun-cloud.quantum-lms.edu",
    previousAttemptsCount: 1,
    files: [
      {
        id: "f-101-1",
        name: "Architectural_Design_Report.pdf",
        size: "3.4 MB",
        type: "pdf",
        pageCount: 14,
        content: `QUANTUM LMS CAPSTONE SUBMISSION
Course: CS401 Advanced Distributed & Cloud Systems
Author: Arjun Mehta (Roll: CS26-042)
Project Title: Resilient Cloud Microservices with Event-Driven Sagas

1. EXECUTIVE SUMMARY
This project presents an enterprise microservice architecture operating across multi-zone Kubernetes clusters. We decouple customer order processing, inventory reconciliation, and billing via an asynchronous event bus managed by Apache Kafka with schema registry enforcement.

2. ARCHITECTURE DIAGRAM & TOPOLOGY
Our cluster utilizes Istio service mesh for mutual TLS (mTLS) enforcement and automatic canary routing. Inter-service RPC leverages gRPC with protobuf serialization to achieve sub-4ms internal hop latencies.

Key Components:
- API Gateway: Envoy proxy running rate-limiting filters (Token Bucket algorithm).
- Order Service: Go 1.24 service utilizing transactional outbox pattern to guarantee at-least-once message publication to Kafka.
- Inventory Service: Rust microservice with in-memory Redis cluster for atomic stock reservations.
- Billing Service: Node.js worker pool with idempotency keys storing transaction receipts in PostgreSQL.

3. DISASTER RECOVERY & FAULT TOLERANCE
We tested automatic pod disruption budgets and chaos testing via Chaos Mesh:
- Killing 50% of Inventory pods under 12,000 req/sec caused zero 5xx errors due to Istio circuit breakers and retry policies with exponential backoff.
- Database replica failover completed in 3.8 seconds with automatic DNS pointer update.

4. OBSERVABILITY & TELEMETRY
Distributed tracing is handled by OpenTelemetry exporters pushing spans to Jaeger. Prometheus scrapes custom business metrics (orders_created_total, saga_rollback_seconds) displayed on Grafana dashboards.`,
      },
      {
        id: "f-101-2",
        name: "OrderService_OutboxPublisher.go",
        size: "18.2 KB",
        type: "code",
        language: "go",
        content: `package outbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type OutboxRecord struct {
	ID        string    \`json:"id"\`
	Topic     string    \`json:"topic"\`
	Payload   []byte    \`json:"payload"\`
	CreatedAt time.Time \`json:"created_at"\`
	Status    string    \`json:"status"\`
}

type OutboxWorker struct {
	db     *sql.DB
	writer *kafka.Writer
	logger *zap.Logger
}

// StartRelayLoop sweeps unpublished outbox events and publishes to Kafka with retry logic
func (w *OutboxWorker) StartRelayLoop(ctx context.Context, sweepInterval time.Duration) {
	ticker := time.NewTicker(sweepInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Shutting down transactional outbox worker")
			return
		case <-ticker.C:
			if err := w.processPendingRecords(ctx); err != nil {
				w.logger.Error("Failed processing outbox batch", zap.Error(err))
			}
		}
	}
}

func (w *OutboxWorker) processPendingRecords(ctx context.Context) error {
	tx, err := w.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return fmt.Errorf("begin outbox tx: %w", err)
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, \`
		SELECT id, topic, payload FROM outbox_events 
		WHERE status = 'PENDING' 
		ORDER BY created_at ASC 
		LIMIT 100 FOR UPDATE SKIP LOCKED
	\`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var records []OutboxRecord
	for rows.Next() {
		var r OutboxRecord
		if err := rows.Scan(&r.ID, &r.Topic, &r.Payload); err != nil {
			return err
		}
		records = append(records, r)
	}

	for _, rec := range records {
		msg := kafka.Message{
			Topic: rec.Topic,
			Key:   []byte(rec.ID),
			Value: rec.Payload,
			Time:  time.Now(),
		}
		if err := w.writer.WriteMessages(ctx, msg); err != nil {
			w.logger.Warn("Kafka push failed, will retry next tick", zap.String("id", rec.ID))
			continue
		}
		_, _ = tx.ExecContext(ctx, "UPDATE outbox_events SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1", rec.ID)
	}

	return tx.Commit()
}`,
      },
      {
        id: "f-101-3",
        name: "helm-values-production.yaml",
        size: "6.8 KB",
        type: "code",
        language: "yaml",
        content: `global:
  environment: production
  clusterDomain: cluster.local

microservices:
  orderService:
    replicaCount: 5
    autoscaling:
      enabled: true
      minReplicas: 3
      maxReplicas: 20
      targetCPUUtilizationPercentage: 75
      targetMemoryUtilizationPercentage: 80
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 256Mi
    env:
      - name: DB_MAX_OPEN_CONNS
        value: "50"
      - name: KAFKA_BROKERS
        value: "kafka-cluster-kafka-bootstrap:9092"
    serviceAccount:
      create: true
      name: order-service-sa
    podDisruptionBudget:
      minAvailable: 2`,
      },
    ],
    draftEvaluation: {
      id: "eval-draft-101",
      submissionId: "sub-101",
      assessmentId: "asm-01",
      evaluatorId: "eval-01",
      evaluatorName: "Dr. Alistair Vance",
      timestamp: "2026-10-25T17:15:00Z",
      status: "Draft",
      releaseStatus: "Draft",
      totalAwardedMarks: 88,
      maxMarks: 100,
      criterionScores: [
        {
          criterionId: "c1",
          criterionName: "Architectural Design & Scalability",
          awardedMarks: 28,
          maxMarks: 30,
          feedback: "Exemplary implementation of Transactional Outbox pattern with SKIP LOCKED semantics. Very clean decoupling.",
        },
        {
          criterionId: "c2",
          criterionName: "Implementation Quality & Code Cleanliness",
          awardedMarks: 22,
          maxMarks: 25,
          feedback: "Great Go idioms and zap logging. Unit tests for edge-case database rollback should be expanded.",
        },
        {
          criterionId: "c3",
          criterionName: "Containerization & CI/CD Pipelines",
          awardedMarks: 21,
          maxMarks: 25,
          feedback: "Helm charts are well organized; consider adding Kyverno security policy validation.",
        },
        {
          criterionId: "c4",
          criterionName: "Technical Documentation & Observability",
          awardedMarks: 17,
          maxMarks: 20,
          feedback: "Report is comprehensive. Grafana dashboard JSON models verified.",
        },
      ],
      overallFeedback: "Solid capstone submission demonstrating production-grade microservice architectural maturity. The transactional outbox pattern effectively solves dual-write distributed anomalies.",
      strengths: "Transactional outbox implementation; thorough chaos mesh failover testing; clean Helm charts.",
      areasForImprovement: "Expand unit test mock fixtures for Kafka transient network partitions.",
      suggestions: "Investigate Redpanda or Kafka KRaft mode for simpler consensus topology.",
      lastSavedAt: "2026-10-25T17:15:00Z",
    },
  },

  // 2. Transformer Assignment - Submitted (Pending Evaluation)
  {
    id: "sub-102",
    studentId: "usr-s2",
    studentName: "Priya Patel",
    studentRoll: "AI26-108",
    studentAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-02",
    assessmentTitle: "Transformer Attention Mechanism Analysis",
    assessmentType: "Assignment",
    course: "Deep Learning & Neural Architectures",
    courseCode: "AI302",
    submissionDate: "2026-10-26T06:14:00Z",
    version: "v1.0",
    status: "Submitted",
    releaseStatus: "Draft",
    maxMarks: 50,
    files: [
      {
        id: "f-102-1",
        name: "multi_head_attention.py",
        size: "9.2 KB",
        type: "code",
        language: "python",
        content: `import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiHeadAttentionLayer(nn.Module):
    """
    Scaled Dot-Product Multi-Head Attention layer implemented from scratch.
    Equation: Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) * V
    """
    def __init__(self, d_model: int = 512, num_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Linear projections for Queries, Keys, Values
        self.w_q = nn.Linear(d_model, d_model, bias=False)
        self.w_k = nn.Linear(d_model, d_model, bias=False)
        self.w_v = nn.Linear(d_model, d_model, bias=False)
        self.w_o = nn.Linear(d_model, d_model, bias=False)
        
        self.dropout = nn.Dropout(dropout)
        self.scale = math.sqrt(self.d_k)
        
    def forward(self, q, k, v, mask=None):
        batch_size = q.size(0)
        
        # 1. Linear projections & split into num_heads
        # Output shape: [batch_size, num_heads, seq_len, d_k]
        q = self.w_q(q).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        k = self.w_k(k).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        v = self.w_v(v).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # 2. Scaled Dot-Product Attention: (Q @ K^T) / sqrt(d_k)
        scores = torch.matmul(q, k.transpose(-2, -1)) / self.scale
        
        if mask is not None:
            # Apply causal or padding mask (-1e9 for numerical stability)
            scores = scores.masked_fill(mask == 0, -1e9)
            
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)
        
        # 3. Context aggregation: Weights @ V
        context = torch.matmul(attn_weights, v)
        
        # 4. Concatenate heads and project out
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        output = self.w_o(context)
        
        return output, attn_weights`,
      },
      {
        id: "f-102-2",
        name: "Attention_Entropy_Derivation.pdf",
        size: "1.8 MB",
        type: "pdf",
        pageCount: 6,
        content: `RESEARCH NOTE: ATTENTION ENTROPY & SCALED DOT-PRODUCT GRADIENTS
Author: Priya Patel (AI26-108)

1. Softmax Gradient Stabilization
Why divide by sqrt(d_k)?
Let q_i, k_j ~ N(0, 1) be independent random variables.
The inner product z = sum_{l=1}^{d_k} q_l * k_l has expectation E[z] = 0 and variance Var(z) = d_k.
As d_k grows large (e.g. 64 or 128), variance scales up proportionally. Without scaling, inner products have large magnitude, pushing the softmax function into regions with near-zero gradients (saturation).
Dividing by sqrt(d_k) normalizes the variance to Var(z / sqrt(d_k)) = 1, maintaining healthy gradient flow.

2. Empirical Entropy Across Layers
Using our custom MultiHeadAttentionLayer on WikiText-103:
- Lower layers (Layers 1-3): Higher entropy (mean ~3.84 nats), attending broadly across full sequence window.
- Upper layers (Layers 9-12): Highly localized entropy (mean ~0.92 nats), converging on syntactic dependents and named entity clusters.`,
      },
    ],
  },

  // 3. Quiz Submissions - Raft Consensus (Subjective Questions need manual grading)
  {
    id: "sub-103",
    studentId: "usr-s3",
    studentName: "Rohan Sharma",
    studentRoll: "CS26-089",
    studentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-03",
    assessmentTitle: "Distributed Consensus & Raft Protocol Quiz",
    assessmentType: "Quiz",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    submissionDate: "2026-10-26T08:45:00Z",
    version: "v1.0",
    status: "Submitted",
    releaseStatus: "Draft",
    maxMarks: 25,
    questionAnswers: [
      {
        id: "q1",
        questionNumber: 1,
        questionText: "Which Raft state does a candidate node transition to upon receiving votes from a strict majority (N/2 + 1) of peers?",
        questionType: "multiple_choice",
        studentAnswer: "Leader state",
        correctAnswer: "Leader state",
        maxMarks: 5,
        assignedForManualGrading: false,
        awardedMarks: 5,
        evaluatorFeedback: "Auto-graded: Correct",
      },
      {
        id: "q2",
        questionNumber: 2,
        questionText: "Under what conditions can a Raft leader safely commit a log entry from a previous term?",
        questionType: "subjective",
        studentAnswer:
          "According to the Raft paper Section 5.4.2, a leader cannot commit an entry from an older term simply by counting replicas. It must commit an entry from its CURRENT term by replicating it to a majority; once an entry from the current term is committed, all preceding log entries in the leader's log are indirectly committed due to the Log Matching Property.",
        maxMarks: 10,
        assignedForManualGrading: true,
      },
      {
        id: "q3",
        questionNumber: 3,
        questionText: "Describe how Raft solves the split-vote dilemma during concurrent leader election attempts.",
        questionType: "subjective",
        studentAnswer:
          "Raft uses randomized election timers chosen randomly from a fixed interval (typically 150ms to 300ms). This spreads out election timeouts so that one server times out first, increments its term, requests votes, and secures a majority before another peer initiates a competing campaign.",
        maxMarks: 10,
        assignedForManualGrading: true,
      },
    ],
    files: [],
  },

  // 4. Reassessment Request Example (Evaluated originally, now contested by student)
  {
    id: "sub-104",
    studentId: "usr-s4",
    studentName: "Kavya Deshmukh",
    studentRoll: "CS26-015",
    studentAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-01",
    assessmentTitle: "Cloud Architecture Microservices Capstone",
    assessmentType: "Project",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    submissionDate: "2026-10-24T18:20:00Z",
    version: "v1.1",
    status: "Reassessment Requested",
    releaseStatus: "Reassessment Pending",
    maxMarks: 100,
    finalMarks: 76,
    projectRepoUrl: "https://github.com/kavyad/cloud-mesh-capstone",
    files: [
      {
        id: "f-104-1",
        name: "Capstone_Architecture_Kavya.pdf",
        size: "2.9 MB",
        type: "pdf",
        pageCount: 12,
        content: `CAPSTONE REPORT: DISTRIBUTED EVENT SOURCING WITH CQRS
Author: Kavya Deshmukh (CS26-015)

1. CQRS Event Sourcing Pattern
We separate write-side command processors from read-side materialized views. All state changes are persisted as immutable domain events in EventStoreDB.

2. Zero-Loss Transaction Guarantee
Read projections are rebuilt asynchronously using projection subscriptions with checkpointing in Redis. In Section 4, we provide benchmark graphs proving 15,000 read ops/sec with eventual consistency convergence under 120ms.`,
      },
    ],
    finalizedEvaluation: {
      id: "eval-fin-104",
      submissionId: "sub-104",
      assessmentId: "asm-01",
      evaluatorId: "eval-01",
      evaluatorName: "Dr. Alistair Vance",
      timestamp: "2026-10-25T11:00:00Z",
      status: "Evaluated",
      releaseStatus: "Evaluated",
      totalAwardedMarks: 76,
      maxMarks: 100,
      criterionScores: [
        {
          criterionId: "c1",
          criterionName: "Architectural Design & Scalability",
          awardedMarks: 24,
          maxMarks: 30,
          feedback: "Solid CQRS setup, but missing formal distributed snapshot recovery documentation.",
        },
        {
          criterionId: "c2",
          criterionName: "Implementation Quality & Code Cleanliness",
          awardedMarks: 20,
          maxMarks: 25,
          feedback: "Clean code structure; integration test suite lacked concurrency race testing.",
        },
        {
          criterionId: "c3",
          criterionName: "Containerization & CI/CD Pipelines",
          awardedMarks: 18,
          maxMarks: 25,
          feedback: "Helm charts lacked resource limits; docker image was single-stage 920MB.",
        },
        {
          criterionId: "c4",
          criterionName: "Technical Documentation & Observability",
          awardedMarks: 14,
          maxMarks: 20,
          feedback: "Observability section omitted Jaeger trace propagation headers in gRPC context.",
        },
      ],
      overallFeedback: "A capable submission with good architectural ambition, but deductions applied for unoptimized Docker image sizes and incomplete trace propagation in the documentation.",
      strengths: "CQRS event store architecture; good command separation.",
      areasForImprovement: "Multi-stage Docker builds to reduce image footprint; gRPC context trace propagation.",
      suggestions: "Use distroless images for production compliance.",
      lastSavedAt: "2026-10-25T11:00:00Z",
      completedAt: "2026-10-25T11:05:00Z",
    },
    reassessmentRequest: {
      id: "re-201",
      submissionId: "sub-104",
      studentId: "usr-s4",
      studentName: "Kavya Deshmukh",
      studentRoll: "CS26-015",
      assessmentId: "asm-01",
      assessmentTitle: "Cloud Architecture Microservices Capstone",
      course: "Advanced Distributed & Cloud Systems",
      requestDate: "2026-10-25T19:30:00Z",
      reason:
        "Respectfully requesting reassessment on Criterion 3 (Containerization) and Criterion 4 (Observability). In repository commit #7f8a92 (dated prior to submission deadline), the multi-stage Dockerfile 'Dockerfile.optimized' reduced the final runtime image to 38MB. Also, gRPC OpenTelemetry metadata interceptors are documented in Appendix B of the PDF (page 11). Kindly review.",
      originalMarks: 76,
      maxMarks: 100,
      originalFeedback:
        "Deductions applied for unoptimized Docker image sizes (920MB) and missing gRPC trace propagation in documentation.",
      status: "Pending",
    },
  },

  // 5. Evaluated (Finalized) Submission - Complete & Locked
  {
    id: "sub-105",
    studentId: "usr-s5",
    studentName: "Vikram Malhotra",
    studentRoll: "CS26-031",
    studentAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-01",
    assessmentTitle: "Cloud Architecture Microservices Capstone",
    assessmentType: "Project",
    course: "Advanced Distributed & Cloud Systems",
    courseCode: "CS401",
    submissionDate: "2026-10-24T12:00:00Z",
    version: "v1.0",
    status: "Evaluated",
    releaseStatus: "Awaiting Release",
    finalMarks: 94,
    maxMarks: 100,
    files: [
      {
        id: "f-105-1",
        name: "Capstone_Architecture_Vikram.pdf",
        size: "4.1 MB",
        type: "pdf",
        pageCount: 16,
        content: "Complete capstone documentation with production zero-trust architecture, automated canary releases, and full Prometheus metrics.",
      },
    ],
    finalizedEvaluation: {
      id: "eval-fin-105",
      submissionId: "sub-105",
      assessmentId: "asm-01",
      evaluatorId: "eval-01",
      evaluatorName: "Dr. Alistair Vance",
      timestamp: "2026-10-25T14:00:00Z",
      status: "Evaluated",
      releaseStatus: "Awaiting Release",
      totalAwardedMarks: 94,
      maxMarks: 100,
      criterionScores: [
        { criterionId: "c1", criterionName: "Architectural Design & Scalability", awardedMarks: 29, maxMarks: 30, feedback: "Outstanding decoupled topology with Kafka KRaft." },
        { criterionId: "c2", criterionName: "Implementation Quality & Code Cleanliness", awardedMarks: 24, maxMarks: 25, feedback: "Excellent Go idioms and 91% test coverage." },
        { criterionId: "c3", criterionName: "Containerization & CI/CD Pipelines", awardedMarks: 23, maxMarks: 25, feedback: "Automated ArgoCD GitOps pipeline verified." },
        { criterionId: "c4", criterionName: "Technical Documentation & Observability", awardedMarks: 18, maxMarks: 20, feedback: "Clear architecture diagrams and OpenAPI 3.1 specs." },
      ],
      overallFeedback: "Exceptional capstone submission demonstrating production-grade microservice architecture, comprehensive GitOps pipelines, and high test coverage.",
      strengths: "GitOps deployment with ArgoCD; automated canary rollback; rigorous test suites.",
      areasForImprovement: "Add benchmark comparison against HTTP/3 transport.",
      suggestions: "Submit project to the Department Annual Engineering Showcase.",
      lastSavedAt: "2026-10-25T14:00:00Z",
      completedAt: "2026-10-25T14:10:00Z",
    },
  },

  // 6. Practical Examination - GPU CUDA Kernel
  {
    id: "sub-106",
    studentId: "usr-s6",
    studentName: "Ananya Sen",
    studentRoll: "CS26-004",
    studentAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-06",
    assessmentTitle: "GPU Kernel Acceleration with CUDA",
    assessmentType: "Practical Examination",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    submissionDate: "2026-10-25T21:10:00Z",
    version: "v1.0",
    status: "Submitted",
    releaseStatus: "Draft",
    maxMarks: 40,
    files: [
      {
        id: "f-106-1",
        name: "sgemm_shared_tiling.cu",
        size: "7.4 KB",
        type: "code",
        language: "cpp",
        content: `#include <cuda_runtime.h>
#include <stdio.h>

#define TILE_SIZE 32

// Optimized Tiled Matrix Multiplication Kernel with Shared Memory
__global__ void MatrixMulSharedKernel(const float* __restrict__ A, 
                                     const float* __restrict__ B, 
                                     float* __restrict__ C, 
                                     int N) {
    // 2D thread and block indices
    int tx = threadIdx.x;
    int ty = threadIdx.y;
    int row = blockIdx.y * TILE_SIZE + ty;
    int col = blockIdx.x * TILE_SIZE + tx;

    // Allocated Shared Memory tiles to eliminate redundant global reads
    __shared__ float s_a[TILE_SIZE][TILE_SIZE + 1]; // +1 padding prevents 32-way bank conflicts
    __shared__ float s_b[TILE_SIZE][TILE_SIZE + 1];

    float sum = 0.0f;
    int numTiles = (N + TILE_SIZE - 1) / TILE_SIZE;

    for (int t = 0; t < numTiles; ++t) {
        // Coalesced global memory loads into shared cache
        if (row < N && (t * TILE_SIZE + tx) < N) {
            s_a[ty][tx] = A[row * N + (t * TILE_SIZE + tx)];
        } else {
            s_a[ty][tx] = 0.0f;
        }

        if (col < N && (t * TILE_SIZE + ty) < N) {
            s_b[ty][tx] = B[(t * TILE_SIZE + ty) * N + col];
        } else {
            s_b[ty][tx] = 0.0f;
        }

        __syncthreads(); // Barrier: Ensure full tile is loaded before compute

        #pragma unroll
        for (int k = 0; k < TILE_SIZE; ++k) {
            sum += s_a[ty][k] * s_b[k][tx];
        }

        __syncthreads(); // Barrier: Prevent tile overwrite during next iteration
    }

    if (row < N && col < N) {
        C[row * N + col] = sum;
    }
}`,
      },
      {
        id: "f-106-2",
        name: "Benchmark_Nvprof_Report.pdf",
        size: "1.1 MB",
        type: "pdf",
        pageCount: 4,
        content: `CUDA PRACTICAL BENCHMARK ANALYSIS
Author: Ananya Sen (Roll: CS26-004)
Target Hardware: NVIDIA RTX 4090 (Ada Lovelace, 24GB VRAM)

1. SPEEDUP COMPARISON
- Baseline CPU Sequential: 8,420 ms (1024x1024 float32)
- CPU OpenMP (16 Threads): 640 ms
- Naive CUDA Kernel (Global memory): 42.1 ms (200x speedup)
- Tiled Shared Kernel with +1 Bank Conflict Padding: 4.82 ms (1,746x speedup)

2. NVPROF PROFILER METRICS
- Shared Memory Bank Conflicts: 0 (confirmed zero serialized warp replays)
- Achieved Occupancy: 84.6%
- Memory Bandwidth Utilization: 78.2% of theoretical peak`,
      },
    ],
  },

  // 7. Viva Assessment - Oral Defense
  {
    id: "sub-107",
    studentId: "usr-s7",
    studentName: "Devendra Patel",
    studentRoll: "CS26-061",
    studentAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-09",
    assessmentTitle: "Advanced Algorithms & System Defense Viva Voce",
    assessmentType: "Viva Assessment",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    submissionDate: "2026-10-26T09:00:00Z",
    version: "v1.0",
    status: "In Progress",
    releaseStatus: "Draft",
    maxMarks: 30,
    files: [
      {
        id: "f-107-1",
        name: "Viva_Defense_Notes.pdf",
        size: "540 KB",
        type: "pdf",
        pageCount: 3,
        content: `VIVA VOCE EXAM SESSION LOG
Candidate: Devendra Patel (CS26-061)
Examiner: Dr. Alistair Vance (Senior Assessor)
Topic: Distributed Consensus, Split-Brain Mitigation, and Lock-Free Synchronization

Session Notes:
Candidate defended their research on Raft vs Multi-Paxos in high-jitter wide-area networks. Successfully answered live questions regarding:
1. Log compaction through snapshotting without blocking incoming writes.
2. The difference between Peterson's algorithm and hardware Compare-And-Swap (CAS) primitives.
3. Split-brain avoidance in asymmetrical 5-node network partitions.`,
      },
    ],
  },

  // 8. Midterm Examination Submissions
  {
    id: "sub-108",
    studentId: "usr-s8",
    studentName: "Meera Krishnan",
    studentRoll: "AI26-052",
    studentAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-04",
    assessmentTitle: "Midterm: Deep Neural Network Optimization",
    assessmentType: "Midterm Examination",
    course: "Deep Learning & Neural Architectures",
    courseCode: "AI302",
    submissionDate: "2026-10-26T04:12:00Z",
    version: "v1.0",
    status: "Submitted",
    releaseStatus: "Draft",
    maxMarks: 75,
    questionAnswers: [
      {
        id: "mq1",
        questionNumber: 1,
        questionText: "Explain the mathematical difference between L2 weight decay in vanilla SGD and decoupled weight decay in AdamW.",
        questionType: "subjective",
        studentAnswer:
          "In vanilla SGD with L2 regularization, the weight decay gradient lambda*w is added directly to the loss gradient before calculating moving averages. In Adam with L2, the moving average of gradients accumulates this term, causing weights with large historical gradients to receive less effective regularization than weights with small historical gradients. AdamW decouples weight decay by subtracting lambda*eta*w directly from the parameter update AFTER applying the preconditioner, restoring proper regularization.",
        maxMarks: 25,
        assignedForManualGrading: true,
      },
      {
        id: "mq2",
        questionNumber: 2,
        questionText: "Derive how LayerNorm stabilizes hidden activations compared to BatchNorm in autoregressive sequences.",
        questionType: "subjective",
        studentAnswer:
          "BatchNorm normalizes activations across the batch dimension for each feature channel. In autoregressive NLP, batch sizes vary and sequences have unequal lengths, creating artificial dependencies between disparate batch elements. LayerNorm normalizes across the feature dimension for each token independently: mu = (1/d) * sum(x_i) and sigma^2 = (1/d) * sum(x_i - mu)^2. This makes the computation invariant to batch size and strictly local to the individual token representation.",
        maxMarks: 25,
        assignedForManualGrading: true,
      },
      {
        id: "mq3",
        questionNumber: 3,
        questionText: "Analyze the cause of vanishing gradients in deep networks and explain why Swish/GELU activations outperform standard ReLU.",
        questionType: "subjective",
        studentAnswer:
          "Standard ReLU f(x) = max(0, x) suffers from 'dying ReLU' where negative inputs output zero gradient, permanently silencing neurons. GELU (Gaussian Error Linear Unit) f(x) = x * Phi(x) provides a continuous, non-monotonic probabilistic gating function with smooth non-zero gradients even for small negative inputs, enabling smoother optimization dynamics in transformers.",
        maxMarks: 25,
        assignedForManualGrading: true,
      },
    ],
    files: [],
  },

  // 9. Reassessment Request 2 (Viva contested)
  {
    id: "sub-109",
    studentId: "usr-s9",
    studentName: "Aditya Verma",
    studentRoll: "CS26-077",
    studentAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
    assessmentId: "asm-09",
    assessmentTitle: "Advanced Algorithms & System Defense Viva Voce",
    assessmentType: "Viva Assessment",
    course: "Operating Systems & System Programming",
    courseCode: "CS408",
    submissionDate: "2026-10-23T11:00:00Z",
    version: "v1.0",
    status: "Reassessment Requested",
    releaseStatus: "Reassessment Pending",
    maxMarks: 30,
    finalMarks: 19,
    files: [
      {
        id: "f-109-1",
        name: "Viva_Transcript_Excerpt.pdf",
        size: "310 KB",
        type: "pdf",
        pageCount: 2,
        content: "Viva transcript recording candidate discussion on Lock-Free Concurrent Ring Buffers and Lamport Bakery algorithm.",
      },
    ],
    finalizedEvaluation: {
      id: "eval-fin-109",
      submissionId: "sub-109",
      assessmentId: "asm-09",
      evaluatorId: "eval-01",
      evaluatorName: "Dr. Alistair Vance",
      timestamp: "2026-10-23T15:00:00Z",
      status: "Evaluated",
      releaseStatus: "Evaluated",
      totalAwardedMarks: 19,
      maxMarks: 30,
      criterionScores: [
        { criterionId: "va1", criterionName: "Theoretical Depth & Algorithm Fluency", awardedMarks: 7, maxMarks: 10, feedback: "Understood ring buffer basics but struggled with memory barriers." },
        { criterionId: "va2", criterionName: "Problem-Solving & Failure Scenario Response", awardedMarks: 6, maxMarks: 10, feedback: "Hesitant when diagnosing cache false sharing." },
        { criterionId: "va3", criterionName: "Technical Articulation & Defense Demeanor", awardedMarks: 6, maxMarks: 10, feedback: "Over-explained trivial points; lacked concise terminology." },
      ],
      overallFeedback: "Candidate possesses reasonable foundational knowledge but demonstrated difficulty when probed on x86 memory model stores and acquire-release semantics.",
      strengths: "Basic lock-free structures understood.",
      areasForImprovement: "Hardware memory models and sequential consistency.",
      suggestions: "Review memory barrier intrinsics in the C++20 standard.",
      lastSavedAt: "2026-10-23T15:00:00Z",
      completedAt: "2026-10-23T15:05:00Z",
    },
    reassessmentRequest: {
      id: "re-202",
      submissionId: "sub-109",
      studentId: "usr-s9",
      studentName: "Aditya Verma",
      studentRoll: "CS26-077",
      assessmentId: "asm-09",
      assessmentTitle: "Advanced Algorithms & System Defense Viva Voce",
      course: "Operating Systems & System Programming",
      requestDate: "2026-10-25T14:15:00Z",
      reason:
        "During the viva, I answered the acquire-release semantics question using the C++11 std::memory_order_acquire / release terminology, whereas the examiner was looking for specific x86 sfence/mfence instructions. I believe my explanation of synchronizes-with relationships was conceptually accurate according to the ISO C++ standard. I kindly ask for a review of the recorded transcript.",
      originalMarks: 19,
      maxMarks: 30,
      originalFeedback:
        "Demonstrated difficulty when probed on x86 memory model stores and acquire-release semantics.",
      status: "Pending",
    },
  },
]

// -------------------------------------------------------------
// Recent Activity Feed
// -------------------------------------------------------------
export const initialActivities: EvaluatorActivity[] = [
  {
    id: "act-1",
    type: "draft_saved",
    title: "Draft Saved",
    description: "Saved draft evaluation for Arjun Mehta (Cloud Architecture Microservices Capstone).",
    timestamp: "2026-10-25T17:15:00Z",
    assessmentId: "asm-01",
    submissionId: "sub-101",
  },
  {
    id: "act-2",
    type: "reassessment_received",
    title: "Reassessment Request Received",
    description: "Kavya Deshmukh submitted appeal for Cloud Architecture Capstone.",
    timestamp: "2026-10-25T19:30:00Z",
    assessmentId: "asm-01",
    submissionId: "sub-104",
  },
  {
    id: "act-3",
    type: "completed",
    title: "Evaluation Completed",
    description: "Finalized evaluation for Vikram Malhotra (94/100).",
    timestamp: "2026-10-25T14:00:00Z",
    assessmentId: "asm-01",
    submissionId: "sub-105",
  },
  {
    id: "act-4",
    type: "feedback_submitted",
    title: "Feedback Submitted",
    description: "Criterion-specific feedback recorded for GPU Kernel Practical exam.",
    timestamp: "2026-10-25T11:45:00Z",
    assessmentId: "asm-06",
  },
  {
    id: "act-5",
    type: "reassessment_received",
    title: "Reassessment Request Received",
    description: "Aditya Verma submitted appeal for Algorithms Viva Voce.",
    timestamp: "2026-10-25T14:15:00Z",
    assessmentId: "asm-09",
    submissionId: "sub-109",
  },
]

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------
export const initialNotifications: EvaluatorNotification[] = [
  {
    id: "notif-1",
    title: "Approaching Evaluation Deadline",
    message: "Consensus & Raft Protocol Quiz has 6 submissions pending. Deadline is in under 24 hours.",
    category: "Deadline",
    timestamp: "2026-10-26T08:00:00Z",
    read: false,
    priority: "urgent",
    targetTab: "My Evaluations",
    relatedId: "asm-03",
  },
  {
    id: "notif-2",
    title: "New Reassessment Appeal",
    message: "Kavya Deshmukh submitted a reassessment request for Capstone project contesting Criterion 3.",
    category: "Reassessment",
    timestamp: "2026-10-25T19:30:00Z",
    read: false,
    priority: "high",
    targetTab: "Reassessment",
    relatedId: "re-201",
  },
  {
    id: "notif-3",
    title: "New Student Submissions Arrived",
    message: "3 new submissions received for Transformer Attention Analysis assignment.",
    category: "Submission",
    timestamp: "2026-10-26T06:15:00Z",
    read: false,
    priority: "normal",
    targetTab: "Submissions",
    relatedId: "asm-02",
  },
  {
    id: "notif-4",
    title: "Assessment Assignment Confirmation",
    message: "Dean of Academic Affairs assigned GPU Kernel Practical Examination (CS408-PRAC) to your queue.",
    category: "Assignment",
    timestamp: "2026-10-24T10:00:00Z",
    read: true,
    priority: "normal",
    targetTab: "Assessments",
    relatedId: "asm-06",
  },
  {
    id: "notif-5",
    title: "Exam Board Release Update",
    message: "Admin released final approved grades for RESTful API Load Stress Testing (SE310-T1).",
    category: "System",
    timestamp: "2026-10-24T18:00:00Z",
    read: true,
    priority: "normal",
    targetTab: "Results & Feedback",
  },
]

// -------------------------------------------------------------
// Evaluator Settings
// -------------------------------------------------------------
export const initialSettings: EvaluatorSettings = {
  profile: initialEvaluatorProfile,
  notificationPreferences: {
    newSubmissions: true,
    deadlineReminders: true,
    reassessmentRequests: true,
    systemAnnouncements: false,
  },
  defaultSort: "deadline",
  listView: "detailed",
  autoAdvanceOnSubmit: true,
  showRubricWeights: true,
}
