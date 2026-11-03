import type { ModuleAssignmentItem, StudentModuleSubmission } from "../types"
export type { ModuleAssignmentItem, StudentModuleSubmission }
import { initialStudents } from "./mockData"

// Cohort student submissions generator
function generateSubmissionsForAssignment(
  moduleId: string,
  submissionsCount: number,
  maxMarks: number
): StudentModuleSubmission[] {
  const students = initialStudents.slice(0, 6)
  const submissions: StudentModuleSubmission[] = []

  students.forEach((st, idx) => {
    const isSubmitted = idx < submissionsCount
    if (isSubmitted) {
      const isGraded = idx < Math.floor(submissionsCount * 0.7)
      const score = isGraded
        ? Math.round(maxMarks * (0.8 + (st.average / 100) * 0.2))
        : undefined

      submissions.push({
        studentId: st.id,
        studentName: st.name,
        studentRoll: st.rollNumber,
        studentAvatar: st.image,
        submittedAt: `Nov ${1 + (idx % 3)}, 2026 at 0${9 + (idx % 3)}:30 AM`,
        status: isGraded ? "Graded" : "Submitted",
        score,
        maxMarks,
        submittedFile: `${st.name.replace(/\s+/g, "_")}_${moduleId}_Assignment.pdf`,
        teacherFeedback: isGraded
          ? "Solid architecture implementation. Tensor dimensionality and loss convergence match standards."
          : undefined,
      })
    } else {
      submissions.push({
        studentId: st.id,
        studentName: st.name,
        studentRoll: st.rollNumber,
        studentAvatar: st.image,
        submittedAt: "Not yet submitted",
        status: "Pending",
        maxMarks,
      })
    }
  })

  return submissions
}

export const MODULE_ASSIGNMENTS: Record<string, ModuleAssignmentItem> = {
  // Course 1 (c1) Generative AI Masterclass Modules
  m1: {
    id: "asg_m1",
    moduleId: "m1",
    moduleTitle: "Module 1: Introduction to LLMs & Transformer Architectures",
    courseId: "c1",
    title: "Module 1 Project: PyTorch Scaled Dot-Product Attention & RoPE",
    type: "Coding Lab",
    description:
      "Implement multi-head self-attention from scratch in PyTorch, apply Rotary Position Embeddings (RoPE), and benchmark against torch.nn.MultiheadAttention.",
    instructions:
      "1. Implement scaled dot-product attention function.\n2. Add multi-head projection layers and causal attention mask.\n3. Integrate RoPE rotational frequency embeddings.\n4. Validate output tensor dimensions and compare forward pass latency.",
    dueDate: "Nov 06, 2026",
    maxMarks: 100,
    status: "Graded",
    submissionsCount: 6,
    totalEnrolled: 6,
    averageScore: 94,
    isDemoData: false,
    attachments: [
      {
        name: "Transformer_Attention_Starter.ipynb",
        size: "1.4 MB",
        type: "Jupyter Notebook",
        url: "/assets/course_genai.jpg",
      },
    ],
    submissions: generateSubmissionsForAssignment("m1", 6, 100),
  },

  m2: {
    id: "asg_m2",
    moduleId: "m2",
    moduleTitle: "Module 2: Prompt Engineering & Schema Conditioning",
    courseId: "c1",
    title: "Module 2 Lab: Structured Output Generation & JSON Schema Constraints",
    type: "Coding Lab",
    description:
      "Construct a resilient tool-calling pipeline that validates complex nested JSON outputs against Pydantic schemas with automatic self-repair retry loops.",
    instructions:
      "1. Define the Pydantic data contract for multi-entity extraction.\n2. Configure temperature and JSON mode.\n3. Implement a fallback repair loop when schema validation fails.\n4. Evaluate 100 edge cases with malformed payloads.",
    dueDate: "Nov 12, 2026",
    maxMarks: 100,
    status: "In Review",
    submissionsCount: 5,
    totalEnrolled: 6,
    averageScore: 92,
    isDemoData: false,
    attachments: [
      {
        name: "Structured_Generation_Rubric.pdf",
        size: "420 KB",
        type: "Evaluation Rubric",
        url: "/assets/course_genai.jpg",
      },
    ],
    submissions: generateSubmissionsForAssignment("m2", 5, 100),
  },

  m3: {
    id: "asg_m3",
    moduleId: "m3",
    moduleTitle: "Module 3: Vector Embeddings & Similarity Search",
    courseId: "c1",
    title: "Module 3 Assignment: Vector Indexing & HNSW Benchmark",
    type: "Coding Lab",
    description:
      "Build a ChromaDB vector index over 50,000 document chunks and evaluate recall@k across varying ef_search and M hyperparameter values.",
    instructions:
      "1. Generate 768-dim embeddings using BGE-small.\n2. Configure HNSW index with M=16, 32, 64.\n3. Measure query throughput (QPS) and recall accuracy.\n4. Plot latency vs recall Pareto frontier curves.",
    dueDate: "Nov 18, 2026",
    maxMarks: 100,
    status: "Assigned",
    submissionsCount: 4,
    totalEnrolled: 6,
    averageScore: 88,
    isDemoData: false,
    attachments: [
      {
        name: "HNSW_Benchmarking_Guide.pdf",
        size: "620 KB",
        type: "Lab Guide",
        url: "/assets/course_genai.jpg",
      },
    ],
    submissions: generateSubmissionsForAssignment("m3", 4, 100),
  },

  m4: {
    id: "asg_m4",
    moduleId: "m4",
    moduleTitle: "Module 4: Retrieval-Augmented Generation (RAG)",
    courseId: "c1",
    title: "Module 4 Project: Production RAG Pipeline with Ragas Faithfulness Evals",
    type: "Project Milestone",
    description:
      "Deploy an end-to-end RAG system with hybrid lexical-dense search, cross-encoder reranking, and automated Ragas hallucination evaluation.",
    instructions:
      "1. Implement semantic chunking on enterprise technical documentation.\n2. Configure Reciprocal Rank Fusion between BM25 and vector retrieval.\n3. Integrate FlashRank cross-encoder reranking.\n4. Score Ragas faithfulness, answer relevancy, and context recall.",
    dueDate: "Nov 24, 2026",
    maxMarks: 100,
    status: "Assigned",
    submissionsCount: 2,
    totalEnrolled: 6,
    averageScore: 95,
    isDemoData: false,
    attachments: [
      {
        name: "RAG_Evaluation_Harness.ipynb",
        size: "1.8 MB",
        type: "Jupyter Notebook",
        url: "/assets/course_genai.jpg",
      },
    ],
    submissions: generateSubmissionsForAssignment("m4", 2, 100),
  },

  m5: {
    id: "asg_m5",
    moduleId: "m5",
    moduleTitle: "Module 5: Autonomous Multi-Agent Workflows",
    courseId: "c1",
    title: "Module 5 Capstone: Autonomous Multi-Agent Swarm with LangGraph",
    type: "Project Milestone",
    description:
      "Design a cyclical multi-agent graph with supervisor routing, isolated sandboxed tool executors, and durable checkpoint state persistence.",
    instructions:
      "1. Construct supervisor agent node that routes user intents to specialist workers.\n2. Implement coding agent, web research agent, and test verification agent.\n3. Add SQLite / Redis checkpoint memory to survive process restarts.\n4. Include human-in-the-loop authorization on file write and shell commands.",
    dueDate: "Dec 02, 2026",
    maxMarks: 100,
    status: "Assigned",
    submissionsCount: 1,
    totalEnrolled: 6,
    averageScore: 98,
    isDemoData: false,
    attachments: [
      {
        name: "LangGraph_MultiAgent_Capstone.zip",
        size: "2.4 MB",
        type: "Project Starter",
        url: "/assets/course_genai.jpg",
      },
    ],
    submissions: generateSubmissionsForAssignment("m5", 1, 100),
  },
}

export function getModuleAssignment(
  courseId: string,
  moduleId: string
): ModuleAssignmentItem | null {
  if (MODULE_ASSIGNMENTS[moduleId]) {
    return {
      ...MODULE_ASSIGNMENTS[moduleId],
      courseId,
    }
  }

  if (courseId === "c2" && (moduleId === "c2_m1" || moduleId === "m1")) {
    return {
      id: `asg_${courseId}_${moduleId}`,
      moduleId,
      moduleTitle: "Module 1: Vector Math & PyTorch Tensors",
      courseId,
      title: "Python Lab 1: PyTorch Autograd & CUDA Tensor Operations",
      type: "Coding Lab",
      description: "Implement forward and backward propagation routines testing computational graphs and memory allocation.",
      instructions: "Profile GPU tensor allocation. Ensure zero gradient memory leaks.",
      dueDate: "Nov 12, 2026",
      maxMarks: 50,
      status: "Assigned",
      submissionsCount: 5,
      totalEnrolled: 6,
      averageScore: 48,
      isDemoData: false,
      submissions: generateSubmissionsForAssignment(moduleId, 5, 50),
    }
  }

  return null
}
