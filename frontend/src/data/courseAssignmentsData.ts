import type { ModuleAssignmentItem, StudentModuleSubmission } from "../types"
export type { ModuleAssignmentItem, StudentModuleSubmission }
import { initialStudents } from "./mockData"

// Cohort student submissions generator
function generateSubmissionsForAssignment(
  moduleId: string,
  submissionsCount: number,
  maxMarks: number
): StudentModuleSubmission[] {
  const students = initialStudents.slice(0, 12)
  const submissions: StudentModuleSubmission[] = []

  students.forEach((st, idx) => {
    const isSubmitted = idx < submissionsCount
    if (isSubmitted) {
      const isGraded = idx < Math.floor(submissionsCount * 0.7)
      const score = isGraded
        ? Math.round(maxMarks * (0.75 + (st.average / 100) * 0.25))
        : undefined

      submissions.push({
        studentId: st.id,
        studentName: st.name,
        studentRoll: st.rollNumber,
        studentAvatar: st.image,
        submittedAt: `Oct ${12 + (idx % 8)}, 2026 at 0${9 + (idx % 8)}:30 AM`,
        status: isGraded ? "Graded" : "Submitted",
        score,
        maxMarks,
        submittedFile: `${st.name.replace(/\s+/g, "_")}_${moduleId}_Submission.pdf`,
        teacherFeedback: isGraded
          ? `Solid demonstration of core concepts. Great attention to detail in step 3.`
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
  // Course 1 (c1) Modules
  m1: {
    id: "asg_m1",
    moduleId: "m1",
    moduleTitle: "Introduction to Artificial Intelligence & Pattern Recognition",
    courseId: "c1",
    title: "Module 1 Assignment: AI Pattern Classifier & Decision Trees",
    type: "Coding Lab",
    description:
      "Design and document a 3-layer decision tree classifier that sorts everyday classroom objects into human vs machine recognizable categories.",
    instructions:
      "1. Open the Admin-provided starter sheet.\n2. Formulate 3 distinct classification questions (e.g. 'Does it emit light?', 'Does it have moving parts?').\n3. Test the classifier with at least 8 sample classroom objects.\n4. Document observed edge cases and calculate classification accuracy.",
    dueDate: "Nov 04, 2026",
    maxMarks: 100,
    status: "In Review",
    submissionsCount: 22,
    totalEnrolled: 24,
    averageScore: 92,
    isDemoData: true,
    attachments: [
      {
        name: "Pattern_Classifier_Starter_Sheet.pdf",
        size: "1.2 MB",
        type: "PDF Worksheet",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      {
        name: "Decision_Tree_Rubric_Standards.pdf",
        size: "480 KB",
        type: "Evaluation Rubric",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m1", 22, 100),
  },

  m2: {
    id: "asg_m2",
    moduleId: "m2",
    moduleTitle: "Fractions & Mathematical Problem Solving",
    courseId: "c1",
    title: "Module 2 Assignment: Fraction Partitioning & Mixed Numbers Problem Set",
    type: "Written Assignment",
    description:
      "Complete the 10-problem fractions mastery set including geometric bar partitioning, common denominators, and decimal conversion proofs.",
    instructions:
      "1. Show all intermediate calculations step-by-step.\n2. Draw geometric bar models for problems #4 and #8.\n3. Convert resulting improper fractions into simplified mixed numbers.\n4. Double-check decimal placement along the calibrated number line.",
    dueDate: "Nov 08, 2026",
    maxMarks: 50,
    status: "Graded",
    submissionsCount: 24,
    totalEnrolled: 24,
    averageScore: 46,
    isDemoData: true,
    attachments: [
      {
        name: "Fractions_Problem_Set_10.pdf",
        size: "850 KB",
        type: "Problem Set",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      {
        name: "Geometric_Bar_Grid_Templates.pdf",
        size: "320 KB",
        type: "Template",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m2", 24, 50),
  },

  m3: {
    id: "asg_m3",
    moduleId: "m3",
    moduleTitle: "Physical & Biological Science Experiments",
    courseId: "c1",
    title: "Module 3 Assignment: Plant Phototropism & Thermal Insulation Lab Report",
    type: "Written Assignment",
    description:
      "Submit a formal scientific lab report summarizing the two-week plant phototropism growth experiment and thermal conductor test results.",
    instructions:
      "1. Formulate a testable hypothesis based on light spectrum variations.\n2. Include your group's daily millimeter growth measurement table.\n3. Plot time vs temperature cooling curves for the 4 tested insulator materials.\n4. State your scientific conclusion in accordance with the Scientific Method.",
    dueDate: "Nov 14, 2026",
    maxMarks: 100,
    status: "Assigned",
    submissionsCount: 18,
    totalEnrolled: 24,
    averageScore: 88,
    isDemoData: true,
    attachments: [
      {
        name: "Science_Lab_Report_Template_Year4.pdf",
        size: "620 KB",
        type: "Report Template",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m3", 18, 100),
  },

  m4: {
    id: "asg_m4",
    moduleId: "m4",
    moduleTitle: "Reading Comprehension & Technical Vocabulary",
    courseId: "c1",
    title: "Module 4 Assessment: Mars Mission Comprehension & Etymology Diagnostic",
    type: "Quiz Assessment",
    description:
      "Interactive technical reading comprehension check and Latin/Greek etymological root matching assessment based on NASA rover dispatches.",
    instructions:
      "1. Read the provided Mars Perseverance Rover excerpt carefully.\n2. Complete all 15 reading comprehension questions.\n3. Match 10 technical prefixes and suffixes with their modern computing definitions.\n4. Time limit: 45 minutes (Single attempt permitted).",
    dueDate: "Nov 18, 2026",
    maxMarks: 40,
    status: "Assigned",
    submissionsCount: 12,
    totalEnrolled: 24,
    averageScore: 36,
    isDemoData: true,
    attachments: [
      {
        name: "Mars_Mission_Reading_Text.pdf",
        size: "1.4 MB",
        type: "Reading Passage",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m4", 12, 40),
  },

  m5: {
    id: "asg_m5",
    moduleId: "m5",
    moduleTitle: "Decimals, Percentages & Logic Puzzles",
    courseId: "c1",
    title: "Module 5 Assignment: Classroom STEM Budgeting & Deduction Ledger",
    type: "Project Milestone",
    description:
      "Prepare a balanced group budget ledger for the mock STEM field trip using percentage allocations and solve the 4x4 deductive logic grid.",
    instructions:
      "1. Calculate exact 10%, 25%, and 50% category shares for the $500 mock allocation.\n2. Complete the attached deduction matrix with 100% logical consistency.\n3. Submit final group balance sheet signed by both peer partners.",
    dueDate: "Nov 24, 2026",
    maxMarks: 50,
    status: "Assigned",
    submissionsCount: 6,
    totalEnrolled: 24,
    averageScore: 48,
    isDemoData: true,
    attachments: [
      {
        name: "Budgeting_Ledger_Workbook.pdf",
        size: "710 KB",
        type: "Project Sheet",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m5", 6, 50),
  },

  m6: {
    id: "asg_m6",
    moduleId: "m6",
    moduleTitle: "Introductory Robotics & Visual Programming",
    courseId: "c1",
    title: "Module 6 Capstone: Autonomous Maze Runner Algorithm & Video Demo",
    type: "Coding Lab",
    description:
      "Upload the final ultrasonic obstacle avoidance algorithm block file and a 60-second video demonstrating an unassisted maze traversal.",
    instructions:
      "1. Program the rover loop to check ultrasonic sensor distance every 50ms.\n2. Execute an 85-degree avoidance turn when obstacle is detected within 15cm.\n3. Complete 3 consecutive clean maze runs.\n4. Submit block code export (.xml / .sb3) and verified demonstration video link.",
    dueDate: "Dec 02, 2026",
    maxMarks: 100,
    status: "Assigned",
    submissionsCount: 2,
    totalEnrolled: 24,
    averageScore: 94,
    isDemoData: true,
    attachments: [
      {
        name: "Capstone_Maze_Runner_Rubric.pdf",
        size: "950 KB",
        type: "Evaluation Rubric",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    submissions: generateSubmissionsForAssignment("m6", 2, 100),
  },
}

/**
 * Retrieves the admin-created assignment for a specific course module.
 * If no assignment exists for the module in the database, returns null
 * to display the clear 'No assignment available for this module' state.
 */
export function getModuleAssignment(
  courseId: string,
  moduleId: string
): ModuleAssignmentItem | null {
  // Check predefined assignments for module
  if (MODULE_ASSIGNMENTS[moduleId]) {
    return {
      ...MODULE_ASSIGNMENTS[moduleId],
      courseId,
    }
  }

  // If Course 2, 3, 4 etc., provide realistic admin assignments for first 2 modules, and null for others to showcase empty state!
  if (courseId === "c2" && (moduleId === "c2_m1" || moduleId === "m1")) {
    return {
      id: `asg_${courseId}_${moduleId}`,
      moduleId,
      moduleTitle: "Computational Logic & Python Data Structures",
      courseId,
      title: "Python Lab 1: Sequence Processing & List Methods",
      type: "Coding Lab",
      description: "Write and execute 5 Python script routines testing list comprehension and dictionary indexing.",
      instructions: "Follow PEP 8 guidelines. Test all edge cases including empty sequences.",
      dueDate: "Nov 12, 2026",
      maxMarks: 50,
      status: "Assigned",
      submissionsCount: 16,
      totalEnrolled: 20,
      averageScore: 44,
      isDemoData: true,
      submissions: generateSubmissionsForAssignment(moduleId, 16, 50),
    }
  }

  // Return null for modules without an assignment to test the empty state requirement
  return null
}
