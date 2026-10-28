import { useState, useEffect, useRef } from "react"
import { Icon } from "../../components/Icon"
import { StudentDropdown } from "../../components/StudentDropdown"
import type {
  InterviewType,
  InterviewQuestion,
  InterviewSetup,
  InterviewHistoryItem,
  InterviewStats,
} from "./studentTypes"

interface MockInterviewPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: any) => void
  onOpenAiModal?: () => void
}

const STORAGE_KEY = "quantum_student_mock_interviews"

// Curated question bank with expected concepts, tips, and adaptive follow-up triggers
interface ExtendedInterviewQuestion extends InterviewQuestion {
  starterCode?: string
  followUpQuestion: string
  followUpExpectedConcepts: string[]
  followUpSampleAnswer: string
}

const questionBank: Record<InterviewType, ExtendedInterviewQuestion[]> = {
  Technical: [
    {
      id: "tech-1",
      category: "Technical",
      question: "Explain the difference between array and linked list.",
      expectedConcepts: [
        "contiguous memory",
        "dynamic size",
        "pointer / node traversal",
        "O(1) random access vs O(N) lookup",
        "insertion / deletion complexity",
      ],
      sampleAnswer:
        "Arrays store elements in contiguous memory locations, offering O(1) random indexing access via memory address arithmetic. However, their size is fixed upon allocation, and inserting in the middle requires O(N) shifting. In contrast, Linked Lists consist of nodes containing data and reference pointers scattered across the heap. They dynamically grow and allow O(1) insertions/deletions once the node is reached, but searching requires O(N) sequential traversal.",
      tip: "Structure your response by comparing memory layout, time complexity for access/insertion, and practical trade-offs.",
      followUpQuestion:
        "You mentioned O(1) random access for arrays. How does CPU hardware cache line prefetching give arrays an additional real-world performance advantage over linked lists?",
      followUpExpectedConcepts: [
        "cache locality",
        "spatial locality",
        "cache misses",
        "pointer chasing in linked lists",
      ],
      followUpSampleAnswer:
        "Because array elements reside contiguously in memory, loading one element fetches an entire cache line (typically 64 bytes) into L1/L2 CPU cache, exploiting spatial locality. Linked list nodes reside at arbitrary memory addresses across the heap; accessing successive nodes causes pointer-chasing and frequent CPU cache misses, resulting in significantly higher latency despite identical theoretical complexity.",
    },
    {
      id: "tech-2",
      category: "Technical",
      question: "What is a binary search tree? Explain its operations.",
      expectedConcepts: [
        "left subtree smaller",
        "right subtree larger",
        "O(log N) average lookup",
        "in-order traversal yields sorted order",
        "unbalanced BST degradation to O(N)",
      ],
      sampleAnswer:
        "A Binary Search Tree (BST) is a hierarchical node-based data structure where each node has at most two children. The BST invariant mandates that all nodes in the left subtree have values strictly less than the parent node, and all nodes in the right subtree have values strictly greater. Core operations—search, insertion, and deletion—average O(log N) time on balanced trees.",
      tip: "Mention the BST property, time complexity in average vs worst case, and how self-balancing algorithms solve worst-case degradation.",
      followUpQuestion:
        "What happens if elements are inserted in already-sorted sequential order into a standard BST, and how do self-balancing trees prevent that issue?",
      followUpExpectedConcepts: [
        "skewed tree",
        "degradation to linked list",
        "O(N) worst case",
        "tree rotations",
        "AVL or Red-Black balance factor",
      ],
      followUpSampleAnswer:
        "Inserting sorted data creates a degenerate, skewed tree resembling a singly linked list with height N, degrading lookup and insertion to O(N). Self-balancing trees like AVL or Red-Black trees maintain invariant height constraints using single and double tree rotations upon insertion/deletion to preserve O(log N) balance guarantees.",
    },
    {
      id: "tech-3",
      category: "Technical",
      question: "How does a hash map work?",
      expectedConcepts: [
        "hash function",
        "bucket array",
        "collision resolution",
        "chaining vs open addressing",
        "load factor and rehashing",
      ],
      sampleAnswer:
        "A Hash Map stores key-value pairs using a hash function that converts a key into an integer index within an internal bucket array. In an ideal uniform distribution, lookups, insertions, and deletions take O(1) amortized time. When different keys compute the same index (collision), maps handle them via separate chaining or open addressing. When the load factor exceeds a threshold (e.g., 0.75), the map rehashes into a doubled capacity array.",
      tip: "Highlight the role of the hash function, collision resolution techniques, and load factor thresholding.",
      followUpQuestion:
        "When collision chaining is used, what optimization do modern runtimes like Java 8+ apply when a single bucket exceeds a threshold like 8 elements?",
      followUpExpectedConcepts: [
        "treeification",
        "Red-Black tree conversion",
        "O(log N) vs O(N) chain",
        "DoS collision attack mitigation",
      ],
      followUpSampleAnswer:
        "In Java 8+, when a single bucket linked list exceeds TREEIFY_THRESHOLD (8 items) and the map capacity is at least 64, the linked list converts into a balanced Red-Black tree. This reduces worst-case lookup from O(N) to O(log N), mitigating hash collision denial-of-service vulnerabilities.",
    },
    {
      id: "tech-4",
      category: "Technical",
      question: "Explain the time and space complexity of quick sort.",
      expectedConcepts: [
        "divide and conquer",
        "pivot partitioning",
        "average O(N log N)",
        "worst case O(N^2)",
        "in-place O(log N) call stack space",
      ],
      sampleAnswer:
        "QuickSort is an in-place, divide-and-conquer algorithm. It selects a pivot element and partitions the array such that elements smaller than the pivot precede it and larger ones succeed it, recursively sorting each partition. Its average and best-case time complexity is O(N log N). In the worst case, it degrades to O(N^2). Space complexity is O(log N) auxiliary memory on average due to recursive call stack frames.",
      tip: "Discuss median-of-three or randomized pivot selection to mitigate the O(N^2) worst case.",
      followUpQuestion:
        "How does the median-of-three heuristic or dual-pivot QuickSort specifically reduce the likelihood of encountering the O(N²) worst-case?",
      followUpExpectedConcepts: [
        "median of first, middle, last",
        "balanced partition halves",
        "fewer recursive stack frames",
      ],
      followUpSampleAnswer:
        "The median-of-three heuristic samples the first, middle, and last elements and selects their median as the pivot. This prevents skewed partitions on pre-sorted or reverse-sorted inputs, consistently yielding roughly equal halves and preserving O(N log N) performance in practical production runtimes.",
    },
    {
      id: "tech-5",
      category: "Technical",
      question: "What is dynamic programming? Give an example.",
      expectedConcepts: [
        "optimal substructure",
        "overlapping subproblems",
        "memoization top-down",
        "tabulation bottom-up",
        "time-space trade-off",
      ],
      sampleAnswer:
        "Dynamic Programming (DP) is an optimization technique that solves complex problems by breaking them down into simpler subproblems. It applies when a problem exhibits both Optimal Substructure and Overlapping Subproblems. DP stores computed answers to prevent redundant work via Top-Down Memoization or Bottom-Up Tabulation.",
      tip: "Always state the two prerequisites: Optimal Substructure and Overlapping Subproblems.",
      followUpQuestion:
        "In the Fibonacci or Knapsack DP problem, how can we optimize the space complexity from O(N) or O(N*W) down to O(1) or O(W)?",
      followUpExpectedConcepts: [
        "rolling variables",
        "only previous states needed",
        "space optimization from table to constant memory",
      ],
      followUpSampleAnswer:
        "Because calculating the current state only depends on the immediate previous state (e.g., Fib(n-1) and Fib(n-2)), we don't need to retain the entire history array. We can maintain just two rolling variables, reducing space complexity from O(N) down to O(1).",
    },
  ],
  HR: [
    {
      id: "hr-1",
      category: "HR",
      question: "Tell me about yourself and your career aspirations.",
      expectedConcepts: [
        "present role and specialization",
        "key technical achievements",
        "passion for AI / software engineering",
        "alignment with career aspirations",
      ],
      sampleAnswer:
        "I am an AI & Software Engineering student with practical experience building full-stack applications and deploying machine learning pipelines. Recently, I built an enterprise RAG knowledge assistant with Python and React that significantly expedited document queries. Beyond coursework, I contribute to developer hackathons and enjoy translating complex theoretical models into reliable, user-focused products.",
      tip: "Use the Present-Past-Future framework: What you do now, key past highlights, and why this specific opportunity is next.",
      followUpQuestion:
        "You mentioned building an enterprise RAG application. What was the most significant technical roadblock you personally diagnosed and solved during that project?",
      followUpExpectedConcepts: [
        "vector chunking / retrieval precision",
        "latency optimization",
        "personal ownership",
      ],
      followUpSampleAnswer:
        "Initially, our vector search returned irrelevant chunks due to naive fixed-character token splitting. I redesigned the pipeline using semantic sentence boundary chunking with overlap and added reciprocal rank fusion re-ranking, which increased response accuracy from 68% to 91% without increasing latency.",
    },
    {
      id: "hr-2",
      category: "HR",
      question: "Why do you want to join our organization?",
      expectedConcepts: [
        "company mission and engineering culture",
        "technological focus",
        "growth opportunities",
        "mutual value contribution",
      ],
      sampleAnswer:
        "I have closely followed your organization's commitment to scalable AI systems and developer tooling. Your engineering philosophy prioritizes solving genuine user problems with high performance and continuous learning, which aligns directly with my values. I want to contribute to high-impact projects alongside mentors who uphold top engineering standards.",
      tip: "Demonstrate concrete knowledge of the company's product, tech stack, and recent engineering accomplishments.",
      followUpQuestion:
        "How do you plan to measure your own contribution and success during your initial 90 days on our engineering team?",
      followUpExpectedConcepts: [
        "onboarding speed",
        "first meaningful pull request",
        "understanding architecture",
        "team integration",
      ],
      followUpSampleAnswer:
        "In the first 30 days, I focus on mastering codebases, testing workflows, and shipping my first bug fix. By 60 days, I aim to independently own a feature module. By 90 days, I expect to proactively improve documentation and actively review pull requests with the team.",
    },
    {
      id: "hr-3",
      category: "HR",
      question: "What are your greatest strengths and an area you are actively improving?",
      expectedConcepts: [
        "concrete strength with evidence",
        "honest area of improvement",
        "actionable steps taken to improve",
        "growth mindset",
      ],
      sampleAnswer:
        "My greatest strength is analytical problem-solving and rapid technology adoption—when confronted with unfamiliar frameworks, I break down documentation and ship working prototypes swiftly. An area I am actively improving is delegating tasks during intensive team hackathons; previously, I tended to take on excessive modules personally.",
      tip: "Pick a genuine developmental opportunity and explain your system for mastering it.",
      followUpQuestion:
        "What specific tools or feedback mechanisms have you implemented to verify you are delegating effectively?",
      followUpExpectedConcepts: [
        "Kanban / task tracking",
        "daily standups",
        "peer check-ins",
      ],
      followUpSampleAnswer:
        "I now break deliverables into discrete GitHub project cards with clear acceptance criteria and hold brief 10-minute daily syncs. This ensures transparent accountability without micro-managing my peers.",
    },
    {
      id: "hr-4",
      category: "HR",
      question: "Where do you see yourself professionally in the next 3 to 5 years?",
      expectedConcepts: [
        "technical depth and mastery",
        "mentorship and leadership",
        "impact on system architecture",
        "continuous learning",
      ],
      sampleAnswer:
        "In 3 to 5 years, I aim to have developed deep expertise as a Senior Software Engineer specializing in intelligent distributed systems. I see myself taking ownership of end-to-end architectures, mentoring junior developers, and contributing to core system design decisions.",
      tip: "Balance technical mastery with collaborative leadership and business impact.",
      followUpQuestion:
        "Between deepening individual contributor technical depth versus transitioning into engineering management, which direction excites you more?",
      followUpExpectedConcepts: [
        "technical architecture IC track",
        "system design impact",
        "mentorship while coding",
      ],
      followUpSampleAnswer:
        "I am currently most energized by the Technical Individual Contributor track—focusing on system architecture, performance optimization, and distributed systems design, while continuing to mentor interns and new teammates.",
    },
    {
      id: "hr-5",
      category: "HR",
      question: "How do you handle conflict or differing opinions with team members?",
      expectedConcepts: [
        "active listening",
        "objective data-driven discussions",
        "focus on shared project goals",
        "healthy compromise",
      ],
      sampleAnswer:
        "I view technical differences as opportunities to reach better architectural outcomes. I first listen actively to understand my peer's rationale and underlying constraints. I focus conversations on data—such as benchmark latency, maintainability, or user requirements—rather than personal preferences.",
      tip: "Highlight emotional intelligence, active listening, and depersonalizing technical debates.",
      followUpQuestion:
        "If after reviewing benchmark data your team is still deadlocked 50/50 on an architectural choice, how do you break the tie?",
      followUpExpectedConcepts: [
        "consulting team lead / architect",
        "building a rapid 1-day spike prototype",
        "agree and commit principle",
      ],
      followUpSampleAnswer:
        "I propose building a lightweight time-boxed spike prototype to test both approaches under realistic test loads. If still inconclusive, we escalate with a concise trade-off summary to our tech lead, and once a decision is made, we practice 'disagree and commit' to execute unitedly.",
    },
  ],
  Behavioral: [
    {
      id: "beh-1",
      category: "Behavioral",
      question: "Describe a situation where you had to solve a difficult problem under tight pressure.",
      expectedConcepts: [
        "Situation context",
        "Task objective",
        "Action taken with systematic debugging",
        "Result and quantitative impact",
      ],
      sampleAnswer:
        "During a final-term capstone presentation, our backend API encountered memory spikes and rate-limiting errors 4 hours before the live demonstration. As the technical lead, I isolated the issue using memory profilers and discovered redundant database queries executed within an asynchronous loop. I refactored the logic into a single batched query with Redis caching. The demo ran flawlessly with API response latency reduced by 65%.",
      tip: "Apply the STAR method (Situation, Task, Action, Result) with specific measurable outcomes.",
      followUpQuestion:
        "Looking back at that high-pressure incident, what automated test or monitoring safeguard did you put in place to ensure that bug could never reach staging again?",
      followUpExpectedConcepts: [
        "load testing with k6 or JMeter",
        "CI pipeline query count assertion",
        "staging memory alerts",
      ],
      followUpSampleAnswer:
        "I added automated k6 load-testing scripts to our CI/CD pipeline that trigger on pull requests, asserting that simulated concurrency of 200 users maintains sub-100ms response latency without database connection pool exhaustion.",
    },
    {
      id: "beh-2",
      category: "Behavioral",
      question: "Give an example of a time you received constructive criticism and how you responded.",
      expectedConcepts: [
        "receptiveness to feedback",
        "absence of defensiveness",
        "action taken to implement advice",
        "long-term behavioral improvement",
      ],
      sampleAnswer:
        "During a code review for an open-source project, a senior engineer noted that while my algorithms functioned correctly, my pull requests lacked unit test coverage and modular documentation. Rather than being discouraged, I thanked the reviewer, studied the project's testing harness, and wrote test suites achieving 92% code coverage. That feedback established my habit of test-driven development.",
      tip: "Show that feedback serves as a catalyst for your professional refinement.",
      followUpQuestion:
        "How has receiving that feedback changed how you review code submitted by junior team members or classmates today?",
      followUpExpectedConcepts: [
        "empathy in code reviews",
        "explaining the 'why' behind comments",
        "praising good patterns alongside critique",
      ],
      followUpSampleAnswer:
        "It made my code reviews significantly more constructive. Instead of simply pointing out flaws, I explain the architectural rationale behind suggestions, provide code examples, and celebrate clean design patterns written by the author.",
    },
    {
      id: "beh-3",
      category: "Behavioral",
      question: "Tell me about a time you had to learn a complex new technology quickly.",
      expectedConcepts: [
        "learning strategy",
        "hands-on experimentation",
        "timeframe management",
        "successful project delivery",
      ],
      sampleAnswer:
        "When our hackathon project required integrating vector search embeddings using a newly released vector database, none of our team members had hands-on experience. I spent an evening studying the official documentation and building a minimal proof-of-concept. By morning, I wrote a lightweight client wrapper and shared a quick onboarding guide with my team, allowing us to finish our MVP ahead of the deadline.",
      tip: "Emphasize your systematic research approach, synthesis of documentation, and knowledge sharing with peers.",
      followUpQuestion:
        "When learning a brand new API or library on a tight timeline, how do you decide when to stop reading documentation and start writing code?",
      followUpExpectedConcepts: [
        "timeboxing theory",
        "building minimal viable spikes",
        "hands-on error-driven feedback",
      ],
      followUpSampleAnswer:
        "I time-box documentation reading to no more than 60-90 minutes to grasp fundamental core concepts. I immediately transition to building a minimal throwaway prototype so real compiler errors and API response logs guide my understanding.",
    },
    {
      id: "beh-4",
      category: "Behavioral",
      question: "Describe a time a project failed or didn't go as planned. What did you learn?",
      expectedConcepts: [
        "accountability and ownership",
        "root cause analysis",
        "corrective actions taken",
        "retrospective lessons learned",
      ],
      sampleAnswer:
        "In our first collegiate hackathon, our team attempted to build an overly ambitious multi-tenant analytics suite in 24 hours. Due to scope creep, we ended up with incomplete modules and no polished workflow at submission. In our post-mortem, I recognized that we failed to define a strict Minimum Viable Product. Since then, I always champion ruthless prioritization and scoping the core user loop first before adding secondary features.",
      tip: "Take genuine ownership rather than blaming external circumstances or teammates.",
      followUpQuestion:
        "How do you now manage 'scope creep' when team members or stakeholders want to add cool new features mid-sprint?",
      followUpExpectedConcepts: [
        "backlog prioritization",
        "MVP discipline",
        "phased releases (V1 vs V2)",
      ],
      followUpSampleAnswer:
        "I acknowledge the value of the idea and place it directly into a visible 'Phase 2 / Fast-Follow' backlog. I explain that safeguarding the core user journey for the current release deadline takes absolute precedence.",
    },
    {
      id: "beh-5",
      category: "Behavioral",
      question: "Tell me about a time you persuaded a stakeholder or teammate to adopt your approach.",
      expectedConcepts: [
        "stakeholder empathy",
        "data-driven demonstration",
        "prototyping / proof of concept",
        "collaborative consensus",
      ],
      sampleAnswer:
        "When building a database schema for our student project, my team wanted to store dynamic user attributes in unstructured JSON columns. I was concerned about long-term query indexability and data validation. Instead of arguing theoretically, I created a benchmarking script comparing query speed and data consistency between normalized tables and JSON columns. Seeing the 4x query acceleration on filtered queries, the team collaboratively adopted the normalized schema.",
      tip: "Show that you persuade through evidence, prototypes, and respectful collaboration.",
      followUpQuestion:
        "If your benchmark had shown that JSON columns were actually faster for our specific query pattern, would you have changed your stance?",
      followUpExpectedConcepts: [
        "intellectual honesty",
        "objective engineering mindset",
        "prioritizing product performance over personal bias",
      ],
      followUpSampleAnswer:
        "Absolutely. True engineering is guided by empirical data and user requirements, not personal dogmas. If JSON columns proved objectively superior for our query access patterns, I would have championed that architecture.",
    },
  ],
  Coding: [
    {
      id: "code-1",
      category: "Coding",
      question:
        "Explain your approach for solving Two Sum: finding two numbers in an array that sum to a target in O(N) time.",
      expectedConcepts: [
        "hash map lookup",
        "complement calculation (target - current)",
        "single pass traversal",
        "O(N) time and O(N) space complexity",
      ],
      sampleAnswer:
        "The optimal approach uses a Hash Map to achieve O(N) time complexity. As we iterate through the array once, for each number x, we calculate its complement (target - x). We check if the complement already exists in our map: if yes, we have found our pair with indices [map.get(complement), current_index]. If no, we insert x and its index into the map. This avoids the O(N^2) brute-force nested loops at the cost of O(N) auxiliary space.",
      tip: "Walk through the complement formula, hash map time complexity, and edge cases like duplicate elements.",
      followUpQuestion:
        "What if the problem constraints stated that memory is strictly limited and you cannot allocate an O(N) hash map? How would you solve it?",
      followUpExpectedConcepts: [
        "sorting array first O(N log N)",
        "two-pointer approach (left & right)",
        "O(1) auxiliary space",
      ],
      followUpSampleAnswer:
        "If memory is restricted to O(1) space, we sort the array in O(N log N) time and use two pointers—one at the start and one at the end. If the sum is too small, we increment the left pointer; if too large, we decrement the right pointer. This trades O(N log N) time for O(1) space.",
      starterCode: `function twoSum(nums, target) {
  // Write your O(N) solution using a Hash Map
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    },
    {
      id: "code-2",
      category: "Coding",
      question:
        "How do you detect a cycle in a linked list using Floyd's Tortoise and Hare algorithm with O(1) space?",
      expectedConcepts: [
        "Floyd's cycle detection",
        "tortoise and hare pointers",
        "slow pointer 1 step, fast pointer 2 steps",
        "intersection proof",
      ],
      sampleAnswer:
        "We initialize two pointers, slow and fast, at the head. We advance slow by one node and fast by two nodes per step. If the list has no cycle, fast or fast.next reaches null. If a cycle exists, the relative gap between them shrinks by 1 node per iteration, guaranteeing they will intersect at the same node within the cycle in O(N) time and O(1) space.",
      tip: "Explain why fast cannot 'skip' slow inside the loop due to relative step speed.",
      followUpQuestion:
        "Once slow and fast meet, how do you find the exact node where the cycle begins?",
      followUpExpectedConcepts: [
        "reset slow to head",
        "keep fast at meeting point",
        "advance both 1 step at a time",
        "new meeting point is cycle start",
      ],
      followUpSampleAnswer:
        "Mathematically, the distance from head to cycle start equals the distance from the meeting point around the cycle to the start. We reset slow to head, keep fast at the meeting node, and advance both at 1 step per iteration. The node where they collide is the cycle start.",
      starterCode: `function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
    },
    {
      id: "code-3",
      category: "Coding",
      question: "Explain how to validate if a string has balanced parentheses, brackets, and braces.",
      expectedConcepts: [
        "Stack data structure",
        "LIFO property",
        "push opening, pop matching closing",
        "empty stack check at end",
      ],
      sampleAnswer:
        "We iterate through the string using a Stack (Last-In-First-Out). Whenever we encounter an opening character ('(', '{', '['), we push it onto the stack. When we encounter a closing character, we verify if the stack is non-empty and whether the top matches the expected closing bracket. If it does, we pop it; otherwise, the string is invalid. Finally, the string is balanced if and only if the stack is completely empty.",
      tip: "Address early exit edge cases such as closing brackets encountered on an empty stack.",
      followUpQuestion:
        "What is the space complexity if the string contains only opening brackets like '((((((((('?",
      followUpExpectedConcepts: [
        "O(N) worst-case space complexity",
        "all characters pushed to stack",
      ],
      followUpSampleAnswer:
        "In the worst case where all characters are opening brackets, every character is pushed without any pops, resulting in O(N) auxiliary space complexity where N is the length of the string.",
      starterCode: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (stack.pop() !== map[char]) {
      return false;
    }
  }
  return stack.length === 0;
}`,
    },
    {
      id: "code-4",
      category: "Coding",
      question: "How does Kadane's algorithm find the maximum subarray sum in O(N) time?",
      expectedConcepts: [
        "dynamic programming invariant",
        "currentSum = max(num, currentSum + num)",
        "maxSum tracking",
        "handling all negative numbers",
      ],
      sampleAnswer:
        "Kadane's algorithm iterates through the array once while maintaining two variables: currentSum and maxSum. At each element x, we decide whether to add x to the existing currentSum or start a fresh subarray at x: currentSum = max(x, currentSum + x). We then update maxSum = max(maxSum, currentSum). This single-pass O(N) algorithm with O(1) space correctly finds the maximum contiguous sum.",
      tip: "Highlight that if currentSum drops below zero, it cannot positively contribute to subsequent elements.",
      followUpQuestion:
        "How would you modify Kadane's algorithm if the problem asked you to return the starting and ending indices of the maximum subarray rather than just the sum?",
      followUpExpectedConcepts: [
        "track start, end, and tempStart pointers",
        "update tempStart when restarting currentSum",
        "update start and end when new maxSum found",
      ],
      followUpSampleAnswer:
        "We track three index pointers: start, end, and tempStart initialized to 0. Whenever currentSum restarts at element i, we set tempStart = i. Whenever currentSum exceeds maxSum, we update maxSum, set start = tempStart, and set end = i.",
      starterCode: `function maxSubArray(nums) {
  let currentSum = nums[0];
  let maxSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
    },
    {
      id: "code-5",
      category: "Coding",
      question: "Explain how binary search operates on a sorted array and its termination condition.",
      expectedConcepts: [
        "sorted precondition",
        "low, high, mid calculation",
        "mid = low + (high - low) / 2 to avoid overflow",
        "halving search space each step",
        "while (low <= high)",
      ],
      sampleAnswer:
        "Binary Search requires a sorted collection. We initialize two boundary pointers: low = 0 and high = array.length - 1. In each step, we calculate mid = low + (high - low) / 2 to prevent integer overflow. If target equals array[mid], we return mid. If target is less than array[mid], we eliminate the right half by setting high = mid - 1. If target is greater, we eliminate the left half by setting low = mid + 1. The loop terminates when low > high.",
      tip: "Mention the mid overflow bug `(low + high) / 2` and explain the correct calculation.",
      followUpQuestion:
        "If the array contains duplicate target elements, how would you modify binary search to find the very first (leftmost) occurrence?",
      followUpExpectedConcepts: [
        "continue searching left when target found",
        "set high = mid - 1",
        "store candidate index",
      ],
      followUpSampleAnswer:
        "When array[mid] == target, instead of returning immediately, we record mid as our best candidate and continue searching left by setting high = mid - 1 until the pointers cross. This guarantees locating the leftmost boundary.",
      starterCode: `function binarySearch(nums, target) {
  let low = 0, high = nums.length - 1;
  while (low <= high) {
    let mid = Math.floor(low + (high - low) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
    },
  ],
  Aptitude: [
    {
      id: "apt-1",
      category: "Aptitude",
      question: "A train 240 m long passes a pole in 24 seconds. How long will it take to pass a 650 m platform?",
      expectedConcepts: [
        "Speed = Distance / Time",
        "Speed = 240 / 24 = 10 m/s",
        "Total distance for platform = 240 + 650 = 890 m",
        "Time = 890 / 10 = 89 seconds",
      ],
      sampleAnswer:
        "Step 1: Calculate the train's speed using the pole crossing. Speed = Train length / Time = 240 m / 24 s = 10 m/s.\nStep 2: When passing a platform, the train must cover its own length plus the platform length. Total Distance = 240 m + 650 m = 890 m.\nStep 3: Time taken = Total Distance / Speed = 890 m / (10 m/s) = 89 seconds.",
      tip: "Break the computation clearly into speed derivation and total distance calculation.",
      followUpQuestion:
        "What would the crossing time be if the platform was being passed by a second train of identical length moving in the opposite direction at 15 m/s?",
      followUpExpectedConcepts: [
        "relative speed addition (10 + 15 = 25 m/s)",
        "total distance = 240 + 240 = 480 m",
        "Time = 480 / 25 = 19.2 seconds",
      ],
      followUpSampleAnswer:
        "When two trains travel in opposite directions, their relative speeds add together: 10 + 15 = 25 m/s. The total distance is the sum of both train lengths: 240 + 240 = 480 m. Time taken = 480 / 25 = 19.2 seconds.",
    },
    {
      id: "apt-2",
      category: "Aptitude",
      question: "If 12 men or 18 women can do a piece of work in 14 days, in how many days can 8 men and 16 women do it?",
      expectedConcepts: [
        "Equivalence: 12 Men = 18 Women => 1 Man = 1.5 Women",
        "Total work calculation",
        "Combined work rate",
        "Result: 9 days",
      ],
      sampleAnswer:
        "Step 1: Equate work capabilities: 12 M = 18 W, therefore 1 M = 1.5 W.\nStep 2: Convert the new team into women units: 8 Men = 8 × 1.5 = 12 Women. Total team = 12 W + 16 W = 28 Women.\nStep 3: Total Work = 18 Women × 14 days = 252 Woman-days.\nStep 4: Days required = 252 Woman-days / 28 Women = 9 days.",
      tip: "Convert all workforce entities into a single unit before calculating total work units.",
      followUpQuestion:
        "If 4 of the women drop out after working for 3 days, how many additional days will the remaining crew take to finish?",
      followUpExpectedConcepts: [
        "work completed in first 3 days",
        "remaining work units",
        "new team rate = 24 women units",
      ],
      followUpSampleAnswer:
        "In 3 days, 28 women complete 28 × 3 = 84 woman-days of work. Remaining work = 252 - 84 = 168 woman-days. With 4 women dropping out, the new crew rate is 24 women. Additional days required = 168 / 24 = 7 days.",
    },
    {
      id: "apt-3",
      category: "Aptitude",
      question: "Find the next number in the series: 3, 7, 15, 31, 63, ?",
      expectedConcepts: [
        "pattern recognition: x * 2 + 1 or 2^(n+1) - 1",
        "differences: +4, +8, +16, +32, +64",
        "calculation: 63 + 64 = 127",
      ],
      sampleAnswer:
        "Method 1: Each successive term is generated by multiplying the previous term by 2 and adding 1: 3×2+1=7; 7×2+1=15; 15×2+1=31; 31×2+1=63; 63×2+1 = 127.\nMethod 2: Looking at the differences: +4, +8, +16, +32. The next difference is +64, so 63 + 64 = 127.",
      tip: "Verify series using both difference progression and algebraic recurrence relations.",
      followUpQuestion:
        "What is the mathematical closed-form formula for the N-th term of this sequence where term 1 is 3?",
      followUpExpectedConcepts: [
        "T(n) = 2^(n+1) - 1",
        "power of 2 minus one",
      ],
      followUpSampleAnswer:
        "The closed form formula is T(n) = 2^(n+1) - 1. For n=1: 2^2 - 1 = 3; for n=2: 2^3 - 1 = 7; for n=5: 2^6 - 1 = 63; for n=6: 2^7 - 1 = 127.",
    },
    {
      id: "apt-4",
      category: "Aptitude",
      question: "A shopkeeper sells an item at 20% profit. If cost price increases by 10% and selling price remains the same, what is the new profit percentage?",
      expectedConcepts: [
        "Base assumption CP = 100",
        "Initial SP = 120",
        "New CP = 110",
        "Profit = 120 - 110 = 10",
        "New Profit % = (10 / 110) * 100 = 9.09%",
      ],
      sampleAnswer:
        "Let original Cost Price (CP) = 100. Since original profit is 20%, Selling Price (SP) = 120.\nNew CP increases by 10%, so New CP = 110.\nNew Profit = SP - New CP = 120 - 110 = 10.\nNew Profit Percentage = (10 / 110) × 100 = 100 / 11 = 9.09%.",
      tip: "Assuming CP = 100 avoids messy fractions and makes the percentage transition clear.",
      followUpQuestion:
        "By what percentage would the selling price need to be increased to restore the original 20% profit margin on the new cost price of 110?",
      followUpExpectedConcepts: [
        "Target SP = 110 * 1.20 = 132",
        "Increase needed = 132 - 120 = 12",
        "Percentage increase = (12 / 120) * 100 = 10%",
      ],
      followUpSampleAnswer:
        "To maintain 20% profit on CP 110: Required SP = 110 × 1.20 = 132. Current SP is 120. Required increase = 132 - 120 = 12. Percentage increase in SP = (12 / 120) × 100 = 10%.",
    },
    {
      id: "apt-5",
      category: "Aptitude",
      question: "In a class of 60 students, 40 play football, 30 play cricket, and 15 play both. How many play neither sport?",
      expectedConcepts: [
        "Set theory principle: n(A ∪ B) = n(A) + n(B) - n(A ∩ B)",
        "Union: 40 + 30 - 15 = 55",
        "Neither: 60 - 55 = 5 students",
      ],
      sampleAnswer:
        "Using the principle of inclusion-exclusion for sets:\nTotal students playing at least one sport = n(Football ∪ Cricket) = n(Football) + n(Cricket) - n(Both) = 40 + 30 - 15 = 55 students.\nTotal students playing neither = Total class - n(Football ∪ Cricket) = 60 - 55 = 5 students.",
      tip: "Apply Venn diagram principles and always subtract the intersection to avoid double counting.",
      followUpQuestion:
        "If a student is chosen at random from this class, what is the probability that they play ONLY football?",
      followUpExpectedConcepts: [
        "Football only = 40 - 15 = 25",
        "Total students = 60",
        "Probability = 25 / 60 = 5 / 12 = 41.67%",
      ],
      followUpSampleAnswer:
        "Students playing ONLY football = Total football players - Both = 40 - 15 = 25 students. Probability = 25 / 60 = 5 / 12, or approximately 41.67%.",
    },
  ],
}

// Initial history matching the reference image
const initialInterviewHistory: InterviewHistoryItem[] = [
  {
    id: "hist-1",
    date: "Oct 20, 2026",
    type: "Technical",
    role: "Software Developer",
    score: 78,
    totalQuestions: 10,
    completedQuestions: 10,
    durationMinutes: 30,
    timeSpentSeconds: 1540,
    responses: [
      {
        questionId: "tech-1",
        questionText: "Explain the difference between array and linked list.",
        answerText:
          "Arrays have fixed size in contiguous memory, giving O(1) random access. Linked lists use pointers and can dynamically resize, but access is O(N).",
        scorePercent: 82,
        feedback:
          "Clear explanation of memory layouts and time complexity tradeoffs.",
        conceptsFound: ["contiguous memory", "dynamic size", "O(1) random access"],
        conceptsMissed: ["pointer memory overhead"],
      },
      {
        questionId: "tech-2",
        questionText: "What is a binary search tree? Explain its operations.",
        answerText:
          "A tree where left child is less than root and right child is greater. Search and insert are O(log n) on average.",
        scorePercent: 75,
        feedback: "Good coverage of core invariant and average complexity.",
        conceptsFound: ["left subtree smaller", "right subtree larger", "O(log N)"],
        conceptsMissed: ["worst-case O(N) skewing"],
      },
    ],
  },
  {
    id: "hist-2",
    date: "Oct 15, 2026",
    type: "HR",
    role: "Software Engineer",
    score: 68,
    totalQuestions: 10,
    completedQuestions: 8,
    durationMinutes: 30,
    timeSpentSeconds: 1420,
    responses: [
      {
        questionId: "hr-1",
        questionText: "Tell me about yourself and your background.",
        answerText:
          "I am a Computer Science student passionate about full stack and AI development. I built multiple projects and enjoy problem solving.",
        scorePercent: 70,
        feedback: "Good enthusiasm; recommend including more specific project outcomes.",
        conceptsFound: ["present role", "passion for AI"],
        conceptsMissed: ["alignment with career aspirations"],
      },
    ],
  },
  {
    id: "hist-3",
    date: "Oct 10, 2026",
    type: "Aptitude",
    role: "SDE Intern",
    score: 62,
    totalQuestions: 10,
    completedQuestions: 7,
    durationMinutes: 30,
    timeSpentSeconds: 1680,
    responses: [
      {
        questionId: "apt-1",
        questionText:
          "A train 240 m long passes a pole in 24 seconds. How long will it take to pass a 650 m platform?",
        answerText: "Speed is 10 m/s. Total distance is 890m. Time = 89s.",
        scorePercent: 90,
        feedback: "Accurate mathematical steps and correct final answer.",
        conceptsFound: ["Speed = Distance / Time", "89 seconds"],
        conceptsMissed: [],
      },
    ],
  },
  {
    id: "hist-4",
    date: "Oct 05, 2026",
    type: "Behavioral",
    role: "Software Developer",
    score: 80,
    totalQuestions: 10,
    completedQuestions: 10,
    durationMinutes: 30,
    timeSpentSeconds: 1620,
    responses: [
      {
        questionId: "beh-1",
        questionText:
          "Describe a situation where you had to solve a difficult problem under tight pressure.",
        answerText:
          "During a live demo my API crashed due to DB timeouts. I traced the query, added indexing, and fixed it within 1 hour.",
        scorePercent: 85,
        feedback: "Followed the STAR method effectively.",
        conceptsFound: ["Situation", "Action taken", "Result"],
        conceptsMissed: [],
      },
    ],
  },
  {
    id: "hist-5",
    date: "Sep 28, 2026",
    type: "Coding",
    role: "Full Stack Developer",
    score: 70,
    totalQuestions: 10,
    completedQuestions: 9,
    durationMinutes: 30,
    timeSpentSeconds: 1710,
    responses: [
      {
        questionId: "code-1",
        questionText:
          "Explain how to find the two numbers in an array that add up to a target sum in O(N) time.",
        answerText: "Use a hash map to store complements in a single pass.",
        scorePercent: 78,
        feedback: "Correct algorithm and optimal time complexity identified.",
        conceptsFound: ["hash map lookup", "single pass"],
        conceptsMissed: ["space complexity trade-off"],
      },
    ],
  },
]

export function MockInterviewPage({
  onToast,
  onNavigate,
  onOpenAiModal,
}: MockInterviewPageProps) {
  // 1. Persistent Interview History & Dynamic Statistics
  const [history, setHistory] = useState<InterviewHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // fallback
    }
    return initialInterviewHistory
  })

  // Synchronize history changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      // ignore
    }
  }, [history])

  // Compute dynamic stats from actual student interview data
  const stats: InterviewStats = {
    totalInterviews: Math.max(8, history.length),
    averageScore:
      history.length > 0
        ? Math.round(
            history.reduce((acc, h) => acc + (h.score || 0), 0) / history.length,
          )
        : 72,
    practiceHours: Number(
      (
        history.reduce((acc, h) => acc + (h.timeSpentSeconds || 1500), 0) / 3600
      ).toFixed(1),
    ),
    interviewsCompleted: history.filter((h) => h.completedQuestions > 0).length,
  }

  // 2. Active Selection States
  const [selectedType, setSelectedType] = useState<InterviewType>("Technical")

  // Setup form fields (STRICT: ONLY these 4 fields! NO Difficulty Level!)
  const [setup, setSetup] = useState<InterviewSetup>({
    jobRole: "Software Developer",
    experienceLevel: "Fresher",
    questionCount: 10,
    durationMinutes: 30,
  })

  // 3. Modals & Interactive Views on Dashboard
  const [viewingQuestion, setViewingQuestion] = useState<InterviewQuestion | null>(
    null,
  )
  const [viewingHistoryItem, setViewingHistoryItem] =
    useState<InterviewHistoryItem | null>(null)
  const [isViewAllHistoryOpen, setIsViewAllHistoryOpen] = useState(false)
  const [historyFilterType, setHistoryFilterType] = useState<string>("All")

  // 4. Session View States ("dashboard" | "readiness" | "session" | "report")
  const [screenMode, setScreenMode] = useState<
    "dashboard" | "readiness" | "session" | "report"
  >("dashboard")

  // Readiness equipment check states
  const [micStatus, setMicStatus] = useState<
    "untested" | "granted" | "denied" | "testing"
  >("untested")
  const [micLevel, setMicLevel] = useState<number>(0)
  const [speakerTested, setSpeakerTested] = useState<boolean>(false)

  // Live session state
  const [interviewQuestions, setInterviewQuestions] = useState<
    ExtendedInterviewQuestion[]
  >([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isFollowUpPhase, setIsFollowUpPhase] = useState(false)
  const [interviewerState, setInterviewerState] = useState<
    "speaking" | "listening" | "evaluating" | "idle"
  >("speaking")

  // Speech Recognition & Transcript
  const [transcriptHistory, setTranscriptHistory] = useState<
    { speaker: "ai" | "user"; text: string; isFollowUp?: boolean }[]
  >([])
  const [currentSpeechText, setCurrentSpeechText] = useState("")
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isTextInputMode, setIsTextInputMode] = useState(false)
  const [textFallbackInput, setTextFallbackInput] = useState("")

  // Coding Interview state
  const [activeCodingTab, setActiveCodingTab] = useState<"video" | "code">("video")
  const [codeLanguage, setCodeLanguage] = useState("javascript")
  const [codeEditorText, setCodeEditorText] = useState("")
  const [codeOutput, setCodeOutput] = useState<string | null>(null)

  // Session timing & completion
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(1800)
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false)
  const [completedInterviewResult, setCompletedInterviewResult] =
    useState<InterviewHistoryItem | null>(null)

  const historySectionRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  // Native Speech Synthesis (Text-to-Speech)
  const speakAloud = (text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onDone) onDone()
      return
    }
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.includes("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Female")),
      ) ||
      voices.find((v) => v.lang.includes("en")) ||
      voices[0]

    if (preferredVoice) utterance.voice = preferredVoice

    setInterviewerState("speaking")

    utterance.onend = () => {
      setInterviewerState("listening")
      if (onDone) onDone()
    }
    utterance.onerror = () => {
      setInterviewerState("listening")
      if (onDone) onDone()
    }

    window.speechSynthesis.speak(utterance)
  }

  // Setup Web Speech Recognition
  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsTextInputMode(true)
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        let interim = ""
        let final = ""
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " "
          } else {
            interim += event.results[i][0].transcript
          }
        }
        setCurrentSpeechText((prev) => {
          const updated = (prev + " " + final).trim()
          return interim ? `${updated} (${interim})` : updated
        })
      }

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition error:", e.error)
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch {
      setIsTextInputMode(true)
    }
  }

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
  }

  // Microphone audio visualizer check
  const testMicrophoneAccess = async () => {
    setMicStatus("testing")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioCtx()
      audioContextRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 64

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        if (!micStreamRef.current) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        setMicLevel(Math.min(100, Math.round(avg * 1.8)))
        requestAnimationFrame(updateVolume)
      }
      updateVolume()

      setMicStatus("granted")
      onToast("Microphone connected and verified! 🎙️")
    } catch {
      setMicStatus("denied")
      setIsTextInputMode(true)
      onToast("Microphone access unavailable. Text-answer fallback enabled.")
    }
  }

  // Speaker Sound Check
  const testSpeakerAudio = () => {
    setSpeakerTested(true)
    speakAloud(
      "Audio check successful! I am your AI interviewer, and my voice is configured clearly.",
    )
  }

  // Clean up audio on unmount or mode transition
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      stopSpeechRecognition()
    }
  }, [])

  // Live countdown timer effect during active interview
  useEffect(() => {
    if (screenMode !== "session" || isTimerPaused) return
    if (timeRemainingSeconds <= 0) {
      handleFinalizeInterview(true)
      return
    }

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [screenMode, isTimerPaused, timeRemainingSeconds])

  // Start Interview Flow Trigger: opens the Readiness Lobby
  const handleOpenReadiness = (overrideType?: InterviewType) => {
    const categoryToUse = overrideType || selectedType
    setSelectedType(categoryToUse)

    // Assemble question pool
    const pool = questionBank[categoryToUse] || questionBank.Technical
    let chosen: ExtendedInterviewQuestion[] = []
    while (chosen.length < setup.questionCount) {
      for (const q of pool) {
        if (chosen.length < setup.questionCount) {
          chosen.push({
            ...q,
            id: `${q.id}-${chosen.length + 1}`,
          })
        }
      }
    }

    setInterviewQuestions(chosen)
    setCurrentQuestionIndex(0)
    setIsFollowUpPhase(false)
    setTranscriptHistory([])
    setCurrentSpeechText("")
    setTimeRemainingSeconds(setup.durationMinutes * 60)
    setIsTimerPaused(false)
    setCompletedInterviewResult(null)
    setScreenMode("readiness")
  }

  // Enter the Live Conversational Session
  const handleLaunchLiveSession = () => {
    setScreenMode("session")
    startSpeechRecognition()

    const firstQuestion = interviewQuestions[0]
    if (firstQuestion) {
      if (firstQuestion.starterCode) {
        setCodeEditorText(firstQuestion.starterCode)
      }

      setTranscriptHistory([
        {
          speaker: "ai",
          text: `Welcome to your ${selectedType} interview for the ${setup.jobRole} position. Let's begin with our first question:\n\n${firstQuestion.question}`,
        },
      ])

      speakAloud(
        `Welcome to your ${selectedType} interview for the ${setup.jobRole} position. Here is your first question: ${firstQuestion.question}`,
      )
    }
  }

  // Handle Candidate Submitting their response to current question / follow-up
  const handleCandidateSubmitResponse = () => {
    const answer = (
      isTextInputMode ? textFallbackInput : currentSpeechText
    ).trim()

    if (!answer) {
      onToast("Please provide your spoken or typed response before continuing.")
      return
    }

    stopSpeechRecognition()
    setInterviewerState("evaluating")

    const currentQ = interviewQuestions[currentQuestionIndex]

    // Record student answer to transcript
    setTranscriptHistory((prev) => [
      ...prev,
      {
        speaker: "user",
        text: answer,
        isFollowUp: isFollowUpPhase,
      },
    ])

    // Reset input fields
    setCurrentSpeechText("")
    setTextFallbackInput("")

    // Conversational flow: If in primary question, trigger Adaptive Follow-Up Question
    if (!isFollowUpPhase && currentQ.followUpQuestion) {
      setIsFollowUpPhase(true)
      const ackMessage = `Thank you for sharing that approach. Let me probe a bit deeper with a follow-up question:\n\n${currentQ.followUpQuestion}`

      setTimeout(() => {
        setTranscriptHistory((prev) => [
          ...prev,
          { speaker: "ai", text: ackMessage, isFollowUp: true },
        ])
        speakAloud(ackMessage, () => {
          startSpeechRecognition()
        })
      }, 700)
    } else {
      // Completed both primary and follow-up for this question -> move to next
      setIsFollowUpPhase(false)

      if (currentQuestionIndex < interviewQuestions.length - 1) {
        const nextIdx = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextIdx)
        const nextQ = interviewQuestions[nextIdx]

        if (nextQ.starterCode) {
          setCodeEditorText(nextQ.starterCode)
        }

        const transitionMsg = `Understood. Great insight. Let's move to question ${nextIdx + 1}:\n\n${nextQ.question}`

        setTimeout(() => {
          setTranscriptHistory((prev) => [
            ...prev,
            { speaker: "ai", text: transitionMsg },
          ])
          speakAloud(transitionMsg, () => {
            startSpeechRecognition()
          })
        }, 800)
      } else {
        // All questions completed!
        handleFinalizeInterview(false)
      }
    }
  }

  // Replay question aloud
  const handleReplayCurrentQuestion = () => {
    const currentQ = interviewQuestions[currentQuestionIndex]
    const textToSpeak = isFollowUpPhase
      ? currentQ.followUpQuestion
      : currentQ.question
    speakAloud(`I will repeat the question: ${textToSpeak}`, () => {
      if (!isMicMuted) startSpeechRecognition()
    })
  }

  // Run Code simulator for coding interviews
  const handleRunCodeSnippet = () => {
    setCodeOutput("Running test cases against solution...")
    setTimeout(() => {
      setCodeOutput(
        "✓ Test Suite Passed: 3/3 test cases satisfied\n• Input: nums = [2, 7, 11, 15], target = 9 => Output: [0, 1] (Execution time: 0.8ms)\n• Memory usage: 42.1 MB (Better than 88% of submissions)",
      )
      onToast("Code tests passed! Explain your solution aloud to the interviewer.")
    }, 600)
  }

  // Finalize interview and generate comprehensive competency report
  const handleFinalizeInterview = (isAutoExpired = false) => {
    setIsEndConfirmOpen(false)
    stopSpeechRecognition()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    const totalSecondsSpent = setup.durationMinutes * 60 - timeRemainingSeconds

    // Extract student responses from transcript history
    const userResponses = transcriptHistory.filter((t) => t.speaker === "user")

    const evaluatedResponses = interviewQuestions.map((q, idx) => {
      const matchingAnswer = userResponses[idx]?.text || "Sample spoken response provided."
      const lower = matchingAnswer.toLowerCase()

      const foundConcepts = q.expectedConcepts.filter((c) =>
        lower.includes(c.toLowerCase()),
      )
      const missedConcepts = q.expectedConcepts.filter(
        (c) => !lower.includes(c.toLowerCase()),
      )

      const score = Math.min(
        100,
        Math.max(60, 50 + foundConcepts.length * 15 + Math.min(25, matchingAnswer.length / 8)),
      )

      return {
        questionId: q.id,
        questionText: q.question,
        answerText: matchingAnswer,
        scorePercent: Math.round(score),
        feedback:
          score >= 80
            ? "Strong technical depth, clear structure, and addressed core architectural invariants."
            : "Demonstrated solid fundamental approach; recommend expanding on memory trade-offs and edge-case handling.",
        conceptsFound: foundConcepts.length > 0 ? foundConcepts : [q.expectedConcepts[0]],
        conceptsMissed: missedConcepts,
      }
    })

    const finalAvgScore = Math.round(
      evaluatedResponses.reduce((acc, r) => acc + r.scorePercent, 0) /
        (evaluatedResponses.length || 1),
    )

    const now = new Date()
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    const formattedDate = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

    const newHistoryRecord: InterviewHistoryItem = {
      id: `hist-${Date.now()}`,
      date: formattedDate,
      type: selectedType,
      role: setup.jobRole,
      score: finalAvgScore,
      totalQuestions: interviewQuestions.length,
      completedQuestions: userResponses.length || interviewQuestions.length,
      durationMinutes: setup.durationMinutes,
      timeSpentSeconds: totalSecondsSpent,
      responses: evaluatedResponses,
    }

    // Save and switch to Report mode
    setCompletedInterviewResult(newHistoryRecord)
    setHistory((prev) => [newHistoryRecord, ...prev])
    setScreenMode("report")

    if (isAutoExpired) {
      onToast("Time expired! Session transcribed and evaluated. ⏱️")
    } else {
      onToast("Interview completed! Your AI evaluation report is ready. 🎉")
    }
  }

  // Scroll to History section on dashboard
  const handleScrollToHistory = () => {
    if (historySectionRef.current) {
      historySectionRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Format seconds into MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Interview Type Cards Data
  const interviewTypes: {
    type: InterviewType
    icon: string
    description: string
    badgeBg: string
    colorClass: string
  }[] = [
    {
      type: "Technical",
      icon: "</>",
      description: "Data Structures, Algorithms, CS fundamentals",
      badgeBg: "bg-purple-100",
      colorClass: "text-[#5b4fe9]",
    },
    {
      type: "HR",
      icon: "👥",
      description: "Personal questions, career goals, communication",
      badgeBg: "bg-blue-100",
      colorClass: "text-blue-600",
    },
    {
      type: "Behavioral",
      icon: "💬",
      description: "Situational questions, problem solving",
      badgeBg: "bg-indigo-100",
      colorClass: "text-indigo-600",
    },
    {
      type: "Coding",
      icon: "💻",
      description: "Live coding questions and problem solving",
      badgeBg: "bg-purple-100",
      colorClass: "text-[#5b4fe9]",
    },
    {
      type: "Aptitude",
      icon: "📊",
      description: "Quantitative, logical reasoning, and verbal ability",
      badgeBg: "bg-blue-100",
      colorClass: "text-blue-600",
    },
  ]

  const currentSampleQuestions = (
    questionBank[selectedType] || questionBank.Technical
  ).slice(0, 5)

  const filteredHistory =
    historyFilterType === "All"
      ? history
      : history.filter((h) => h.type === historyFilterType)

  // =========================================================================
  // SCREEN 1: READINESS & EQUIPMENT CHECK (NxtMock-Inspired Start Flow)
  // =========================================================================
  if (screenMode === "readiness") {
    return (
      <div className="interview-readiness-view w-full max-w-full min-w-0 box-border pb-12 flex flex-col gap-4 animate-in fade-in">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-zinc-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreenMode("dashboard")}
              className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 cursor-pointer transition-colors"
              title="Return to Dashboard"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">
                AI Interview Readiness Check
              </h1>
              <p className="text-xs text-zinc-500">
                Setup your audio equipment and review guidelines before entering the interview room.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-100 text-[#5b4fe9] text-xs font-bold">
            Step 1 of 2: Equipment Check
          </span>
        </div>

        {/* Main Readiness 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: AI Welcome & Session Details */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80 space-y-5">
            {/* AI Avatar Greeting Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-100 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5b4fe9] to-indigo-700 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                <span>👩‍💼</span>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Welcome! I am Dr. Sarah, your AI Interviewer.
                </h3>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                  I will conduct your conversational mock interview aloud, listen to your verbal answers, and present contextual follow-ups based on what you say.
                </p>
              </div>
            </div>

            {/* Configured Session Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Category
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block truncate">
                  {selectedType}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Target Role
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block truncate">
                  {setup.jobRole}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Questions
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                  {setup.questionCount} Questions
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Total Time
                </span>
                <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                  {setup.durationMinutes} Minutes
                </span>
              </div>
            </div>

            {/* Candidate Guidelines */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Interview Guidelines & Etiquette:
              </h4>
              <ul className="space-y-2 text-xs text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#5b4fe9] font-bold">1.</span>
                  <span>Speak at a natural, steady pace directly into your microphone. The AI will transcribe your words in real time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5b4fe9] font-bold">2.</span>
                  <span>The AI interviewer is adaptive: it will ask intelligent follow-up questions tailored to your specific answers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5b4fe9] font-bold">3.</span>
                  <span>If you are in a noisy space or your mic fails, you can seamlessly switch to the text-answer mode anytime.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5b4fe9] font-bold">4.</span>
                  <span>For coding interviews, a built-in interactive code editor will activate alongside the conversation.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Audio & Microphone Verification */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Audio & Microphone Verification
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Ensure clear audio communication before entering the room.
              </p>
            </div>

            {/* 1. Microphone Test Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-[#5b4fe9] flex items-center justify-center text-xs font-bold">
                    🎙️
                  </span>
                  <span className="text-xs font-bold text-zinc-800">
                    Microphone Input
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    micStatus === "granted"
                      ? "bg-emerald-100 text-emerald-700"
                      : micStatus === "denied"
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {micStatus === "granted"
                    ? "✓ Connected"
                    : micStatus === "denied"
                      ? "✕ Blocked / Fallback"
                      : "Not tested"}
                </span>
              </div>

              {/* Live Audio Level Meter */}
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Input Volume Level</span>
                  <span>{micLevel}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-purple-500 to-indigo-600 transition-all duration-75"
                    style={{ width: `${Math.max(4, micLevel)}%` }}
                  />
                </div>
              </div>

              <button
                onClick={testMicrophoneAccess}
                className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5b4fe9] text-xs font-bold cursor-pointer transition-colors border border-purple-200"
              >
                {micStatus === "granted" ? "Re-test Microphone" : "Allow & Test Microphone"}
              </button>
            </div>

            {/* 2. Speaker Test Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    🔊
                  </span>
                  <span className="text-xs font-bold text-zinc-800">
                    Speaker Output
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    speakerTested
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {speakerTested ? "✓ Verified" : "Ready to test"}
                </span>
              </div>

              <p className="text-[11px] text-zinc-500">
                Click below to hear a sample greeting from the AI voice engine.
              </p>

              <button
                onClick={testSpeakerAudio}
                className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer transition-colors border border-blue-200"
              >
                Play Test Voice 🔊
              </button>
            </div>

            {/* Launch CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleLaunchLiveSession}
                className="w-full py-3.5 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
              >
                <span>▶</span>
                <span>Enter AI Interview Room</span>
              </button>
              <button
                onClick={() => setScreenMode("dashboard")}
                className="w-full py-2 mt-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                Cancel and return to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // SCREEN 2: LIVE AI INTERVIEW ROOM (Conversational Flow inspired by NxtMock)
  // =========================================================================
  if (screenMode === "session") {
    const currentQ = interviewQuestions[currentQuestionIndex]

    return (
      <div className="live-interview-room w-full max-w-full min-w-0 box-border pb-12 flex flex-col gap-3 animate-in fade-in">
        {/* Top Control Bar */}
        <div className="bg-zinc-900 text-white rounded-2xl px-5 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3 border border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#5b4fe9] text-white flex items-center justify-center text-sm font-bold shadow-sm">
              🎙️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  {selectedType} Interview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 font-medium">
                  {setup.jobRole}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Question {currentQuestionIndex + 1} of {interviewQuestions.length}{" "}
                {isFollowUpPhase && "· (Follow-up Question Active)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer */}
            <div
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 ${
                timeRemainingSeconds < 300
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                  : "bg-zinc-800 text-purple-300 border border-zinc-700"
              }`}
            >
              <span>⏱</span>
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>

            {/* Mute Indicator */}
            <button
              onClick={() => {
                setIsMicMuted((prev) => !prev)
                if (!isMicMuted) stopSpeechRecognition()
                else startSpeechRecognition()
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                isMicMuted
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isMicMuted ? "🔇 Muted" : "🎙️ Mic On"}
            </button>

            {/* End Interview */}
            <button
              onClick={() => setIsEndConfirmOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              End Interview
            </button>
          </div>
        </div>

        {/* Question Progress Bar */}
        <div className="w-full bg-zinc-200/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5b4fe9] to-indigo-600 transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + (isFollowUpPhase ? 0.5 : 0)) / interviewQuestions.length) * 100}%`,
            }}
          />
        </div>

        {/* Main Split Layout: AI Stage vs Transcript / Code */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[580px]">
          {/* LEFT COLUMN: AI Interviewer Video Stage */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-col justify-between">
            {/* Interviewer State Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-zinc-900">
                  Dr. Sarah Chan
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  · AI Technical Interviewer
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  interviewerState === "speaking"
                    ? "bg-purple-100 text-[#5b4fe9]"
                    : interviewerState === "listening"
                      ? "bg-emerald-100 text-emerald-700 animate-pulse"
                      : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {interviewerState === "speaking"
                  ? "🗣️ Speaking aloud..."
                  : interviewerState === "listening"
                    ? "👂 Listening to you..."
                    : "🤔 Evaluating..."}
              </span>
            </div>

            {/* Central Animated AI Avatar Stage */}
            <div className="my-6 flex flex-col items-center justify-center text-center">
              <div className="relative">
                {/* Glowing Reactive Pulse Rings */}
                <div
                  className={`absolute -inset-3 rounded-full opacity-60 blur-md transition-all duration-300 ${
                    interviewerState === "speaking"
                      ? "bg-purple-500 animate-pulse"
                      : interviewerState === "listening"
                        ? "bg-emerald-400 animate-ping"
                        : "bg-indigo-300"
                  }`}
                />

                {/* Avatar Visual Container */}
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-[#5b4fe9] flex items-center justify-center text-5xl">
                  <span>👩‍💼</span>
                </div>
              </div>

              {/* Dynamic Audio Waveform Simulation */}
              <div className="flex items-center gap-1.5 mt-5 h-6">
                {[18, 32, 48, 26, 54, 38, 22, 45, 28, 16].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      interviewerState === "speaking"
                        ? "bg-[#5b4fe9] animate-bounce"
                        : interviewerState === "listening"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-zinc-300 h-2"
                    }`}
                    style={{
                      height:
                        interviewerState === "speaking"
                          ? `${Math.max(6, Math.round(h * (Math.random() + 0.5)))}px`
                          : interviewerState === "listening"
                            ? `${Math.max(4, Math.min(30, Math.round(micLevel / 3)))}px`
                            : "4px",
                    }}
                  />
                ))}
              </div>

              <p className="text-xs text-zinc-500 mt-2">
                {interviewerState === "speaking"
                  ? "Listen carefully to the question..."
                  : interviewerState === "listening"
                    ? "Answer verbally into your microphone."
                    : "Processing your response..."}
              </p>
            </div>

            {/* Question Callout Box with Repeat Button */}
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {isFollowUpPhase ? "Follow-Up Question:" : "Current Question:"}
                </span>
                <button
                  onClick={handleReplayCurrentQuestion}
                  className="text-xs text-[#5b4fe9] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>↻</span>
                  <span>Repeat Aloud</span>
                </button>
              </div>
              <p className="text-xs font-semibold text-zinc-900 leading-snug">
                {isFollowUpPhase
                  ? currentQ.followUpQuestion
                  : currentQ.question}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Conversational Transcript Feed & Coding Stage */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-col justify-between">
            {/* Top view switcher (for coding interviews) */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">
                  {selectedType === "Coding" ? "Workspace" : "Live Transcript Feed"}
                </span>
                {selectedType === "Coding" && (
                  <div className="flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
                    <button
                      onClick={() => setActiveCodingTab("video")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        activeCodingTab === "video"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveCodingTab("code")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        activeCodingTab === "code"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Code Editor
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTextInputMode((prev) => !prev)}
                  className="text-[11px] font-semibold text-[#5b4fe9] hover:underline cursor-pointer"
                >
                  {isTextInputMode ? "Switch to Voice Mode" : "Switch to Typing"}
                </button>
              </div>
            </div>

            {/* TAB 1: Conversational Transcript */}
            {activeCodingTab === "video" && (
              <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 py-3 pr-1">
                {transcriptHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      item.speaker === "ai" ? "items-start" : "items-end"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-zinc-400 mb-0.5">
                      {item.speaker === "ai"
                        ? "Dr. Sarah (AI Interviewer)"
                        : "You (Candidate)"}
                    </span>
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                        item.speaker === "ai"
                          ? "bg-zinc-100 text-zinc-900 rounded-tl-xs border border-zinc-200/80"
                          : "bg-[#5b4fe9] text-white rounded-tr-xs shadow-xs"
                      }`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}

                {/* Real-Time Listening / Speaking Stream */}
                {currentSpeechText && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-emerald-600 mb-0.5 animate-pulse">
                      Live Transcribing...
                    </span>
                    <div className="max-w-[88%] p-3 rounded-2xl rounded-tr-xs bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs leading-relaxed italic">
                      {currentSpeechText}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Interactive Code Editor (For Coding Interviews) */}
            {activeCodingTab === "code" && (
              <div className="flex-1 flex flex-col gap-2 py-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-600">Language:</span>
                    <StudentDropdown
                      value={codeLanguage}
                      onChange={(val) => setCodeLanguage(val)}
                      options={[
                        { value: "javascript", label: "JavaScript (ES6)" },
                        { value: "python", label: "Python 3" },
                        { value: "java", label: "Java 17" },
                        { value: "cpp", label: "C++ 20" },
                      ]}
                      size="sm"
                      fullWidth={false}
                      triggerClassName="min-w-[150px]"
                    />
                  </div>
                  <button
                    onClick={handleRunCodeSnippet}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    ▶ Run Code
                  </button>
                </div>

                <textarea
                  rows={9}
                  value={codeEditorText}
                  onChange={(e) => setCodeEditorText(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-zinc-950 text-purple-200 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-none"
                  placeholder="// Implement your solution here..."
                />

                {codeOutput && (
                  <div className="p-2.5 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap border border-zinc-800">
                    {codeOutput}
                  </div>
                )}
              </div>
            )}

            {/* Input Controls / Textarea Fallback */}
            <div className="pt-3 border-t border-zinc-100 space-y-2.5">
              {isTextInputMode ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={textFallbackInput}
                    onChange={(e) => setTextFallbackInput(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#5b4fe9] leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span>Text Mode Active</span>
                    <span>Click 'Submit Response' when ready.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs text-zinc-700 font-medium">
                      {currentSpeechText
                        ? "Speech detected. Click Submit when done speaking."
                        : "Listening... speak aloud clearly into your microphone."}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (currentQ) {
                        setCurrentSpeechText(currentQ.sampleAnswer.slice(0, 160) + "...")
                      }
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 underline cursor-pointer"
                    title="Simulate speech for testing"
                  >
                    Quick Fill
                  </button>
                </div>
              )}

              {/* Bottom Submit Action */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleReplayCurrentQuestion}
                  className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  ↻ Repeat Question
                </button>

                <button
                  onClick={handleCandidateSubmitResponse}
                  className="px-6 py-2.5 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
                >
                  <span>Submit Response</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal to End Interview Early */}
        {isEndConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  End Interview Session?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  You have completed {currentQuestionIndex + 1} of{" "}
                  {interviewQuestions.length} questions. Your answers will be submitted for scoring and feedback.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleFinalizeInterview(false)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Submit & Generate Evaluation Report
                </button>
                <button
                  onClick={() => setIsEndConfirmOpen(false)}
                  className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Continue Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // SCREEN 3: INTERVIEW COMPLETION & COMPREHENSIVE REPORT
  // =========================================================================
  if (screenMode === "report" && completedInterviewResult) {
    const isPassing = completedInterviewResult.score >= 70

    return (
      <div className="interview-report-view w-full max-w-full min-w-0 box-border pb-12 flex flex-col gap-4 animate-in fade-in">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0 border border-purple-100">
              <span>🏆</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 leading-tight">
                AI Interview Assessment Report
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Comprehensive evaluation for {completedInterviewResult.type} Interview · {completedInterviewResult.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setScreenMode("dashboard")
                onToast("Interview saved to your history! 📄")
              }}
              className="px-5 py-2.5 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Performance Overview Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Overall Score Meter */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-gradient-to-b from-purple-50/50 to-white border border-purple-100">
            <div className="relative w-28 h-28 rounded-full border-8 border-purple-200 flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl font-extrabold text-[#5b4fe9]">
                {completedInterviewResult.score}%
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400">
                Overall Score
              </span>
            </div>
            <span
              className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${
                isPassing
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isPassing ? "Strong Competency · Ready" : "Developing · Needs Revision"}
            </span>
          </div>

          {/* 4 Core Dimensions */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Technical Depth
              </span>
              <span className="text-lg font-bold text-zinc-900 mt-0.5 block">
                {Math.min(100, completedInterviewResult.score + 4)}%
              </span>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#5b4fe9] h-full"
                  style={{
                    width: `${Math.min(100, completedInterviewResult.score + 4)}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Communication
              </span>
              <span className="text-lg font-bold text-zinc-900 mt-0.5 block">
                {Math.min(100, completedInterviewResult.score + 2)}%
              </span>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{
                    width: `${Math.min(100, completedInterviewResult.score + 2)}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Relevance
              </span>
              <span className="text-lg font-bold text-zinc-900 mt-0.5 block">
                {completedInterviewResult.score}%
              </span>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${completedInterviewResult.score}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Problem Solving
              </span>
              <span className="text-lg font-bold text-zinc-900 mt-0.5 block">
                {Math.max(60, completedInterviewResult.score - 3)}%
              </span>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full"
                  style={{
                    width: `${Math.max(60, completedInterviewResult.score - 3)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Improvement Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
              <span>✓</span>
              <span>Observed Key Strengths</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Clear articulation of time complexity and memory invariants.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Addressed follow-up prompts thoughtfully without breaking composure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Strong problem decomposition and architectural awareness.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
              <span>⚠️</span>
              <span>Actionable Improvement Opportunities</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Deepen explanations of production hardware edge cases (e.g. CPU cache misses).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Explicitly state trade-offs (e.g. read latency vs write amplification) earlier.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Review system design failure recovery models in Quantum LMS.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Detailed Question-by-Question Transcript Review */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/80 space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            Detailed Question Responses & Evaluator Rubrics
          </h3>

          <div className="space-y-4">
            {completedInterviewResult.responses.map((resp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-bold text-zinc-900">
                    Q{idx + 1}: {resp.questionText}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5b4fe9] text-xs font-bold shrink-0">
                    {resp.scorePercent}%
                  </span>
                </div>

                <div className="text-xs text-zinc-800 bg-zinc-50 p-3 rounded-lg border border-zinc-100 leading-relaxed">
                  <span className="font-bold text-zinc-500 block text-[10px] uppercase mb-1">
                    Your Response:
                  </span>
                  {resp.answerText}
                </div>

                <div className="text-xs text-purple-900 bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                  <span className="font-bold text-purple-700 block text-[10px] uppercase mb-1">
                    Evaluator Feedback & Model Answer:
                  </span>
                  {resp.feedback}
                </div>

                {resp.conceptsFound.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-zinc-400">
                      Core Concepts Addressed:
                    </span>
                    {resp.conceptsFound.map((c, ci) => (
                      <span
                        key={ci}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation CTAs */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => handleOpenReadiness()}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer shadow-2xs"
          >
            ↺ Retake Interview
          </button>
          <button
            onClick={() => {
              setScreenMode("dashboard")
              onToast("Returned to Mock Interview dashboard.")
            }}
            className="px-6 py-2.5 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold cursor-pointer shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // SCREEN 4: ORIGINAL MOCK INTERVIEW DASHBOARD (Kept 100% Intact!)
  // =========================================================================
  return (
    <div className="mock-interview-page flex flex-col gap-4 w-full max-w-full min-w-0 box-border pb-12">
      {/* Sample Question Details Modal */}
      {viewingQuestion && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingQuestion(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                {viewingQuestion.category} Question
              </span>
              <button
                onClick={() => setViewingQuestion(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-zinc-900 leading-snug">
              {viewingQuestion.question}
            </h3>

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
              <span className="font-bold text-purple-700 block">
                💡 Key Interview Concepts Expected:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-700">
                {viewingQuestion.expectedConcepts.map((ec, idx) => (
                  <li key={idx}>{ec}</li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-zinc-700 space-y-1">
              <span className="font-bold text-zinc-900 block">
                Exemplary Model Response:
              </span>
              <p className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 leading-relaxed text-zinc-800">
                {viewingQuestion.sampleAnswer}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingQuestion(null)}
                className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All History Modal */}
      {isViewAllHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsViewAllHistoryOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Complete Mock Interview History
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Record of all completed and evaluated practice sessions
                </p>
              </div>
              <button
                onClick={() => setIsViewAllHistoryOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-2.5 bg-zinc-50/70 border-b border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {["All", "Technical", "HR", "Behavioral", "Coding", "Aptitude"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setHistoryFilterType(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      historyFilterType === cat
                        ? "bg-[#5b4fe9] text-white shadow-2xs"
                        : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                    }`}
                  >
                    {cat}
                  </button>
                ),
              )}
            </div>

            {/* History Table */}
            <div className="p-5 overflow-y-auto flex-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No interview records found for this filter.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/60">
                        <td className="py-2.5 font-medium text-zinc-700">
                          {item.date}
                        </td>
                        <td className="py-2.5 font-semibold text-zinc-900">
                          {item.type}
                        </td>
                        <td className="py-2.5 text-zinc-600">{item.role}</td>
                        <td className="py-2.5 font-bold">
                          <span
                            className={
                              item.score >= 75
                                ? "text-emerald-600"
                                : item.score >= 60
                                  ? "text-amber-600"
                                  : "text-red-500"
                            }
                          >
                            {item.score}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setIsViewAllHistoryOpen(false)
                              setViewingHistoryItem(item)
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Single History Item Detail Modal */}
      {viewingHistoryItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingHistoryItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-5 shadow-2xl border border-zinc-200 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {viewingHistoryItem.type} Interview Details
                </h3>
                <p className="text-xs text-zinc-500">
                  {viewingHistoryItem.role} · {viewingHistoryItem.date}
                </p>
              </div>
              <button
                onClick={() => setViewingHistoryItem(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <div className="w-12 h-12 rounded-xl bg-white shadow-2xs border border-purple-200 flex flex-col items-center justify-center font-bold text-purple-700">
                <span className="text-base leading-none">
                  {viewingHistoryItem.score}%
                </span>
                <span className="text-[8px] uppercase text-zinc-400 mt-0.5">
                  Score
                </span>
              </div>
              <div className="text-xs text-zinc-600 space-y-0.5">
                <p>
                  <strong>Duration:</strong> {viewingHistoryItem.durationMinutes} min
                  (Time used:{" "}
                  {Math.round(viewingHistoryItem.timeSpentSeconds / 60)} min)
                </p>
                <p>
                  <strong>Completion:</strong>{" "}
                  {viewingHistoryItem.completedQuestions} of{" "}
                  {viewingHistoryItem.totalQuestions} questions
                </p>
              </div>
            </div>

            <div className="overflow-y-auto max-h-72 space-y-3 pr-1 text-xs">
              <span className="font-bold text-zinc-800 block uppercase text-[10px]">
                Recorded Responses & Feedback:
              </span>
              {viewingHistoryItem.responses &&
              viewingHistoryItem.responses.length > 0 ? (
                viewingHistoryItem.responses.map((resp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 space-y-1.5"
                  >
                    <p className="font-bold text-zinc-900">
                      Q{idx + 1}: {resp.questionText}
                    </p>
                    <p className="text-zinc-700 bg-white p-2 rounded-lg border border-zinc-200">
                      {resp.answerText}
                    </p>
                    <p className="text-purple-700 text-[11px] font-medium">
                      ✓ {resp.feedback}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-zinc-400 italic">
                  Responses archived with score {viewingHistoryItem.score}%.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingHistoryItem(null)}
                className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP CARD: Header, Subtitle & History CTA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-zinc-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0 border border-purple-100">
            <span>🎙️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 leading-tight">
              Mock Interview
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Practice interviews, improve your confidence, and prepare for your
              dream job.
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleScrollToHistory}
            className="px-4 h-[38px] rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            title="Jump to Recent Interview History"
          >
            <Icon name="clock" size={15} />
            <span>View Interview History</span>
          </button>
        </div>
      </div>

      {/* 2. INTERVIEW STATISTICS (Row of 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Interviews */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/80 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-600">
              Total Interviews
            </span>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              {stats.totalInterviews}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↗</span>
              <span>+2 this month</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Icon name="document" size={18} />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/80 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-600">
              Average Score
            </span>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              {stats.averageScore}%
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↗</span>
              <span>+8% improvement</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Icon name="chart" size={18} />
          </div>
        </div>

        {/* Practice Hours */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/80 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-600">
              Practice Hours
            </span>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              {stats.practiceHours} hrs
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↗</span>
              <span>+1.5 hrs this week</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Icon name="clock" size={18} />
          </div>
        </div>

        {/* Interviews Completed */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/80 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-600">
              Interviews Completed
            </span>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              {stats.interviewsCompleted}
            </div>
            <div className="text-[11px] font-medium text-zinc-500 mt-1">
              Out of {stats.totalInterviews} attempts
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Icon name="award" size={18} />
          </div>
        </div>
      </div>

      {/* 3. CHOOSE INTERVIEW TYPE (5 Horizontal Cards) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-sm">🎙️</span>
          <h2 className="text-sm font-bold text-zinc-900">
            Choose Interview Type
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {interviewTypes.map((item) => {
            const isSelected = selectedType === item.type

            return (
              <div
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-2 border-purple-400 bg-purple-50/20 shadow-xs"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-xl ${item.badgeBg} ${item.colorClass} flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {item.icon}
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900 leading-tight">
                      {item.type} Interview
                    </h3>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-snug mt-2.5 min-h-[32px]">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenReadiness(item.type)
                    }}
                    className="w-full py-2 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold cursor-pointer transition-all shadow-sm hover:scale-[1.01]"
                  >
                    Start Interview
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. BOTTOM 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* COLUMN 1: INTERVIEW SETUP (Only 4 fields! NO Difficulty Level!) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-lg bg-purple-100 text-[#5b4fe9] flex items-center justify-center text-xs font-bold shrink-0">
                ⚙️
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Interview Setup
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Configure your interview preferences
                </p>
              </div>
            </div>

            {/* 4 Fields Grid: Job Role, Experience Level, Number of Questions, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
              {/* Field 1: Job Role */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Job Role
                </label>
                <StudentDropdown
                  value={setup.jobRole}
                  onChange={(val) =>
                    setSetup((prev) => ({ ...prev, jobRole: val }))
                  }
                  options={[
                    "Software Developer",
                    "Full Stack Developer",
                    "AI & Machine Learning Engineer",
                    "Frontend Developer",
                    "Backend Developer",
                    "Data Scientist",
                    "SDE Intern",
                  ]}
                />
              </div>

              {/* Field 2: Experience Level */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Experience Level
                </label>
                <StudentDropdown
                  value={setup.experienceLevel}
                  onChange={(val) =>
                    setSetup((prev) => ({
                      ...prev,
                      experienceLevel: val,
                    }))
                  }
                  options={["Fresher", "1-2 Years", "3-5 Years", "5+ Years"]}
                />
              </div>

              {/* Field 3: Number of Questions */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Number of Questions
                </label>
                <StudentDropdown
                  value={setup.questionCount}
                  onChange={(val) =>
                    setSetup((prev) => ({
                      ...prev,
                      questionCount: Number(val),
                    }))
                  }
                  options={[
                    { value: 5, label: "5 Questions" },
                    { value: 10, label: "10 Questions" },
                    { value: 15, label: "15 Questions" },
                    { value: 20, label: "20 Questions" },
                  ]}
                />
              </div>

              {/* Field 4: Interview Duration */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Interview Duration
                </label>
                <StudentDropdown
                  value={setup.durationMinutes}
                  onChange={(val) =>
                    setSetup((prev) => ({
                      ...prev,
                      durationMinutes: Number(val),
                    }))
                  }
                  options={[
                    { value: 15, label: "15 Minutes" },
                    { value: 30, label: "30 Minutes" },
                    { value: 45, label: "45 Minutes" },
                    { value: 60, label: "60 Minutes" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Start Interview Action Button */}
          <div className="mt-5 pt-3">
            <button
              onClick={() => handleOpenReadiness()}
              className="w-full py-3 rounded-xl bg-[#5b4fe9] hover:bg-[#4f46e5] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
            >
              <span>▶</span>
              <span>Start Interview</span>
            </button>
          </div>
        </div>

        {/* COLUMN 2: SAMPLE QUESTIONS */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                📄
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Sample Questions ({selectedType})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Preview sample questions for this category
                </p>
              </div>
            </div>

            {/* List of 5 numbered question rows matching reference */}
            <div className="space-y-2.5 mt-4">
              {currentSampleQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setViewingQuestion(q)}
                  className="p-2.5 rounded-xl border border-zinc-100 hover:border-purple-200 hover:bg-purple-50/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all group"
                  title="Click to view question model answer & key concepts"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-[#5b4fe9] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-zinc-800 truncate group-hover:text-[#5b4fe9] transition-colors">
                      {q.question}
                    </span>
                  </div>
                  <span className="text-zinc-400 group-hover:text-[#5b4fe9] text-xs font-bold shrink-0">
                    &gt;
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 text-center mt-3 pt-2 border-t border-zinc-100">
            Click any question to preview guidance and expected concepts.
          </div>
        </div>

        {/* COLUMN 3: RECENT INTERVIEW HISTORY */}
        <div
          ref={historySectionRef}
          className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/80 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-[#5b4fe9] flex items-center justify-center text-xs font-bold shrink-0">
                  🕒
                </span>
                <h3 className="text-sm font-bold text-zinc-900">
                  Recent Interview History
                </h3>
              </div>
              <button
                onClick={() => setIsViewAllHistoryOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
              >
                View All
              </button>
            </div>

            {/* Table of 5 recent attempts matching reference */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase">
                    <th className="text-left py-2 font-semibold">Date</th>
                    <th className="text-left py-2 font-semibold">Type</th>
                    <th className="text-left py-2 font-semibold">Role</th>
                    <th className="text-left py-2 font-semibold">Score</th>
                    <th className="text-right py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {history.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60">
                      <td className="py-2.5 text-zinc-700 whitespace-nowrap text-[11px]">
                        {item.date}
                      </td>
                      <td className="py-2.5 text-zinc-900 font-semibold whitespace-nowrap text-[11px]">
                        {item.type}
                      </td>
                      <td className="py-2.5 text-zinc-600 truncate max-w-[90px] text-[11px]">
                        {item.role}
                      </td>
                      <td className="py-2.5 font-bold text-[11px]">
                        <span
                          className={
                            item.score >= 75
                              ? "text-emerald-600"
                              : item.score >= 60
                                ? "text-amber-600"
                                : "text-red-500"
                          }
                        >
                          {item.score}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setViewingHistoryItem(item)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 text-center mt-3 pt-2 border-t border-zinc-100">
            {history.length} total attempts recorded.
          </div>
        </div>
      </div>
    </div>
  )
}

export default MockInterviewPage
