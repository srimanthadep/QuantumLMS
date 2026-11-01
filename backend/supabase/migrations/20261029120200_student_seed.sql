-- Demo content and the demo student's history, transcribed by a one-off script from the frontend mock data this
-- backend replaced (frontend/src/pages/student/studentMockData.ts). Edit the SQL directly.
--
-- Dates are relative to the anchor passed to seed_content (normally the seed time), so the story stays current.
-- `select app_private.seed_content(now())` re-anchors shared content; public.reset_my_demo_data() re-seeds the
-- signed-in demo student. Inside both functions, d is the campus-local date of the anchor.

create or replace function app_private.seed_content(p_anchor timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_anchor timestamptz := p_anchor;
  d date := (p_anchor at time zone app_private.campus_tz())::date;
begin
  update app_private.settings set value = to_jsonb(p_anchor), updated_at = now() where key = 'demo_anchor';

  insert into public.mentors (id, name, avatar, title, department, email, phone, office, bio, specializations, office_hours, availability, zoom_url, position) values
    ('mentor-1', 'Prof. Srimanth Adep', '/assets/srimanth.png', 'Lead Professor & Principal AI Research Fellow', 'School of Computing & Machine Intelligence', 'srimanth@quantumschool.ai', '+1 (555) 492-8810', 'Room 402, Research Wing, Maple Hall Campus', 'Lead AI researcher focusing on Transformer optimization, autonomous agent cognitive graphs, and production RAG evaluation architectures. Supervises Year 4 Maple Class cohorts and senior thesis defenses.', array['Large Language Models (LLMs)', 'Multi-Agent Graph Orchestration', 'Vector Embeddings & Retrieval (RAG)', 'Parameter-Efficient Fine-Tuning (PEFT)']::text[], 'Wednesdays & Fridays · 05:00 PM - 06:30 PM (Virtual Meeting Room B & Lab 3)', 'Available Now', 'https://zoom.us/j/98421038592?pwd=QAI-QuantumMentor-2026', 0),
    ('mentor-2', 'Dr. Elena Vance', '/assets/teacher-female.png', 'Visiting AI Research Director & Fellow', 'Department of AI Ethics, Safety & Multimodal Systems', 'elena.vance@quantumschool.ai', '+1 (555) 781-3204', 'Room 214, Turing Laboratory', 'Visiting research director specializing in cross-attention multimodal architectures, alignment research, and AI safety governance frameworks.', array['Multimodal World Models', 'AI Safety & Governance', 'Computer Vision & SAM', 'RLHF & Constitutional AI']::text[], 'Tuesdays & Thursdays · 04:00 PM - 05:30 PM', 'In Lecture', null, 1)
  on conflict (id) do update set name = excluded.name, avatar = excluded.avatar, title = excluded.title, department = excluded.department, email = excluded.email, phone = excluded.phone, office = excluded.office, bio = excluded.bio, specializations = excluded.specializations, office_hours = excluded.office_hours, availability = excluded.availability, zoom_url = excluded.zoom_url, position = excluded.position;

  insert into public.courses (id, code, title, category, image, instructor, instructor_role, description, level, credits, duration, rating, reviews, progress_color, certificate_title, certificate_skills, is_starter, position) values
    ('c-1', 'AI-401', 'Generative AI Masterclass', 'Advanced AI', '/assets/course_genai.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Deep dive into Large Language Models, Transformer attention mechanisms, Retrieval-Augmented Generation (RAG), vector embeddings, and enterprise-grade generative agent orchestration.', 'Advanced', 4, '40 hours', '4.9', '3.4k', '#10b981', 'Generative AI & LLM Systems Architect', array['Transformers', 'RAG Pipelines', 'ChromaDB', 'LoRA Fine-tuning']::text[], true, 0),
    ('c-2', 'PY-201', 'Python for AI', 'Core Python', '/assets/course_python.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Master Python data structures, vector math with NumPy, high-performance data processing with Pandas, and PyTorch tensors designed for modern machine learning pipelines.', 'Intermediate', 3, '32 hours', '4.8', '2.8k', '#3b82f6', 'Python for AI & Data Science', array['NumPy', 'Pandas', 'PyTorch Tensors', 'Data Wrangling']::text[], true, 1),
    ('c-3', 'ML-301', 'Machine Learning Foundations', 'Machine Learning', '/assets/course_ml.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Mathematical and algorithmic foundations of supervised and unsupervised learning, linear regression, SVMs, decision forests, and evaluation metrics.', 'Intermediate', 4, '36 hours', '4.7', '1.9k', '#8b5cf6', 'Machine Learning Mathematical Foundations', array['Optimization', 'SVMs', 'Backprop', 'Statistical Learning']::text[], true, 2),
    ('c-4', 'AG-501', 'AI Agents Bootcamp', 'Autonomous Systems', '/assets/course_agents.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Build production-grade autonomous agent systems using tool calling, cognitive planning, memory persistence, human-in-the-loop workflows, and evaluation harness.', 'Advanced', 4, '28 hours', '4.9', '4.1k', '#ec4899', 'Autonomous AI Agents Specialist', array['LangGraph', 'Tool Calling', 'Memory Stores', 'Agent Evals']::text[], true, 3),
    ('cat-1', 'PE-210', 'Prompt Engineering Deep Dive', 'LLM Systems', '/assets/rec_prompt.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Systematic techniques for system prompt design, few-shot conditioning, structured output schema, jailbreak defense, and automated prompt evaluation.', 'Beginner', 2, '14 hours', '4.8', '2.1k', '#f59e0b', 'Prompt Engineering Practitioner', array['Prompt Design', 'Few-shot Patterns', 'Structured Output', 'LLM Evals']::text[], false, 4),
    ('cat-2', 'CV-320', 'Computer Vision with Python', 'Computer Vision', '/assets/rec_cv.jpg', 'Dr. Elena Vance', 'Visiting Researcher', 'Convolutional Neural Networks, object detection with YOLOv8, image segmentation with SAM, and real-time vision pipelines with OpenCV.', 'Intermediate', 3, '24 hours', '4.7', '1.2k', '#10b981', 'Computer Vision Engineer', array['OpenCV', 'CNNs', 'Object Detection', 'Segmentation']::text[], false, 5),
    ('cat-3', 'RB-450', 'Autonomous Robotics with ROS2', 'Robotics', '/assets/student_hero_robot.jpg', 'Srimanth', 'Principal AI Research Scientist', 'Robotics Operating System 2 (ROS2) architectures, sensor fusion with LiDAR and IMU, path planning algorithms, and SLAM navigation.', 'Advanced', 4, '36 hours', '4.9', '1.8k', '#6366f1', 'Autonomous Robotics Engineer', array['ROS2', 'SLAM', 'Motion Planning', 'Sensor Fusion']::text[], false, 6)
  on conflict (id) do update set code = excluded.code, title = excluded.title, category = excluded.category, image = excluded.image, instructor = excluded.instructor, instructor_role = excluded.instructor_role, description = excluded.description, level = excluded.level, credits = excluded.credits, duration = excluded.duration, rating = excluded.rating, reviews = excluded.reviews, progress_color = excluded.progress_color, certificate_title = excluded.certificate_title, certificate_skills = excluded.certificate_skills, is_starter = excluded.is_starter, position = excluded.position;

  insert into public.course_modules (id, course_id, position, title, duration) values
    ('m-1', 'c-1', 1, 'Module 1: Introduction to LLMs & Transformers', '4.5 hours'),
    ('m-2', 'c-1', 2, 'Module 2: Prompt Engineering & Schema Conditioning', '5 hours'),
    ('m-3', 'c-1', 3, 'Module 3: Vector Embeddings & Similarity Search', '5.5 hours'),
    ('m-4', 'c-1', 4, 'Module 4: Retrieval-Augmented Generation (RAG)', '6 hours'),
    ('m-5', 'c-1', 5, 'Module 5: Autonomous Multi-Agent Workflows', '6.5 hours'),
    ('c-1-m6', 'c-1', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('c-1-m7', 'c-1', 7, 'Module 7: Production deployment', '2 hours'),
    ('c-1-m8', 'c-1', 8, 'Module 8: Capstone project', '2 hours'),
    ('c-2-m1', 'c-2', 1, 'Module 1: Foundations', '2 hours'),
    ('c-2-m2', 'c-2', 2, 'Module 2: Core concepts', '2 hours'),
    ('c-2-m3', 'c-2', 3, 'Module 3: Applied techniques', '2 hours'),
    ('c-2-m4', 'c-2', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('c-2-m5', 'c-2', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('c-2-m6', 'c-2', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('c-2-m7', 'c-2', 7, 'Module 7: Production deployment', '2 hours'),
    ('c-3-m1', 'c-3', 1, 'Module 1: Foundations', '2 hours'),
    ('c-3-m2', 'c-3', 2, 'Module 2: Core concepts', '2 hours'),
    ('c-3-m3', 'c-3', 3, 'Module 3: Applied techniques', '2 hours'),
    ('c-3-m4', 'c-3', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('c-3-m5', 'c-3', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('c-3-m6', 'c-3', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('c-4-m1', 'c-4', 1, 'Module 1: Foundations', '2 hours'),
    ('c-4-m2', 'c-4', 2, 'Module 2: Core concepts', '2 hours'),
    ('c-4-m3', 'c-4', 3, 'Module 3: Applied techniques', '2 hours'),
    ('c-4-m4', 'c-4', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('c-4-m5', 'c-4', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('c-4-m6', 'c-4', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('c-4-m7', 'c-4', 7, 'Module 7: Production deployment', '2 hours'),
    ('c-4-m8', 'c-4', 8, 'Module 8: Capstone project', '2 hours'),
    ('cat-1-m1', 'cat-1', 1, 'Module 1: Foundations', '2 hours'),
    ('cat-1-m2', 'cat-1', 2, 'Module 2: Core concepts', '2 hours'),
    ('cat-1-m3', 'cat-1', 3, 'Module 3: Applied techniques', '2 hours'),
    ('cat-1-m4', 'cat-1', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('cat-1-m5', 'cat-1', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('cat-2-m1', 'cat-2', 1, 'Module 1: Foundations', '2 hours'),
    ('cat-2-m2', 'cat-2', 2, 'Module 2: Core concepts', '2 hours'),
    ('cat-2-m3', 'cat-2', 3, 'Module 3: Applied techniques', '2 hours'),
    ('cat-2-m4', 'cat-2', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('cat-2-m5', 'cat-2', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('cat-2-m6', 'cat-2', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('cat-3-m1', 'cat-3', 1, 'Module 1: Foundations', '2 hours'),
    ('cat-3-m2', 'cat-3', 2, 'Module 2: Core concepts', '2 hours'),
    ('cat-3-m3', 'cat-3', 3, 'Module 3: Applied techniques', '2 hours'),
    ('cat-3-m4', 'cat-3', 4, 'Module 4: Hands-on lab', '2 hours'),
    ('cat-3-m5', 'cat-3', 5, 'Module 5: Advanced patterns', '2 hours'),
    ('cat-3-m6', 'cat-3', 6, 'Module 6: Evaluation and testing', '2 hours'),
    ('cat-3-m7', 'cat-3', 7, 'Module 7: Production deployment', '2 hours')
  on conflict (id) do update set course_id = excluded.course_id, position = excluded.position, title = excluded.title, duration = excluded.duration;

  insert into public.lessons (id, module_id, course_id, position, title, duration, minutes, type, summary) values
    ('l-1-1', 'm-1', 'c-1', 1, 'Evolution of NLP to Foundational Models', '45 mins', 45, 'video', 'Survey from RNNs and LSTMs to Transformer self-attention architecture.'),
    ('l-1-2', 'm-1', 'c-1', 2, 'Self-Attention Mechanism & Math', '60 mins', 60, 'reading', 'Query, Key, and Value dot-product attention mathematical derivation.'),
    ('l-1-3', 'm-1', 'c-1', 3, 'Tokenizer Mechanics & Byte-Pair Encoding', '40 mins', 40, 'lab', 'Hands-on tokenizer inspection with tiktoken and token budgets.'),
    ('l-1-4', 'm-1', 'c-1', 4, 'Transformer Inference & KV Caching', '50 mins', 50, 'video', 'Autoregressive generation latency optimization with KV cache.'),
    ('l-2-1', 'm-2', 'c-1', 5, 'Few-Shot In-Context Learning', '45 mins', 45, 'video', 'Optimizing exemplar selection and task formatting.'),
    ('l-2-2', 'm-2', 'c-1', 6, 'Chain-of-Thought (CoT) & Reasoning', '55 mins', 55, 'reading', 'Zero-shot and few-shot reasoning prompts for complex problem decomposition.'),
    ('l-2-3', 'm-2', 'c-1', 7, 'Structured JSON Output Generation', '50 mins', 50, 'lab', 'Enforcing Pydantic schemas and deterministic JSON modes.'),
    ('l-2-4', 'm-2', 'c-1', 8, 'Prompt Evaluation & Evals Frameworks', '45 mins', 45, 'lab', 'Building automated test assertions for LLM output consistency.'),
    ('l-3-1', 'm-3', 'c-1', 9, 'Embedding Models & Vector Spaces', '50 mins', 50, 'video', 'Dense representation spaces, cosine distance, and dot product semantics.'),
    ('l-3-2', 'm-3', 'c-1', 10, 'Chunking Strategies (Semantic vs Fixed)', '45 mins', 45, 'lab', 'Benchmarking recursive text splitting vs sentence semantic splitting.'),
    ('l-3-3', 'm-3', 'c-1', 11, 'Vector DB Setup: ChromaDB & Pinecone', '65 mins', 65, 'lab', 'Ingesting document corpuses and configuring index parameters (HNSW).'),
    ('l-3-4', 'm-3', 'c-1', 12, 'Hybrid Search (BM25 + Dense Vectors)', '55 mins', 55, 'video', 'Reciprocal Rank Fusion (RRF) for combining keyword and semantic match.'),
    ('l-4-1', 'm-4', 'c-1', 13, 'End-to-End RAG Architecture Fundamentals', '55 mins', 55, 'video', 'High-level orchestration between retriever, reranker, and synthesis LLM.'),
    ('l-4-2', 'm-4', 'c-1', 14, 'Re-ranking Models with Cohere & BGE', '50 mins', 50, 'lab', 'Improving precision with cross-encoder re-ranking stages.'),
    ('l-4-3', 'm-4', 'c-1', 15, 'RAG Applications & Context Synthesis', '65 mins', 65, 'video', 'Active Lesson · Constructing citation-backed prompts and hallucination guards.'),
    ('l-4-4', 'm-4', 'c-1', 16, 'Evaluation with Ragas & TruLens', '60 mins', 60, 'lab', 'Faithfulness, answer relevancy, and context recall measurement.'),
    ('l-5-1', 'm-5', 'c-1', 17, 'Tool Calling & Function Definitions', '50 mins', 50, 'video', 'OpenAI and Anthropic native tool calling protocols.'),
    ('l-5-2', 'm-5', 'c-1', 18, 'ReAct Pattern & Reasoning Loops', '60 mins', 60, 'lab', 'Thought-Action-Observation cognitive loop implementation.'),
    ('l-5-3', 'm-5', 'c-1', 19, 'Multi-Agent Graph Orchestration', '75 mins', 75, 'video', 'LangGraph state machine graphs with human checkpoints.'),
    ('l-5-4', 'm-5', 'c-1', 20, 'Memory Persistence & Reflection', '60 mins', 60, 'lab', 'Short-term buffer vs long-term vector memory stores.'),
    ('c-1-m6-l1', 'c-1-m6', 'c-1', 21, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for Generative AI Masterclass.'),
    ('c-1-m6-l2', 'c-1-m6', 'c-1', 22, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-1-m6-l3', 'c-1-m6', 'c-1', 23, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-1-m7-l1', 'c-1-m7', 'c-1', 24, 'Production deployment: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of production deployment for Generative AI Masterclass.'),
    ('c-1-m7-l2', 'c-1-m7', 'c-1', 25, 'Production deployment in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-1-m7-l3', 'c-1-m7', 'c-1', 26, 'Lab: production deployment exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-1-m8-l1', 'c-1-m8', 'c-1', 27, 'Capstone project: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of capstone project for Generative AI Masterclass.'),
    ('c-1-m8-l2', 'c-1-m8', 'c-1', 28, 'Capstone project in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-1-m8-l3', 'c-1-m8', 'c-1', 29, 'Lab: capstone project exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m1-l1', 'c-2-m1', 'c-2', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for Python for AI.'),
    ('c-2-m1-l2', 'c-2-m1', 'c-2', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m1-l3', 'c-2-m1', 'c-2', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m2-l1', 'c-2-m2', 'c-2', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for Python for AI.'),
    ('c-2-m2-l2', 'c-2-m2', 'c-2', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m2-l3', 'c-2-m2', 'c-2', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m3-l1', 'c-2-m3', 'c-2', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for Python for AI.'),
    ('c-2-m3-l2', 'c-2-m3', 'c-2', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m3-l3', 'c-2-m3', 'c-2', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m4-l1', 'c-2-m4', 'c-2', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for Python for AI.'),
    ('c-2-m4-l2', 'c-2-m4', 'c-2', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m4-l3', 'c-2-m4', 'c-2', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m5-l1', 'c-2-m5', 'c-2', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for Python for AI.'),
    ('c-2-m5-l2', 'c-2-m5', 'c-2', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m5-l3', 'c-2-m5', 'c-2', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m6-l1', 'c-2-m6', 'c-2', 16, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for Python for AI.'),
    ('c-2-m6-l2', 'c-2-m6', 'c-2', 17, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m6-l3', 'c-2-m6', 'c-2', 18, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-2-m7-l1', 'c-2-m7', 'c-2', 19, 'Production deployment: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of production deployment for Python for AI.'),
    ('c-2-m7-l2', 'c-2-m7', 'c-2', 20, 'Production deployment in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-2-m7-l3', 'c-2-m7', 'c-2', 21, 'Lab: production deployment exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m1-l1', 'c-3-m1', 'c-3', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for Machine Learning Foundations.'),
    ('c-3-m1-l2', 'c-3-m1', 'c-3', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m1-l3', 'c-3-m1', 'c-3', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m2-l1', 'c-3-m2', 'c-3', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for Machine Learning Foundations.'),
    ('c-3-m2-l2', 'c-3-m2', 'c-3', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m2-l3', 'c-3-m2', 'c-3', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m3-l1', 'c-3-m3', 'c-3', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for Machine Learning Foundations.'),
    ('c-3-m3-l2', 'c-3-m3', 'c-3', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m3-l3', 'c-3-m3', 'c-3', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m4-l1', 'c-3-m4', 'c-3', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for Machine Learning Foundations.'),
    ('c-3-m4-l2', 'c-3-m4', 'c-3', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m4-l3', 'c-3-m4', 'c-3', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m5-l1', 'c-3-m5', 'c-3', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for Machine Learning Foundations.'),
    ('c-3-m5-l2', 'c-3-m5', 'c-3', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m5-l3', 'c-3-m5', 'c-3', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-3-m6-l1', 'c-3-m6', 'c-3', 16, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for Machine Learning Foundations.'),
    ('c-3-m6-l2', 'c-3-m6', 'c-3', 17, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-3-m6-l3', 'c-3-m6', 'c-3', 18, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m1-l1', 'c-4-m1', 'c-4', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for AI Agents Bootcamp.'),
    ('c-4-m1-l2', 'c-4-m1', 'c-4', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m1-l3', 'c-4-m1', 'c-4', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m2-l1', 'c-4-m2', 'c-4', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for AI Agents Bootcamp.'),
    ('c-4-m2-l2', 'c-4-m2', 'c-4', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m2-l3', 'c-4-m2', 'c-4', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m3-l1', 'c-4-m3', 'c-4', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for AI Agents Bootcamp.'),
    ('c-4-m3-l2', 'c-4-m3', 'c-4', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m3-l3', 'c-4-m3', 'c-4', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m4-l1', 'c-4-m4', 'c-4', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for AI Agents Bootcamp.'),
    ('c-4-m4-l2', 'c-4-m4', 'c-4', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m4-l3', 'c-4-m4', 'c-4', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m5-l1', 'c-4-m5', 'c-4', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for AI Agents Bootcamp.'),
    ('c-4-m5-l2', 'c-4-m5', 'c-4', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m5-l3', 'c-4-m5', 'c-4', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m6-l1', 'c-4-m6', 'c-4', 16, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for AI Agents Bootcamp.'),
    ('c-4-m6-l2', 'c-4-m6', 'c-4', 17, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m6-l3', 'c-4-m6', 'c-4', 18, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m7-l1', 'c-4-m7', 'c-4', 19, 'Production deployment: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of production deployment for AI Agents Bootcamp.'),
    ('c-4-m7-l2', 'c-4-m7', 'c-4', 20, 'Production deployment in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m7-l3', 'c-4-m7', 'c-4', 21, 'Lab: production deployment exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('c-4-m8-l1', 'c-4-m8', 'c-4', 22, 'Capstone project: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of capstone project for AI Agents Bootcamp.'),
    ('c-4-m8-l2', 'c-4-m8', 'c-4', 23, 'Capstone project in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('c-4-m8-l3', 'c-4-m8', 'c-4', 24, 'Lab: capstone project exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-1-m1-l1', 'cat-1-m1', 'cat-1', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for Prompt Engineering Deep Dive.'),
    ('cat-1-m1-l2', 'cat-1-m1', 'cat-1', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-1-m1-l3', 'cat-1-m1', 'cat-1', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-1-m2-l1', 'cat-1-m2', 'cat-1', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for Prompt Engineering Deep Dive.'),
    ('cat-1-m2-l2', 'cat-1-m2', 'cat-1', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-1-m2-l3', 'cat-1-m2', 'cat-1', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-1-m3-l1', 'cat-1-m3', 'cat-1', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for Prompt Engineering Deep Dive.'),
    ('cat-1-m3-l2', 'cat-1-m3', 'cat-1', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-1-m3-l3', 'cat-1-m3', 'cat-1', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-1-m4-l1', 'cat-1-m4', 'cat-1', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for Prompt Engineering Deep Dive.'),
    ('cat-1-m4-l2', 'cat-1-m4', 'cat-1', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-1-m4-l3', 'cat-1-m4', 'cat-1', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-1-m5-l1', 'cat-1-m5', 'cat-1', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for Prompt Engineering Deep Dive.'),
    ('cat-1-m5-l2', 'cat-1-m5', 'cat-1', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-1-m5-l3', 'cat-1-m5', 'cat-1', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m1-l1', 'cat-2-m1', 'cat-2', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for Computer Vision with Python.'),
    ('cat-2-m1-l2', 'cat-2-m1', 'cat-2', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m1-l3', 'cat-2-m1', 'cat-2', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m2-l1', 'cat-2-m2', 'cat-2', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for Computer Vision with Python.'),
    ('cat-2-m2-l2', 'cat-2-m2', 'cat-2', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m2-l3', 'cat-2-m2', 'cat-2', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m3-l1', 'cat-2-m3', 'cat-2', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for Computer Vision with Python.'),
    ('cat-2-m3-l2', 'cat-2-m3', 'cat-2', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m3-l3', 'cat-2-m3', 'cat-2', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m4-l1', 'cat-2-m4', 'cat-2', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for Computer Vision with Python.'),
    ('cat-2-m4-l2', 'cat-2-m4', 'cat-2', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m4-l3', 'cat-2-m4', 'cat-2', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m5-l1', 'cat-2-m5', 'cat-2', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for Computer Vision with Python.'),
    ('cat-2-m5-l2', 'cat-2-m5', 'cat-2', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m5-l3', 'cat-2-m5', 'cat-2', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-2-m6-l1', 'cat-2-m6', 'cat-2', 16, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for Computer Vision with Python.'),
    ('cat-2-m6-l2', 'cat-2-m6', 'cat-2', 17, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-2-m6-l3', 'cat-2-m6', 'cat-2', 18, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m1-l1', 'cat-3-m1', 'cat-3', 1, 'Foundations: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of foundations for Autonomous Robotics with ROS2.'),
    ('cat-3-m1-l2', 'cat-3-m1', 'cat-3', 2, 'Foundations in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m1-l3', 'cat-3-m1', 'cat-3', 3, 'Lab: foundations exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m2-l1', 'cat-3-m2', 'cat-3', 4, 'Core concepts: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of core concepts for Autonomous Robotics with ROS2.'),
    ('cat-3-m2-l2', 'cat-3-m2', 'cat-3', 5, 'Core concepts in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m2-l3', 'cat-3-m2', 'cat-3', 6, 'Lab: core concepts exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m3-l1', 'cat-3-m3', 'cat-3', 7, 'Applied techniques: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of applied techniques for Autonomous Robotics with ROS2.'),
    ('cat-3-m3-l2', 'cat-3-m3', 'cat-3', 8, 'Applied techniques in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m3-l3', 'cat-3-m3', 'cat-3', 9, 'Lab: applied techniques exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m4-l1', 'cat-3-m4', 'cat-3', 10, 'Hands-on lab: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of hands-on lab for Autonomous Robotics with ROS2.'),
    ('cat-3-m4-l2', 'cat-3-m4', 'cat-3', 11, 'Hands-on lab in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m4-l3', 'cat-3-m4', 'cat-3', 12, 'Lab: hands-on lab exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m5-l1', 'cat-3-m5', 'cat-3', 13, 'Advanced patterns: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of advanced patterns for Autonomous Robotics with ROS2.'),
    ('cat-3-m5-l2', 'cat-3-m5', 'cat-3', 14, 'Advanced patterns in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m5-l3', 'cat-3-m5', 'cat-3', 15, 'Lab: advanced patterns exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m6-l1', 'cat-3-m6', 'cat-3', 16, 'Evaluation and testing: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of evaluation and testing for Autonomous Robotics with ROS2.'),
    ('cat-3-m6-l2', 'cat-3-m6', 'cat-3', 17, 'Evaluation and testing in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m6-l3', 'cat-3-m6', 'cat-3', 18, 'Lab: evaluation and testing exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.'),
    ('cat-3-m7-l1', 'cat-3-m7', 'cat-3', 19, 'Production deployment: lecture', '45 mins', 45, 'video', 'Instructor walkthrough of production deployment for Autonomous Robotics with ROS2.'),
    ('cat-3-m7-l2', 'cat-3-m7', 'cat-3', 20, 'Production deployment in practice', '30 mins', 30, 'reading', 'Guided reading with worked examples and references.'),
    ('cat-3-m7-l3', 'cat-3-m7', 'cat-3', 21, 'Lab: production deployment exercises', '50 mins', 50, 'lab', 'Hands-on notebook exercises with automated checks.')
  on conflict (id) do update set module_id = excluded.module_id, course_id = excluded.course_id, position = excluded.position, title = excluded.title, duration = excluded.duration, minutes = excluded.minutes, type = excluded.type, summary = excluded.summary;

  insert into public.course_materials (id, course_id, position, title, type, size, published_at, description, file_name, url, drive_url, drive_id, is_available, error_message, content, mime_type) values
    ('mat-1', 'c-1', 0, 'RAG Architecture Master Slide Deck', 'Slides', '14.2 MB', least(app_private.local_ts(d + -3, '09:00'), v_anchor - interval '5 minutes'), 'Full presentation slides covering retriever pipelines, chunking, rerankers, and synthesis guards.', 'RAG_Architecture_Master_Slide_Deck.pdf', null, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs', true, null, null, null),
    ('mat-2', 'c-1', 1, 'Lab 4: ChromaDB & LangChain Setup Notebook', 'Code Notebook', '3.2 MB', least(app_private.local_ts(d + -5, '09:00'), v_anchor - interval '5 minutes'), 'Jupyter notebook with complete Python code for loading PDFs, embedding vectors, and querying.', 'Lab_4_ChromaDB_LangChain_Setup.ipynb', null, null, null, true, null, null, null),
    ('mat-3', 'c-1', 2, 'Evaluation Benchmark Dataset (JSON)', 'Dataset', '8.5 MB', least(app_private.local_ts(d + -7, '09:00'), v_anchor - interval '5 minutes'), 'Curated 500 Q&A pairs for evaluating retriever recall and answer generation faithfulness.', 'Evaluation_Benchmark_Dataset.json', null, null, null, true, null, null, null),
    ('mat-4', 'c-1', 3, 'Vector Similarity Metrics & Chunking Guide', 'PDF', '2.1 MB', least(app_private.local_ts(d + -9, '09:00'), v_anchor - interval '5 minutes'), 'Comprehensive cheat sheet of Cosine vs Dot Product, character vs token recursive chunking sizes.', 'Vector_Similarity_Metrics_and_Chunking_Guide.pdf', null, 'https://drive.google.com/file/d/15_7_c4-K0YyTfM2i5zVb5N4rA_v8dF7G/view', '15_7_c4-K0YyTfM2i5zVb5N4rA_v8dF7G', true, null, null, null),
    ('mat-5', 'c-1', 4, 'Cross-Encoder Re-ranker Checkpoint (PyTorch)', 'Dataset', '420 MB', least(app_private.local_ts(d + -1, '09:00'), v_anchor - interval '5 minutes'), 'Pretrained BGE cross-encoder reranker weights for latency benchmarking. (Faculty storage bucket offline).', 'bge_reranker_large_fp16.bin', null, null, null, false, 'Resource file ''bge_reranker_large_fp16.bin'' is not found on the faculty cloud storage repository (HTTP 404). Contact Instructor Srimanth.', null, null),
    ('mat-c2-1', 'c-2', 0, 'NumPy Vectorization Cheat Sheet & Reference', 'PDF', '1.8 MB', least(app_private.local_ts(d + -2, '09:00'), v_anchor - interval '5 minutes'), 'High-performance array operations, broadcasting rules, indexing techniques, and BLAS optimizations.', 'NumPy_Vectorization_Cheat_Sheet.pdf', null, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs', true, null, null, null),
    ('mat-c2-2', 'c-2', 1, 'Pandas High-Performance Data Processing', 'Code Notebook', '4.1 MB', least(app_private.local_ts(d + -4, '09:00'), v_anchor - interval '5 minutes'), 'Jupyter notebook demonstrating vectorized feature engineering, categorical memory reduction, and groupby aggregations.', 'Pandas_High_Performance_Data_Processing.ipynb', null, null, null, true, null, null, null),
    ('mat-c2-3', 'c-2', 2, 'Medical Image Classification Dataset', 'Dataset', '12.4 MB', least(app_private.local_ts(d + -6, '09:00'), v_anchor - interval '5 minutes'), 'Sample 1,200 chest X-ray metadata and feature vectors for Python computer vision exercises.', 'medical_classification_metadata.json', null, null, null, true, null, null, null),
    ('mat-c3-1', 'c-3', 0, 'Cost Functions & Gradient Descent Visual Guide', 'PDF', '3.4 MB', least(app_private.local_ts(d + -6, '09:00'), v_anchor - interval '5 minutes'), 'Visual geometric walkthrough of convex optimization, learning rates, momentum, and Adam optimizers.', 'Gradient_Descent_Mathematical_Foundations.pdf', null, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs', true, null, null, null),
    ('mat-c3-2', 'c-3', 1, 'Support Vector Machines & Kernel Tricks', 'Code Notebook', '2.8 MB', least(app_private.local_ts(d + -9, '09:00'), v_anchor - interval '5 minutes'), 'Scikit-learn implementation comparing linear, polynomial, and RBF kernels on non-linearly separable data.', 'SVM_Kernel_Tricks_HandsOn.ipynb', null, null, null, true, null, null, null),
    ('mat-c4-1', 'c-4', 0, 'Cognitive Planning & ReAct Architecture Blueprint', 'PDF', '2.6 MB', least(app_private.local_ts(d + -11, '09:00'), v_anchor - interval '5 minutes'), 'System diagrams and cognitive loops for autonomous reasoning, action taking, and observation reflections.', 'ReAct_Agent_Cognitive_Planning.pdf', null, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs', true, null, null, null),
    ('mat-c4-2', 'c-4', 1, 'LangGraph Multi-Agent Reflection Pipeline', 'Code Notebook', '5.0 MB', least(app_private.local_ts(d + -13, '09:00'), v_anchor - interval '5 minutes'), 'Production-grade cyclical multi-agent graph with tool calling, human-in-the-loop checkpoints, and memory.', 'LangGraph_Multi_Agent_Pipeline.ipynb', null, null, null, true, null, null, null)
  on conflict (id) do update set course_id = excluded.course_id, position = excluded.position, title = excluded.title, type = excluded.type, size = excluded.size, published_at = excluded.published_at, description = excluded.description, file_name = excluded.file_name, url = excluded.url, drive_url = excluded.drive_url, drive_id = excluded.drive_id, is_available = excluded.is_available, error_message = excluded.error_message, content = excluded.content, mime_type = excluded.mime_type;

  insert into public.assignments (id, course_id, title, description, max_marks, priority, due_at) values
    ('asg-1', 'c-1', 'Project 1: End-to-End RAG Pipeline with LangChain', 'Build a complete document retrieval question-answering system using LangChain or LlamaIndex, ChromaDB vector store, and OpenAI/Anthropic APIs with citation tracking.', 100, 'High', app_private.local_ts(d + 1, '23:59')),
    ('asg-2', 'c-3', 'Lab 3: Multilayer Perceptron from Scratch in NumPy', 'Implement forward pass, cross-entropy loss, and backpropagation for a 2-layer neural network on MNIST without using PyTorch autograd.', 100, 'High', app_private.local_ts(d + 5, '23:59')),
    ('asg-3', 'c-2', 'Data Analysis & Feature Engineering on Healthcare Data', 'Clean missing values, normalize skewed feature distributions, compute Pearson correlation matrices, and export cleaned dataset.', 100, 'Medium', app_private.local_ts(d + -6, '23:59')),
    ('asg-4', 'c-4', 'Autonomous Agent Tool Calling & Web Search System', 'Create an agent that executes multi-step web queries, validates retrieved links, and synthesizes a structured executive summary.', 100, 'Normal', app_private.local_ts(d + -11, '23:59')),
    ('asg-5', 'c-1', 'Vector Similarity Metrics Mathematical Comparison', 'Write a LaTeX paper comparing high-dimensional geometry effects (curse of dimensionality) on dot product vs cosine distance.', 100, 'Normal', app_private.local_ts(d + -16, '23:59'))
  on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, description = excluded.description, max_marks = excluded.max_marks, priority = excluded.priority, due_at = excluded.due_at;

  insert into public.quizzes (id, course_id, title, duration_minutes, passing_pct, max_attempts, question_count, available_from, due_at) values
    ('qz-1', 'c-1', 'Quiz 4: Vector Embeddings & Similarity Search', 20, 70, 1, 10, app_private.local_ts(d + -3, '08:00'), app_private.local_ts(d + 3, '23:59')),
    ('qz-2', 'c-3', 'Midterm Assessment: Deep Learning Mathematics', 45, 75, 1, 10, app_private.local_ts(d + 12, '09:00'), app_private.local_ts(d + 12, '23:59')),
    ('qz-3', 'c-2', 'Python Data Structures & Memory Layout', 25, 70, 1, 10, null, app_private.local_ts(d + -9, '23:59')),
    ('qz-4', 'c-4', 'Agent Tool-Use & ReAct Framework Evaluation', 30, 75, 1, 10, null, app_private.local_ts(d + -13, '23:59'))
  on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, duration_minutes = excluded.duration_minutes, passing_pct = excluded.passing_pct, max_attempts = excluded.max_attempts, question_count = excluded.question_count, available_from = excluded.available_from, due_at = excluded.due_at;

  insert into public.quiz_questions (quiz_id, position, question, options, correct_index, explanation, topic, difficulty) values
    ('qz-1', 1, 'Which distance metric is invariant to the scale/magnitude of the vector embeddings?', array['Euclidean Distance (L2 Norm)', 'Cosine Similarity', 'Manhattan Distance (L1 Norm)', 'Hamming Distance']::text[], 1, 'Cosine similarity measures the angle between two vectors by normalizing for their magnitude (A · B / (||A|| ||B||)), making it completely invariant to vector scaling.', 'Distance Metrics', 'Easy'),
    ('qz-1', 2, 'In dense vector indexing, what is the primary computational advantage of Hierarchical Navigable Small World (HNSW) graphs over brute-force flat search?', array['Eliminates memory consumption by caching vectors strictly on tape storage', 'Enables approximate nearest neighbor search with O(log N) average time complexity instead of O(N)', 'Guarantees 100% exact mathematical recall on unnormalized vectors without loss', 'Quantizes float32 vectors into 1-bit integer representations automatically']::text[], 1, 'HNSW builds a multi-layer proximity graph where upper layers have long-range skip edges and bottom layers contain dense local connections, achieving logarithmic search latency.', 'Graph Indexing', 'Medium'),
    ('qz-1', 3, 'What is the primary difference in architecture between a Bi-Encoder and a Cross-Encoder in a modern two-stage retrieval pipeline?', array['Bi-encoders encode query and passage independently into vectors; cross-encoders process query and passage together through joint multi-head attention.', 'Bi-encoders only process sparse BM25 indices, whereas cross-encoders operate on dense float16 tensors.', 'Cross-encoders are run offline during document ingestion, whereas bi-encoders are only invoked at query time.', 'Cross-encoders produce 1536-dimensional embeddings, while bi-encoders output binary classification flags.']::text[], 0, 'Bi-encoders allow pre-computing and indexing document embeddings for millisecond retrieval, while cross-encoders use full joint attention across all token pairs for higher accuracy re-ranking.', 'Re-Ranking & Attention', 'Medium'),
    ('qz-1', 4, 'If two vectors are strictly normalized to unit length (L2 norm = 1.0), how does their Cosine Similarity relate mathematically to their Dot Product?', array['Cosine similarity is equal to half the dot product', 'Cosine similarity is exactly equal to their dot product', 'Cosine similarity equals 1 minus the dot product', 'Dot product is undefined for unit vectors']::text[], 1, 'Since cosine similarity is defined as (A · B) / (||A|| * ||B||), when ||A|| = 1 and ||B|| = 1, the denominator is 1, so cosine similarity simplifies directly to the inner dot product.', 'Vector Mathematics', 'Easy'),
    ('qz-1', 5, 'What does Product Quantization (PQ) accomplish in large-scale vector databases such as Faiss or Milvus?', array['It hashes document text into MD5 checksums for deduplication', 'It splits vectors into sub-vectors and clusters them into codebooks, dramatically compressing RAM usage', 'It trains a secondary generative model to rewrite the user prompt', 'It rotates embeddings using PCA to remove all negative tensor values']::text[], 1, 'Product Quantization partitions high-dimensional vectors into smaller sub-vectors and assigns each to the nearest centroid index, reducing memory consumption by up to 95% with slight loss of precision.', 'Vector Compression', 'Hard'),
    ('qz-1', 6, 'Which chunking strategy is generally most effective when preparing dense embeddings for technical documentation containing markdown tables and code blocks?', array['Fixed-length sliding window of 64 tokens with zero overlap', 'Semantic / recursive markdown header-aware chunking with token overlap', 'Splitting strictly on period punctuation characters', 'Ingesting entire multi-chapter books as single 32,000-token vectors']::text[], 1, 'Header-aware recursive chunking preserves structural context and local topic cohesion, keeping tables and code intact while overlap prevents semantic boundary loss.', 'Document Chunking', 'Medium'),
    ('qz-1', 7, 'What formula does Reciprocal Rank Fusion (RRF) use to combine ranked results from dense vector search and sparse lexical (BM25) search?', array['Arithmetic mean of raw cosine similarity and BM25 scores', 'Sum of 1 / (k + rank) across both search result lists (typically k=60)', 'Multiplication of softmax probabilities across top-k candidate tokens', 'Pearson correlation coefficient between top candidate document IDs']::text[], 1, 'RRF calculates score(d) = Σ 1/(k + rank_i(d)), which equalizes dissimilar score distributions between dense vector distance and BM25 token frequencies.', 'Hybrid Search', 'Medium'),
    ('qz-1', 8, 'When vector embeddings suffer from the ''Hubness Problem'' in high-dimensional spaces, what phenomenon is observed?', array['All vector norms degrade toward zero after backpropagation', 'A small subset of vectors appear as the nearest neighbors to a disproportionately huge number of query vectors', 'Cosine distances between orthogonal vectors exceed 2.0', 'HNSW graph indexes fail to compile due to circular graph references']::text[], 1, 'Hubness is an intrinsic curse-of-dimensionality phenomenon where specific central vectors (''hubs'') have high centrality and emerge as top nearest neighbors for many unrelated queries.', 'High-Dimensional Geometry', 'Hard'),
    ('qz-1', 9, 'In an Inverted File Flat (IVFFlat) index, what do the `nlist` and `nprobe` hyper-parameters control?', array['`nlist` is the number of Voronoi centroid clusters; `nprobe` is the number of adjacent clusters searched at query time', '`nlist` is the batch size; `nprobe` is the learning rate', '`nlist` is the memory cache size in gigabytes; `nprobe` is the thread count', '`nlist` is the token vocabulary size; `nprobe` is the temperature parameter']::text[], 0, '`nlist` partitions vector space into Voronoi cells during training; `nprobe` defines how many neighboring cells are inspected during search to trade off recall vs query speed.', 'Clustering & Search', 'Medium'),
    ('qz-1', 10, 'What is the primary purpose of embedding normalization prior to indexing in an Inner Product (IP) metric vector space?', array['To prevent integer overflow in CPU registers', 'To make Maximum Inner Product Search (MIPS) equivalent to ranking by Cosine Similarity', 'To reduce the dimensionality from 1536 to 256', 'To encrypt vector values against adversarial inversion attacks']::text[], 1, 'Normalizing all vectors to unit norm (L2 = 1.0) ensures that inner product rankings directly correlate with angular cosine similarity without costly per-query norm divisions.', 'Index Optimization', 'Easy'),
    ('qz-2', 1, 'In backpropagation through a multi-layer perceptron, what does the chain rule multiply to obtain the gradient of the loss with respect to a layer''s weight matrix?', array['The previous layer''s Hessian matrix and current learning rate', 'The upstream gradient from the subsequent layer and the local Jacobian of the layer''s operation', 'The scalar loss divided by the total number of training epochs', 'The Frobenius norm of the input tensor and the output bias']::text[], 1, 'The chain rule computes dL/dW by multiplying the incoming upstream gradient (dL/dz) by the local gradient (dz/dW), propagating errors backward through layer Jacobians.', 'Matrix Calculus', 'Medium'),
    ('qz-2', 2, 'Why does the Vanishing Gradient problem severely impact deep networks utilizing Sigmoid or Tanh activation functions?', array['Their derivatives have a maximum value <= 0.25 (sigmoid) or <= 1.0 (tanh), causing repeated multiplication across layers to decay exponentially toward zero', 'They produce complex imaginary numbers when activations are negative', 'Their gradients cause floating-point overflow and NaN values in float32 tensors', 'They prevent the optimizer from calculating the Hessian matrix']::text[], 0, 'The derivative of sigmoid maxes out at 0.25. When chain-multiplying gradients across 20+ layers, 0.25^20 ≈ 10^-12, effectively freezing early layer weights.', 'Gradients & Activations', 'Medium'),
    ('qz-2', 3, 'In the Adam optimizer, what is the mathematical distinction between the first moment estimate m_t and the second moment estimate v_t?', array['m_t tracks exponential moving average of past gradients; v_t tracks exponential moving average of squared past gradients', 'm_t is the batch size; v_t is the weight decay coefficient', 'm_t represents the Hessian diagonal; v_t represents the learning rate schedule', 'm_t tracks validation loss; v_t tracks training accuracy']::text[], 0, 'Adam maintains an exponentially decaying average of past gradients (first moment / momentum) and past squared gradients (second moment / uncentered variance).', 'Optimization Algorithms', 'Medium'),
    ('qz-2', 4, 'In the Scaled Dot-Product Attention formula Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V, what is the mathematical purpose of dividing by sqrt(d_k)?', array['To compress the output dimension of the value matrix', 'To prevent dot products from growing excessively large for high dimensions, which would push softmax into regions with vanishingly small gradients', 'To ensure that query and key matrices have equal eigenvalues', 'To introduce stochastic regularization similar to dropout']::text[], 1, 'For large d_k, the dot products grow in magnitude like O(d_k). Dividing by sqrt(d_k) keeps the variance around 1, preventing softmax from saturating with near-zero gradients.', 'Transformer Mathematics', 'Hard'),
    ('qz-2', 5, 'What condition must be met for a square matrix A to be considered positive semi-definite?', array['All entries of A must be positive integers', 'For any non-zero real vector x, x^T A x >= 0', 'The determinant of A must equal zero', 'The trace of A must be strictly greater than its spectral radius']::text[], 1, 'A symmetric matrix A is positive semi-definite if and only if x^T A x >= 0 for all real vectors x, which also implies all its eigenvalues are non-negative.', 'Linear Algebra', 'Hard'),
    ('qz-2', 6, 'In Batch Normalization, what does the algorithm compute for each mini-batch feature dimension during the forward pass?', array['The mini-batch mean and mini-batch variance, then scales and shifts with learnable parameters gamma and beta', 'The discrete Fourier transform of the activations', 'The singular value decomposition of the weight matrix', 'The median and interquartile range to remove outlier samples']::text[], 0, 'Batch Normalization computes mean and variance across the batch, normalizes activations to zero-mean unit-variance, then applies learnable scale γ and shift β.', 'Normalization Math', 'Medium'),
    ('qz-2', 7, 'How does L2 Regularization (Weight Decay) affect the gradient descent update step mathematically?', array['It zeroes out weights below a fixed threshold', 'It subtracts a term proportional to the weight itself (2 * lambda * w), effectively shrinking weights by a fraction each step', 'It divides the learning rate by the square root of the iteration count', 'It projects weight vectors onto an L1 unit ball']::text[], 1, 'Adding (1/2)λ||w||^2 to the loss adds λw to the gradient, resulting in w_new = (1 - αλ)w_old - α∇L, decaying large weights towards zero.', 'Regularization', 'Medium'),
    ('qz-2', 8, 'What does the Spectral Radius ρ(A) of a matrix represent?', array['The sum of diagonal elements of A', 'The maximum absolute value of its eigenvalues: max |λ_i|', 'The determinant of the inverse matrix A^-1', 'The condition number divided by the matrix rank']::text[], 1, 'The spectral radius is the supremum among the absolute values of the eigenvalues of a matrix, which determines stability in recurrent neural network transitions.', 'Eigenvalues', 'Hard'),
    ('qz-2', 9, 'What is the relationship between the Kullback-Leibler (KL) Divergence D_KL(P || Q) and Cross-Entropy H(P, Q)?', array['H(P, Q) = H(P) + D_KL(P || Q), where H(P) is the entropy of the true distribution', 'H(P, Q) = D_KL(P || Q) - H(P)', 'H(P, Q) = D_KL(P || Q) * H(Q)', 'H(P, Q) is always strictly less than D_KL(P || Q)']::text[], 0, 'Cross-entropy between P and Q equals the entropy of P plus the relative entropy (KL divergence) from Q to P: H(P, Q) = H(P) + D_KL(P || Q).', 'Information Theory', 'Hard'),
    ('qz-2', 10, 'In Convex Optimization, what does Jensen''s Inequality state for a convex function f and random variable X?', array['f(E[X]) <= E[f(X)]', 'f(E[X]) >= E[f(X)]', 'f(E[X]) = E[f(X)] + Var(X)', 'f(X) is always greater than its second derivative']::text[], 0, 'Jensen''s Inequality establishes that the value of a convex function evaluated at the expected value is less than or equal to the expected value of the convex function: f(E[X]) <= E[f(X)].', 'Convexity', 'Medium'),
    ('qz-3', 1, 'In standard 64-bit CPython, what is the baseline memory overhead of an empty list object ([]) due to the PyVarObject header and pointer array?', array['0 bytes', '56 bytes', '256 bytes', '8 bytes']::text[], 1, 'In 64-bit CPython, sys.getsizeof([]) returns 56 bytes, encompassing the PyVarObject header (ob_refcnt, ob_type, ob_size) plus internal pointer and capacity fields.', 'CPython Internals', 'Medium'),
    ('qz-3', 2, 'How does Python''s list.append() achieve amortized O(1) time complexity despite arrays requiring contiguous memory?', array['By allocating linked-list nodes across random RAM addresses', 'By using an over-allocation strategy that grows capacity non-linearly (approximately 1.125x + 3 to 6 slots) when full', 'By deferring write operations until the list is garbage-collected', 'By compressing integers into 8-bit compact bytes']::text[], 1, 'CPython allocates spare capacity whenever a list expands, so reallocations happen exponentially less frequently, yielding O(1) amortized append time.', 'Dynamic Arrays', 'Medium'),
    ('qz-3', 3, 'In Python dictionaries (Python 3.7+), what architectural change made dicts compact and insertion-ordered?', array['Splitting into a dense array of entries (hash, key, val) and a sparse index table of small integers', 'Replacing hash tables with red-black balanced binary search trees', 'Sorting keys alphabetically upon every insertion', 'Storing all key-value pairs in a single continuous SQLite database']::text[], 0, 'Raymond Hettinger''s compact dict implementation uses a sparse hash table indexing into a dense array of entries, preserving insertion order and saving ~30% memory.', 'Hash Tables', 'Medium'),
    ('qz-3', 4, 'What memory optimization is achieved when declaring __slots__ = (''x'', ''y'') inside a custom Python class?', array['Disables all method inheritance', 'Prevents the automatic creation of a per-instance __dict__ and __weakref__, storing attributes as fixed pointer offsets', 'Converts the Python class directly into compiled C++ machine code', 'Compresses instance variables using Gzip compression']::text[], 1, 'Using __slots__ eliminates the heavy __dict__ dictionary (typically 100+ bytes per instance), storing attributes in an array of descriptors to save significant RAM when instantiating millions of objects.', 'Object Optimization', 'Easy'),
    ('qz-3', 5, 'In Python''s garbage collector, what mechanism handles circular reference cycles that cannot be freed by standard reference counting alone?', array['Manual programmer deletion via del commands', 'The Global Interpreter Lock (GIL)', 'Three-generation cyclical garbage collector (gc.collect) that tracks container objects via doubly-linked ring buffers', 'Virtual memory paging to disk swap space']::text[], 2, 'CPython uses reference counting for immediate cleanup and a generational garbage collector with 3 generations (Gen 0, 1, 2) that isolates and detects isolated reference cycles.', 'Garbage Collection', 'Hard'),
    ('qz-3', 6, 'What is the key memory difference between range(1_000_000) and list(range(1_000_000)) in Python 3?', array['range returns a lazy sequence object taking 48 bytes regardless of size, whereas the list allocates ~8 MB for integer pointers', 'range creates 1,000,000 strings in the intern table', 'range is stored on the GPU while the list is on CPU', 'Both allocate identical memory in 64-bit Python']::text[], 0, 'Python 3''s range object is a lightweight sequence descriptor storing only start, stop, and step attributes (48 bytes), while a materialized list allocates array pointers for every number.', 'Lazy Evaluation', 'Easy'),
    ('qz-3', 7, 'How does the Global Interpreter Lock (GIL) in standard CPython affect multi-threaded CPU-bound programs?', array['It forces CPU-bound threads to execute concurrently across multiple physical CPU cores without restrictions', 'It prevents deadlocks by automatically terminating slow worker threads', 'It serializes execution by allowing only one thread to execute Python bytecode at any given instant, preventing multi-core speedup for pure CPU tasks', 'It boosts CPU performance by 4x through vector SIMD instructions']::text[], 2, 'The GIL protects CPython''s memory management and reference counts by ensuring only one thread runs Python bytecode at a time, limiting multi-threaded CPU-bound speedup.', 'Concurrency & GIL', 'Medium'),
    ('qz-3', 8, 'What does copy.deepcopy() perform that distinguishes it from copy.copy() (shallow copy)?', array['It copies only private variables with leading underscores', 'It recursively duplicates all compound objects found within the original structure and maintains a memo dictionary to resolve circular references', 'It creates a symlink on the operating system file system', 'It serializes the object to JSON format and deletes the source']::text[], 1, 'A shallow copy constructs a new compound object and inserts references to existing items; deepcopy recursively duplicates every nested item, preserving graph topology.', 'Copy Semantics', 'Easy'),
    ('qz-3', 9, 'What is the purpose of Python''s string interning mechanism (sys.intern())?', array['To encrypt strings against unauthorized memory inspection', 'To ensure identical strings share the exact same memory address (singleton), making equality checks as fast as O(1) pointer comparisons (`is`)', 'To convert Unicode strings into ASCII byte arrays', 'To store strings in the CPU L1 cache exclusively']::text[], 1, 'Interning caches strings in an internal dictionary so identical strings point to the same PyASCIIObject, enabling instant pointer comparison instead of character-by-character scanning.', 'String Interning', 'Medium'),
    ('qz-3', 10, 'In CPython, small integers in the range [-5, 256] exhibit which unique memory characteristic?', array['They are pre-allocated at interpreter startup as global singletons, so a = 250 and b = 250 satisfy a is b', 'They are stored as 8-bit unsigned integers without PyObject headers', 'They are automatically converted to floating-point numbers', 'They are purged from memory after 60 seconds']::text[], 0, 'CPython pre-allocates an array of small integer objects from -5 to 256 at initialization; references to integers in this range always share the same cached object in memory.', 'Object Caching', 'Easy'),
    ('qz-4', 1, 'In the ReAct (Reasoning + Acting) prompting framework for autonomous AI agents, what sequence does the execution loop follow?', array['Thought -> Action -> Observation -> (Loop or Final Answer)', 'Prompt -> Completion -> Fine-Tuning -> Deployment', 'Vectorize -> Index -> Top-K Search -> Synthesize', 'Generate -> Discriminate -> Optimize -> Repeat']::text[], 0, 'ReAct interleaves reasoning traces (''Thought'') with task-specific actions (''Action'' / tool calls), then ingests environmental feedback (''Observation'') to decide the next step.', 'ReAct Execution Loop', 'Easy'),
    ('qz-4', 2, 'When defining tool definitions for OpenAI or Anthropic function calling, in what format is the parameter schema specified?', array['SQL DDL table create statements', 'JSON Schema object defining properties, types, and required fields', 'Python pickle serialized bytecode', 'XML doctype definitions']::text[], 1, 'Tool interfaces use standard JSON Schema definitions specifying parameter names, data types, nested properties, descriptions, and mandatory required parameters.', 'Tool Schemas', 'Easy'),
    ('qz-4', 3, 'If an agent calls a tool that returns a 404 Not Found API error, what is the best practice for robust agent self-correction?', array['Crash the application and throw an unhandled exception', 'Hardcode a synthetic success response', 'Pass the error message back into the model''s conversation history as a Tool Observation so the agent can reason and formulate an alternative action', 'Reset the conversation context to scratch']::text[], 2, 'Feeding the execution error back into the agent''s observation trace allows the LLM to inspect the failure, adjust its query parameters, or try an alternative tool.', 'Error Recovery', 'Medium'),
    ('qz-4', 4, 'What is the primary role of a System Guardrail in an enterprise agentic pipeline?', array['To speed up GPU clock speeds', 'To validate, sanitize, and enforce policies on user inputs and model tool calls before execution', 'To compile Python scripts into WebAssembly', 'To automatically translate all messages to Latin']::text[], 1, 'Guardrails (such as NeMo or Llama Guard) act as defensive middleware, scanning for prompt injections, hallucinated parameters, and policy violations before execution.', 'Safety & Guardrails', 'Medium'),
    ('qz-4', 5, 'In LangGraph, how is agentic workflow coordination modeled compared to simple linear chains?', array['As a directed cyclic state graph with nodes representing tools/agents and edges representing conditional routing logic', 'As a single giant regex pattern matcher', 'As an infinite while loop without state preservation', 'As a FIFO message queue on Redis without state']::text[], 0, 'LangGraph represents multi-step agent workflows as state graphs where nodes transform shared state and conditional edges route execution dynamically based on agent decisions.', 'State Graphs', 'Medium'),
    ('qz-4', 6, 'When an agent''s conversation history approaches the model''s context window limit, which compaction technique preserves reasoning fidelity best?', array['Truncating the first 90% of all messages indiscriminately', 'Replacing all past messages with a random seed integer', 'Summarizing older conversation turns while retaining critical tool schemas, user goals, and latest observations', 'Increasing model temperature to 2.0']::text[], 2, 'Context window compaction summarizes historical dialog while preserving core constraints, active goal states, and recent tool observations in memory.', 'Context Management', 'Hard'),
    ('qz-4', 7, 'What is the purpose of ''Human-in-the-Loop'' (HITL) approval breakpoints in autonomous agent workflows?', array['To replace the LLM with manual human keystrokes for all operations', 'To pause graph execution before high-impact or destructive actions (e.g., executing transactions or deleting databases) until human authorization is received', 'To train the user on prompt engineering', 'To measure the human''s typing speed']::text[], 1, 'HITL enables agents to execute routine tasks autonomously while pausing for explicit confirmation when critical risk thresholds or destructive tools are invoked.', 'Human-in-the-Loop', 'Medium'),
    ('qz-4', 8, 'How does the ''Plan-and-Solve'' prompting paradigm differ from standard step-by-step ReAct?', array['Plan-and-Solve does not allow using any external tools', 'Plan-and-Solve first generates an explicit multi-step sub-task plan up-front, then executes each step systematically, rather than deciding on-the-fly at each turn', 'Plan-and-Solve executes all tool calls simultaneously without waiting for results', 'Plan-and-Solve only runs on quantum hardware']::text[], 1, 'Plan-and-Solve separates macro-planning from micro-execution: it decomposes complex goals into sub-tasks first, improving trajectory adherence for complex multi-hop problems.', 'Planning Architectures', 'Medium'),
    ('qz-4', 9, 'What is ''Tool Grounding'' in the context of retrieval-augmented autonomous agents?', array['Ensuring the agent strictly bases its synthesized assertions and tool arguments on verified facts retrieved from tool observations', 'Connecting the server chassis to electrical earth ground', 'Limiting tool execution to local localhost ports only', 'Converting text outputs into grayscale images']::text[], 0, 'Grounding verifies that agent responses are directly supported by evidence extracted from tool observations rather than parametric hallucination.', 'Grounding & Verification', 'Easy'),
    ('qz-4', 10, 'In multi-agent architectures (e.g., Supervisor-Worker or Swarm), what is the function of the Supervisor Agent?', array['To render HTML CSS styles in the browser', 'To interpret user requests, delegate specific sub-tasks to specialized worker agents, and aggregate their findings into a cohesive response', 'To monitor CPU temperatures on the cloud cluster', 'To encrypt user passwords with bcrypt']::text[], 1, 'A supervisor agent orchestrates specialized subordinate agents (e.g. Coder, Researcher, Reviewer) by delegating tasks, reviewing intermediate outputs, and synthesizing final results.', 'Multi-Agent Systems', 'Medium')
  on conflict (quiz_id, position) do update set question = excluded.question, options = excluded.options, correct_index = excluded.correct_index, explanation = excluded.explanation, topic = excluded.topic, difficulty = excluded.difficulty;

  insert into public.timetable_slots (id, day, starts, ends, course_code, course_id, title, instructor, room, is_online) values
    ('tt-1', 'Monday', '09:00', '10:30', 'PY-201', 'c-2', 'Python for AI', 'Srimanth', 'AI Lab 3', false),
    ('tt-2', 'Monday', '11:00', '12:30', 'ML-301', 'c-3', 'Machine Learning Foundations', 'Srimanth', 'Lecture Hall A', false),
    ('tt-3', 'Monday', '14:00', '15:30', 'AI-401', 'c-1', 'Generative AI Masterclass', 'Srimanth', 'Virtual Room 1', true),
    ('tt-4', 'Tuesday', '09:00', '10:30', 'PY-201', 'c-2', 'Python for AI (Lab)', 'Srimanth', 'AI Lab 3', false),
    ('tt-5', 'Tuesday', '11:00', '12:30', 'ML-301', 'c-3', 'Machine Learning Math', 'Srimanth', 'Room 204', false),
    ('tt-6', 'Tuesday', '18:00', '19:30', 'AG-501', 'c-4', 'Building AI Agents (Live)', 'Srimanth', 'Broadcast Studio', true),
    ('tt-7', 'Wednesday', '10:00', '11:30', 'AI-401', 'c-1', 'RAG Systems Implementation', 'Srimanth', 'AI Lab 1', false),
    ('tt-8', 'Wednesday', '14:00', '15:30', 'ML-301', 'c-3', 'Neural Networks Lab', 'Srimanth', 'AI Lab 3', false),
    ('tt-9', 'Wednesday', '17:00', '18:30', 'SEM-10', null, 'Faculty Office Hours & Mentoring', 'Srimanth', 'Virtual Meeting B', true),
    ('tt-10', 'Thursday', '09:00', '10:30', 'PY-201', 'c-2', 'Pandas & PyTorch Tensors', 'Srimanth', 'Room 102', false),
    ('tt-11', 'Thursday', '14:00', '15:30', 'AI-401', 'c-1', 'Fine-tuning LLMs with LoRA', 'Srimanth', 'Broadcast Studio', true),
    ('tt-12', 'Thursday', '16:00', '17:30', 'ETH-30', null, 'AI Ethics & Safety Governance', 'Dr. Elena Vance', 'Hall B', false),
    ('tt-13', 'Friday', '10:00', '12:00', 'CAP-01', null, 'AI Capstone Project Workshop', 'Srimanth', 'Project Hub', false),
    ('tt-14', 'Friday', '15:00', '16:30', 'HACK-2', null, 'Hackathon Prep & Team Sync', 'Srimanth', 'Virtual Room 1', true)
  on conflict (id) do update set day = excluded.day, starts = excluded.starts, ends = excluded.ends, course_code = excluded.course_code, course_id = excluded.course_id, title = excluded.title, instructor = excluded.instructor, room = excluded.room, is_online = excluded.is_online;

  insert into public.campus_events (id, title, category, starts_at, ends_at, time_label, location, speaker, is_featured, description) values
    ('ev-1', 'Quantum AI Hackathon 2026: Autonomous Multi-Agent Systems', 'Hackathons', app_private.local_ts(d + 9, '17:00'), app_private.local_ts(d + 11, '17:00'), '48 Hours · Kickoff 5:00 PM', 'Hybrid · Quantum AI Innovation Lab & Virtual', 'Judged by AI Leaders from DeepMind & Anthropic', true, '48-hour competitive sprint to build production-grade autonomous agent systems. $15,000 cash prizes, compute credits, and venture mentoring.'),
    ('ev-2', 'Guest Lecture: The Future of Multimodal Reasoning Models', 'Guest Lectures', app_private.local_ts(d + 3, '17:00'), app_private.local_ts(d + 3, '18:30'), '05:00 PM - 06:30 PM', 'Main Auditorium & YouTube Stream', 'Dr. Elena Vance · Principal Research Director', false, 'Deep dive into cross-attention architectures combining video, audio, and sensor tokens into unified world model representations.'),
    ('ev-3', 'Workshop: Fine-Tuning Open Source LLMs with LoRA & vLLM', 'Workshops', app_private.local_ts(d + 6, '15:00'), app_private.local_ts(d + 6, '17:00'), '03:00 PM - 05:00 PM', 'Lab Room 302 & Online Hands-on', 'Srimanth', false, 'Learn efficient Parameter-Efficient Fine-Tuning (PEFT), quantization with bitsandbytes, and high-throughput model serving.'),
    ('ev-4', 'Fall Midterm Examination Period', 'Academic', app_private.local_ts(d + 12, '09:00'), app_private.local_ts(d + 18, '18:00'), 'All Day Scheduled Slots', 'Examination Halls A, B & Online Proctor', null, false, 'Midterm exams for Machine Learning Foundations, Python for AI, and Probability. Review timetables and hall tickets.')
  on conflict (id) do update set title = excluded.title, category = excluded.category, starts_at = excluded.starts_at, ends_at = excluded.ends_at, time_label = excluded.time_label, location = excluded.location, speaker = excluded.speaker, is_featured = excluded.is_featured, description = excluded.description;

  insert into public.announcements (id, title, author, department, category, content, attachment_name, attachment_size, published_at) values
    ('ann-1', 'Assignment 1 Submission Deadline Extended by 24 Hours', 'Srimanth', 'Department of Artificial Intelligence', 'Urgent', 'Due to widespread student feedback and the complexity of testing multi-document RAG pipelines with ChromaDB, Assignment 1 is extended to Oct 22 at 11:59 PM. Additional office hours will be held on Wednesday at 5:00 PM.', 'Assignment_1_Extended_Guidelines.pdf', '1.2 MB', v_anchor - interval '2 hours'),
    ('ann-2', 'Midterm Examination Schedule & Seating Allotment Released', 'Office of the Dean', 'Academic Affairs', 'Academic', 'The official examination timetable for Fall Term 2026 has been finalized. Please verify your hall ticket number, assigned examination room, and bring your physical or digital student ID.', 'Fall_2026_Midterm_Timetable.pdf', '2.4 MB', v_anchor - interval '1 day'),
    ('ann-3', 'High-Performance GPU Cluster Maintenance Window this Saturday', 'DevOps Infrastructure Team', 'Campus Tech Services', 'Infrastructure', 'The campus H100 and A100 GPU clusters will undergo scheduled maintenance this Saturday between 02:00 AM and 06:00 AM UTC. JupyterHub and SLURM batch jobs running during this window will be gracefully paused.', null, null, v_anchor - interval '2 days'),
    ('ann-4', 'New Elective: Deep Reinforcement Learning Open for Spring 2027', 'Curriculum Committee', 'School of AI', 'General', 'Students who have completed Machine Learning Foundations with a grade of B+ or higher are invited to pre-register for Spring 2027 elective: Deep RL & Robot Control with PPO and SAC.', null, null, v_anchor - interval '4 days')
  on conflict (id) do update set title = excluded.title, author = excluded.author, department = excluded.department, category = excluded.category, content = excluded.content, attachment_name = excluded.attachment_name, attachment_size = excluded.attachment_size, published_at = excluded.published_at;

  insert into public.faqs (id, category, question, answer, link_target, link_label, position) values
    ('faq-1', 'Submissions & Quizzes', 'How do I submit code solutions for assignments and programming labs?', 'Open the Assignments tab, locate the pending project, and click ''Submit Work''. You can attach a .zip/.ipynb file and paste your GitHub repository link. Submissions can be updated anytime before the due date.', 'Assignments', 'Open Assignments Page →', 0),
    ('faq-2', 'Attendance & Leaves', 'What is the minimum attendance requirement for semester exam eligibility?', 'Quantum School of AI requires a minimum of 75% attendance across each registered subject. If you need to request leave for health or conferences, click ''+ Request Leave'' in the Attendance portal.', 'Attendance', 'Check Attendance Records →', 1),
    ('faq-3', 'Courses & Labs', 'How do I check my lecture periods and join online broadcasts?', 'Visit the Class Timetable page to view your daily and weekly lecture schedule. Active live classes will feature an animated green indicator with an instant ''Join Live Stream'' button.', 'Timetable', 'View Class Timetable →', 2),
    ('faq-4', 'Getting Started', 'Where can I view my assigned faculty mentor and access 1:1 Zoom meetings?', 'Access the Mentor Details page to see your assigned faculty advisor (Prof. Srimanth Adep), their office location, research background, and scheduled 1:1 Zoom sessions.', 'Mentor Details', 'View Mentor & 1:1 Meeting →', 3),
    ('faq-5', 'Getting Started', 'How do I view my official grades and download signed transcripts?', 'The Grades page includes your cumulative GPA (3.88), term credits audit, full gradebook table, and a ''Download Transcript'' button that generates a verified PDF copy.', 'Grades', 'View Academic Grades & GPA →', 4),
    ('faq-6', 'Technical', 'How can I access the campus H100/A100 GPU computing clusters?', 'Connect to https://hub.quantumschool.ai using your student SSO credentials. If you experience quota exhaustion, submit a request via the Support page under ''Technical Problem''.', 'Support & Help', 'Open Support & Help Ticket →', 5)
  on conflict (id) do update set category = excluded.category, question = excluded.question, answer = excluded.answer, link_target = excluded.link_target, link_label = excluded.link_label, position = excluded.position;

  insert into public.study_squads (id, name, base_members, next_session, position) values
    ('sq-1', 'RAG Builders', 18, 'Thu · 7:00 PM', 0),
    ('sq-2', 'ML Math Circle', 24, 'Wed · 6:30 PM', 1),
    ('sq-3', 'Agents & Evals', 12, 'Fri · 5:00 PM', 2)
  on conflict (id) do update set name = excluded.name, base_members = excluded.base_members, next_session = excluded.next_session, position = excluded.position;

  insert into public.community_posts (id, author_id, author_name, author_avatar, author_badge, channel, title, content, base_likes, base_replies, created_at) values
    ('cp-1', null, 'Aarav Patel', '/assets/student-1.png', 'Year 4 · AI Track', 'Hackathons', 'Looking for 2 teammates for Quantum AI Hackathon (Multi-Agent Track)!', 'Hey everyone! I''m building an autonomous code review agent pipeline with AST analysis and GitHub integration. Looking for someone with frontend UI experience and a backend vector DB specialist.', 14, 4, v_anchor - interval '2 hours'),
    ('cp-2', null, 'Srimanth', '/assets/srimanth.png', 'Student · Maple Class', 'Research & Labs', 'Benchmarking RAG retrieval recall across chunk sizes (256 vs 512 vs 1024)', 'Shared my Jupyter notebook in course materials. On the healthcare Q&A dataset, 512-token semantic chunks with 50-token overlap yielded the highest MRR@5 score without blowing up token budgets.', 27, 10, v_anchor - interval '5 hours'),
    ('cp-3', null, 'Priya Sharma', '/assets/student-2.png', 'Year 4 · AI Track', 'Study Groups', 'Collaborative study session for Machine Learning Midterm this Thursday!', 'We''re hosting a review group in Virtual Room B at 7:00 PM to solve previous midterm exams on loss gradients and SVM dual formulation. Everyone is welcome to join!', 19, 7, v_anchor - interval '1 days')
  on conflict (id) do update set author_name = excluded.author_name, author_avatar = excluded.author_avatar, author_badge = excluded.author_badge, channel = excluded.channel, title = excluded.title, content = excluded.content, base_likes = excluded.base_likes, base_replies = excluded.base_replies, created_at = excluded.created_at;

  insert into public.post_replies (id, post_id, author_id, author_name, author_avatar, body, created_at) values
    ('cp-1-r1', 'cp-1', null, 'Rohit Verma', '/assets/student-3.png', 'I can take the frontend. Built a Next.js dashboard for last year''s hackathon.', v_anchor - interval '1 hours'),
    ('cp-1-r2', 'cp-1', null, 'Sneha Patel', '/assets/student-4.png', 'Interested in the vector DB side. DM me?', v_anchor - interval '45 minutes'),
    ('cp-2-r1', 'cp-2', null, 'Priya Sharma', '/assets/student-2.png', 'Super useful. Did you try a reranker on top of the 512-token chunks?', v_anchor - interval '3 hours'),
    ('cp-3-r1', 'cp-3', null, 'Aarav Patel', '/assets/student-1.png', 'Count me in. I''ll bring my SVM dual notes.', v_anchor - interval '20 hours')
  on conflict (id) do update set post_id = excluded.post_id, author_name = excluded.author_name, author_avatar = excluded.author_avatar, body = excluded.body, created_at = excluded.created_at;

  insert into public.course_questions (id, course_id, author_id, author_name, author_avatar, body, base_votes, answer_author, answer_text, created_at) values
    ('c-1-q1', 'c-1', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('c-1-q2', 'c-1', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Generative AI Masterclass be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('c-1-q3', 'c-1', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('c-2-q1', 'c-2', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('c-2-q2', 'c-2', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Python for AI be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('c-2-q3', 'c-2', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('c-3-q1', 'c-3', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('c-3-q2', 'c-3', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Machine Learning Foundations be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('c-3-q3', 'c-3', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('c-4-q1', 'c-4', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('c-4-q2', 'c-4', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for AI Agents Bootcamp be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('c-4-q3', 'c-4', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('cat-1-q1', 'cat-1', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('cat-1-q2', 'cat-1', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Prompt Engineering Deep Dive be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('cat-1-q3', 'cat-1', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('cat-2-q1', 'cat-2', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Dr. Elena Vance', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('cat-2-q2', 'cat-2', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Computer Vision with Python be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('cat-2-q3', 'cat-2', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Dr. Elena Vance', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days'),
    ('cat-3-q1', 'cat-3', null, 'Priya Sharma', '/assets/student-2.png', 'For the module lab, is it fine to use a smaller dataset locally before running the full benchmark?', 12, 'Srimanth', 'Yes. Validate the pipeline on a 5–10% sample first, then run the full benchmark on the cluster. Mention the sample size in your write-up.', v_anchor - interval '2 hours'),
    ('cat-3-q2', 'cat-3', null, 'Rohit Verma', '/assets/student-3.png', 'Will the slides for Autonomous Robotics with ROS2 be updated with the examples from the live session?', 7, null, null, v_anchor - interval '1 day'),
    ('cat-3-q3', 'cat-3', null, 'Sneha Patel', '/assets/student-4.png', 'What''s the best way to revise before the module quiz: notebooks or the reading list?', 5, 'Srimanth', 'Start with the notebooks; the quiz questions follow the lab exercises closely. Use the reading list for the theory questions.', v_anchor - interval '3 days')
  on conflict (id) do update set course_id = excluded.course_id, author_name = excluded.author_name, author_avatar = excluded.author_avatar, body = excluded.body, base_votes = excluded.base_votes, answer_author = excluded.answer_author, answer_text = excluded.answer_text, created_at = excluded.created_at;

end $$;

create or replace function app_private.seed_student_demo(p_student uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_anchor timestamptz := coalesce((select (value #>> '{}')::timestamptz from app_private.settings where key = 'demo_anchor'), now());
  d date := (v_anchor at time zone app_private.campus_tz())::date;
  v_excused date;
begin
  -- Start from a clean slate: everything this student owns.
  delete from public.notifications where student_id = p_student;
  delete from public.mentor_requests where student_id = p_student;
  delete from public.mentor_meetings where student_id = p_student;
  delete from public.resumes where student_id = p_student;
  delete from public.interview_sessions where student_id = p_student;
  delete from public.support_chat_messages where student_id = p_student;
  delete from public.support_tickets where student_id = p_student;
  delete from public.faq_votes where student_id = p_student;
  delete from public.notes where student_id = p_student;
  delete from public.announcement_reads where student_id = p_student;
  delete from public.event_registrations where student_id = p_student;
  delete from public.reminders where student_id = p_student;
  delete from public.leave_requests where student_id = p_student;
  delete from public.attendance_records where student_id = p_student;
  delete from public.certificates where student_id = p_student;
  delete from public.gpa_history where student_id = p_student;
  delete from public.grades where student_id = p_student;
  delete from public.quiz_attempts where student_id = p_student;
  delete from public.assignment_submissions where student_id = p_student;
  delete from public.study_activity where student_id = p_student;
  delete from public.lesson_progress where student_id = p_student;
  delete from public.post_likes where student_id = p_student;
  delete from public.post_saves where student_id = p_student;
  delete from public.squad_members where student_id = p_student;
  delete from public.course_question_votes where student_id = p_student;
  delete from public.enrollments where student_id = p_student;
  delete from public.community_posts where author_id = p_student;
  delete from public.post_replies where author_id = p_student;
  delete from public.course_questions where author_id = p_student;

  update public.profiles set
    full_name = 'Aarav Mehta', avatar_url = '/assets/student-2.png', headline = 'Learner · Generative AI Engineering', roll_number = 'QAI-2026-042',
    phone = '+91 98765 43210', location = 'Bengaluru, India', bio = 'AI engineering student building retrieval-augmented and multi-agent systems.',
    program = 'Bachelor of Science in Artificial Intelligence', batch = 'Class of 2027 · Year 4', department = 'School of Computing & Machine Intelligence', gpa = '3.88 / 4.00',
    credits_completed = 42, total_credits = 60, campus_address = '402 Quantum Hall, Maple Avenue Campus',
    emergency_contact = 'Ananya Sharma (+1 555-902-1144)', mentor_id = 'mentor-1', notification_prefs = '{}'::jsonb,
    quiet_hours = '22-07', ui_state = '{}'::jsonb, is_demo = true
  where id = p_student;

  -- Enrolling creates one In Progress certificate row per course (trigger on enrollments).
  insert into public.enrollments (student_id, course_id, enrolled_at) values
    (p_student, 'c-1', v_anchor - interval '70 days'),
    (p_student, 'c-2', v_anchor - interval '63 days'),
    (p_student, 'c-3', v_anchor - interval '56 days'),
    (p_student, 'c-4', v_anchor - interval '49 days');

  -- Completed lessons in course order; the last one per course is the most recent study session.
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at)
  select p_student, l.id, l.course_id, least(app_private.local_ts(d - 1 - (18 - x.n)::int * 2, '19:30'), v_anchor - interval '5 minutes')
  from unnest(array['l-1-1', 'l-1-2', 'l-1-3', 'l-1-4', 'l-2-1', 'l-2-2', 'l-2-3', 'l-2-4', 'l-3-1', 'l-3-2', 'l-3-3', 'l-3-4', 'l-4-1', 'l-4-2', 'l-4-3', 'l-4-4', 'l-5-1', 'l-5-2']::text[]) with ordinality as x(id, n) join public.lessons l on l.id = x.id;
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at)
  select p_student, l.id, l.course_id, least(app_private.local_ts(d - 2 - (9 - x.n)::int * 3, '19:30'), v_anchor - interval '5 minutes')
  from unnest(array['c-2-m1-l1', 'c-2-m1-l2', 'c-2-m1-l3', 'c-2-m2-l1', 'c-2-m2-l2', 'c-2-m2-l3', 'c-2-m3-l1', 'c-2-m3-l2', 'c-2-m3-l3']::text[]) with ordinality as x(id, n) join public.lessons l on l.id = x.id;
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at)
  select p_student, l.id, l.course_id, least(app_private.local_ts(d - 3 - (5 - x.n)::int * 4, '19:30'), v_anchor - interval '5 minutes')
  from unnest(array['c-3-m1-l1', 'c-3-m1-l2', 'c-3-m1-l3', 'c-3-m2-l1', 'c-3-m2-l2']::text[]) with ordinality as x(id, n) join public.lessons l on l.id = x.id;
  insert into public.lesson_progress (student_id, lesson_id, course_id, completed_at)
  select p_student, l.id, l.course_id, least(app_private.local_ts(d - 10 - (24 - x.n)::int * 2, '19:30'), v_anchor - interval '5 minutes')
  from unnest(array['c-4-m1-l1', 'c-4-m1-l2', 'c-4-m1-l3', 'c-4-m2-l1', 'c-4-m2-l2', 'c-4-m2-l3', 'c-4-m3-l1', 'c-4-m3-l2', 'c-4-m3-l3', 'c-4-m4-l1', 'c-4-m4-l2', 'c-4-m4-l3', 'c-4-m5-l1', 'c-4-m5-l2', 'c-4-m5-l3', 'c-4-m6-l1', 'c-4-m6-l2', 'c-4-m6-l3', 'c-4-m7-l1', 'c-4-m7-l2', 'c-4-m7-l3', 'c-4-m8-l1', 'c-4-m8-l2', 'c-4-m8-l3']::text[]) with ordinality as x(id, n) join public.lessons l on l.id = x.id;

  -- 120 days of study minutes with a 12-day streak up to yesterday.
  insert into public.study_activity (student_id, day, minutes, lessons)
  select p_student, s.day, s.minutes, greatest(1, round(s.minutes / 45.0))::int from (
    select d - g as day,
      case
        when g <= 12 then 40 + abs(hashtext('streak' || g)) % 95
        when extract(isodow from d - g) in (6, 7) and abs(hashtext('weekend' || g)) % 3 > 0 then 0
        when abs(hashtext('rest' || g)) % 7 = 0 then 0
        else 25 + abs(hashtext('study' || g)) % 125
      end as minutes
    from generate_series(1, 120) g
  ) s where s.minutes > 0;

  insert into public.assignment_submissions (student_id, assignment_id, status, repo_url, comments, submitted_at, score, grade, feedback, graded_at) values
    (p_student, 'asg-3', 'Submitted', 'https://github.com/aaravmehta/data-analysis-feature-engineering-on-hea', null, least(app_private.local_ts(d + -7, '21:10'), v_anchor - interval '5 minutes'), null, null, null, null),
    (p_student, 'asg-4', 'Graded', 'https://github.com/aaravmehta/autonomous-agent-tool-calling-web-search', null, least(app_private.local_ts(d + -12, '21:10'), v_anchor - interval '5 minutes'), 96, 'A+', 'Exceptional architecture! Clean error handling on Tavily web search tool and concise reflection loop.', least(app_private.local_ts(d + -10, '11:00'), v_anchor - interval '5 minutes')),
    (p_student, 'asg-5', 'Graded', 'https://github.com/aaravmehta/vector-similarity-metrics-mathematical-c', null, least(app_private.local_ts(d + -17, '21:10'), v_anchor - interval '5 minutes'), 98, 'A+', 'Flawless mathematical derivations for Cosine vs Manhattan vs Euclidean distances in high dimensions.', least(app_private.local_ts(d + -15, '11:00'), v_anchor - interval '5 minutes'));

  -- Past attempts are graded by app_private.grade_attempt, the same code that grades live submissions.
  insert into public.quiz_attempts (id, student_id, quiz_id, attempt_number, started_at, deadline_at, answers) values
    ('att-qz-3', p_student, 'qz-3', 1, least(app_private.local_ts(d + -10, '14:08'), v_anchor - interval '5 minutes'), least(app_private.local_ts(d + -10, '14:32'), v_anchor - interval '5 minutes'), '{"0":1,"1":1,"2":0,"3":1,"4":2,"5":0,"6":0,"7":1,"8":1,"9":0}'::jsonb),
    ('att-qz-4', p_student, 'qz-4', 1, least(app_private.local_ts(d + -14, '15:48'), v_anchor - interval '5 minutes'), least(app_private.local_ts(d + -14, '16:15'), v_anchor - interval '5 minutes'), '{"0":0,"1":1,"2":2,"3":1,"4":0,"5":2,"6":1,"7":1,"8":0,"9":1}'::jsonb);

  perform app_private.grade_attempt('att-qz-3', false);
  update public.quiz_attempts set feedback = 'Outstanding comprehension of CPython memory layout, object allocation, and dictionary hash tables. Review question 7 on GIL multi-threading behavior.' where id = 'att-qz-3';
  perform app_private.grade_attempt('att-qz-4', false);
  update public.quiz_attempts set feedback = 'Flawless score! Exceptional grasp of ReAct reasoning loops, JSON schema tool parameter definitions, and agent error recovery mechanisms.' where id = 'att-qz-4';

  insert into public.grades (student_id, course_code, course_title, credits, midterm, assignments, final_exam, total_score, letter_grade, status, term, position) values
    (p_student, 'AI-401', 'Generative AI Masterclass', 4, 96, 97, 94, 95.5, 'A+', 'In Progress', 'Fall 2026', 0),
    (p_student, 'PY-201', 'Python for AI', 3, 94, 95, 92, 93.6, 'A', 'In Progress', 'Fall 2026', 1),
    (p_student, 'ML-301', 'Machine Learning Foundations', 4, 90, 92, 88, 90, 'A', 'In Progress', 'Fall 2026', 2),
    (p_student, 'AG-501', 'AI Agents Bootcamp', 4, 98, 99, 97, 98, 'A+', 'Passed with Honors', 'Fall 2026', 3),
    (p_student, 'CS-102', 'Data Structures & Algorithms', 4, 92, 94, 91, 92.3, 'A', 'Passed with Honors', 'Spring 2026', 4),
    (p_student, 'MATH-201', 'Linear Algebra & Probability for AI', 4, 95, 96, 93, 94.6, 'A+', 'Passed with Honors', 'Spring 2026', 5);

  insert into public.gpa_history (student_id, position, term, gpa) values
    (p_student, 0, 'Fall 24', 3.62),
    (p_student, 1, 'Spring 25', 3.7),
    (p_student, 2, 'Fall 25', 3.74),
    (p_student, 3, 'Spring 26', 3.81),
    (p_student, 4, 'Fall 26', 3.88);

  -- Certificates: mark the earned ones and label when the others are expected.
  update public.certificates set status = 'Earned', issued_at = least(app_private.local_ts(d + -3, '10:00'), v_anchor - interval '5 minutes'), credential_id = 'QAI-88392-PY', grade = 'Grade: A+ (With Distinction)'
  where student_id = p_student and course_id = 'c-2';
  update public.certificates set status = 'Earned', issued_at = least(app_private.local_ts(d + -11, '10:00'), v_anchor - interval '5 minutes'), credential_id = 'QAI-77401-AG', grade = 'Grade: A+ (Honors)'
  where student_id = p_student and course_id = 'c-4';
  update public.certificates set expected_label = 'Expected ' || to_char(d + 30, 'Mon YYYY') where student_id = p_student and course_id = 'c-1';
  update public.certificates set expected_label = 'Expected ' || to_char(d + 60, 'Mon YYYY') where student_id = p_student and course_id = 'c-3';

  -- Attendance for the most recent classes of each course.
  insert into public.attendance_records (student_id, course_code, course_name, class_date, status)
  select p_student, 'AI-401', 'Generative AI Masterclass', c.day, case c.n when 7 then 'Late' else 'Present' end
  from (select g::date as day, row_number() over (order by g desc) as n
        from generate_series(d - 120, d - 1, interval '1 day') g where extract(isodow from g) in (1, 3, 4)) c
  where c.n <= 14;
  insert into public.attendance_records (student_id, course_code, course_name, class_date, status)
  select p_student, 'PY-201', 'Python for AI', c.day, 'Present'
  from (select g::date as day, row_number() over (order by g desc) as n
        from generate_series(d - 120, d - 1, interval '1 day') g where extract(isodow from g) in (1, 2, 4)) c
  where c.n <= 12;
  insert into public.attendance_records (student_id, course_code, course_name, class_date, status)
  select p_student, 'ML-301', 'Machine Learning Foundations', c.day, case c.n when 5 then 'Absent' else 'Present' end
  from (select g::date as day, row_number() over (order by g desc) as n
        from generate_series(d - 120, d - 1, interval '1 day') g where extract(isodow from g) in (1, 2, 3)) c
  where c.n <= 12;
  insert into public.attendance_records (student_id, course_code, course_name, class_date, status)
  select p_student, 'AG-501', 'AI Agents Bootcamp', c.day, case c.n when 2 then 'Excused' else 'Present' end
  from (select g::date as day, row_number() over (order by g desc) as n
        from generate_series(d - 120, d - 1, interval '1 day') g where extract(isodow from g) in (2)) c
  where c.n <= 10;
  select class_date into v_excused from public.attendance_records where student_id = p_student and status = 'Excused' limit 1;
  insert into public.leave_requests (student_id, course_code, leave_date, reason, status, created_at)
  values (p_student, 'AG-501', v_excused, 'Medical leave: fever. Clinic slip shared with Academic Affairs (ticket TKT-71204).', 'Approved', app_private.local_ts(v_excused, '20:00'));

  insert into public.event_registrations (student_id, event_id, created_at) values
    (p_student, 'ev-1', v_anchor - interval '6 days');

  insert into public.announcement_reads (student_id, announcement_id, read_at) values
    (p_student, 'ann-3', v_anchor - interval '1 day'),
    (p_student, 'ann-4', v_anchor - interval '1 day');

  insert into public.notes (student_id, title, course, content, snippet, tags, pinned, lesson, created_at, updated_at) values
    (p_student, 'RAG Context Optimization & Chunking Strategies', 'Generative AI Masterclass', 'When documents have strong semantic hierarchy, markdown-aware chunking outperforms fixed-token sliding windows. Crucial to prepend section headings to sub-chunks.', 'splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
chunks = splitter.split_text(doc)', array['RAG', 'LangChain', 'VectorDB']::text[], true, null, v_anchor - interval '3 hours' - interval '2 days', v_anchor - interval '3 hours'),
    (p_student, 'NumPy Broadcasting & Vectorized Math Notes', 'Python for AI', 'Two dimensions are compatible when they are equal, or one of them is 1. Trailing dimensions are matched first from right to left.', '# Shape (4, 1) + Shape (3,) -> broadcasts to (4, 3)
A[:, None] + B[None, :]', array['NumPy', 'Tensors', 'Math']::text[], false, null, v_anchor - interval '1 day' - interval '2 days', v_anchor - interval '1 day'),
    (p_student, 'Backpropagation Matrix Calculus Derivations', 'Machine Learning Foundations', 'dL/dW = (dL/dZ) @ X.T. Always ensure the dimensions of gradient match the parameter weight dimensions exactly.', 'dW = np.dot(dZ, A_prev.T) / m
db = np.sum(dZ, axis=1, keepdims=True) / m', array['NeuralNets', 'Calculus', 'GradDescent']::text[], false, null, v_anchor - interval '3 days' - interval '2 days', v_anchor - interval '3 days'),
    (p_student, 'ReAct Pattern vs Plan-and-Solve Agent Loops', 'AI Agents Bootcamp', 'ReAct dynamically interleaves Thought and Action. Useful for tasks with uncertain tool outputs. Plan-and-solve reduces token usage for deterministic DAGs.', 'AgentState = TypedDict(''AgentState'', {''messages'': list[BaseMessage]})', array['LangGraph', 'Agents', 'Architecture']::text[], false, null, least(app_private.local_ts(d + -4, '18:00'), v_anchor - interval '5 minutes') - interval '2 days', least(app_private.local_ts(d + -4, '18:00'), v_anchor - interval '5 minutes'));

  -- Support tickets keep their original ids (new tickets continue from app_private.ticket_number_seq).
  insert into public.support_tickets (id, student_id, category, subject, description, priority, status, attachment_name, attachment_size, resolution_notes, last_update_by, created_at, updated_at) values
    ('TKT-84920', p_student, 'Technical Support', 'H100 GPU Cluster allocation quota extension for RAG benchmarking', 'Requesting additional compute hours on node slurm-h100-04 to run embedding latency benchmarks across 50,000 document chunks for thesis research.', 'High', 'In Progress', 'slurm_resource_spec.yaml', '24 KB', 'System admin allocated 40 additional GPU hours to student cluster account. Valid until Oct 25.', 'DevOps Admin', least(app_private.local_ts(d + -1, '09:30'), v_anchor - interval '5 minutes'), v_anchor - interval '3 hours'),
    ('TKT-71204', p_student, 'Live Classes & Attendance', 'Medical leave verification for Oct 14 absence', 'Submitted official health center medical slip for excused absence on Oct 14 during Machine Learning Foundations lecture.', 'Medium', 'Resolved', 'health_clinic_slip_oct14.pdf', '340 KB', 'Medical slip verified and attendance status updated to Excused Absence.', 'Academic Affairs', least(app_private.local_ts(d + -6, '10:15'), v_anchor - interval '5 minutes'), least(app_private.local_ts(d + -5, '16:00'), v_anchor - interval '5 minutes')),
    ('TKT-92145', p_student, 'Live Classes & Attendance', 'Timetable clash between AI Ethics seminar and Lab 4 slot', 'There is an overlapping period on Wednesday between 02:00 PM - 03:30 PM where AI Ethics (Virtual Room 1) and Lab 4 (Lab 2) are scheduled simultaneously.', 'Urgent', 'Open', 'timetable_conflict_screenshot.png', '1.2 MB', null, null, least(app_private.local_ts(d + 0, '08:45'), v_anchor - interval '5 minutes'), least(app_private.local_ts(d + 0, '08:45'), v_anchor - interval '5 minutes')),
    ('TKT-63019', p_student, 'Course & Content Management', 'Senior thesis advisor sign-off for Spring 2027 Elective track', 'Scheduled advising session with Prof. Srimanth Adep regarding autonomous agent robotics research track.', 'Low', 'Closed', null, null, 'Thesis proposal approved and enrollment prerequisite waived.', 'You', least(app_private.local_ts(d + -13, '16:10'), v_anchor - interval '5 minutes'), least(app_private.local_ts(d + -11, '16:00'), v_anchor - interval '5 minutes'));

  insert into public.ticket_replies (ticket_id, author_id, author_name, author_role, author_avatar, content, attachment_name, created_at) values
    ('TKT-84920', p_student, 'Aarav Mehta', 'Student', '/assets/student-2.png', 'Hello Infrastructure Team, our benchmark runs are terminating after 2 hours because the default pod timeout was hit. Could we get a temporary quota increase of 40 GPU hours on slurm-h100-04? Config is attached.', 'slurm_resource_spec.yaml', least(app_private.local_ts(d + -1, '09:30'), v_anchor - interval '5 minutes')),
    ('TKT-84920', null, 'DevOps Cluster Admin', 'Support Team', null, 'Hi Aarav, we reviewed your resource spec. We have granted 40 additional compute hours to your student namespace `student-aarav-lab`. Please monitor GPU memory allocations to prevent OOM errors.', null, least(app_private.local_ts(d + -1, '11:45'), v_anchor - interval '5 minutes')),
    ('TKT-84920', p_student, 'Aarav Mehta', 'Student', '/assets/student-2.png', 'Thank you! The jobs are actively running now without memory faults. Will let you know once the runs complete.', null, least(app_private.local_ts(d + -1, '13:15'), v_anchor - interval '5 minutes')),
    ('TKT-71204', p_student, 'Aarav Mehta', 'Student', '/assets/student-2.png', 'Attached the clinical consultation slip for my absence on Monday, Oct 14. Requesting this lecture session be marked as an Excused Medical Absence so my attendance threshold remains above 85%.', 'health_clinic_slip_oct14.pdf', least(app_private.local_ts(d + -6, '10:15'), v_anchor - interval '5 minutes')),
    ('TKT-71204', null, 'Dean of Student Records', 'Support Team', null, 'The medical certificate has been authenticated by the Campus Health Desk. Your record in ML-301 has been updated to Excused Absence.', null, least(app_private.local_ts(d + -5, '14:20'), v_anchor - interval '5 minutes')),
    ('TKT-92145', p_student, 'Aarav Mehta', 'Student', '/assets/student-2.png', 'Both courses are mandatory core modules for 4th year AI majors. Please advise if a second lab section will be made available.', 'timetable_conflict_screenshot.png', least(app_private.local_ts(d + 0, '08:45'), v_anchor - interval '5 minutes')),
    ('TKT-63019', p_student, 'Aarav Mehta', 'Student', '/assets/student-2.png', 'Requesting approval to take CS-592 Advanced Multi-Agent RL concurrently with the capstone thesis.', null, least(app_private.local_ts(d + -13, '16:10'), v_anchor - interval '5 minutes')),
    ('TKT-63019', null, 'Prof. Srimanth Adep', 'Faculty', null, 'Prerequisite checked and GPA requirements satisfied. The elective waiver has been signed off in the registrar system.', null, least(app_private.local_ts(d + -11, '09:00'), v_anchor - interval '5 minutes'));

  insert into public.interview_sessions (student_id, role, type, level, score, duration_seconds, responses, created_at) values
    (p_student, 'AI Engineer', 'Technical', 'Fresher', 81, 1260, '[]'::jsonb, least(app_private.local_ts(d + -3, '18:30'), v_anchor - interval '5 minutes')),
    (p_student, 'ML Engineer', 'Behavioral', 'Fresher', 72, 980, '[]'::jsonb, least(app_private.local_ts(d + -9, '18:30'), v_anchor - interval '5 minutes'));

  -- The scheduled mentor meeting falls on the first Friday after tomorrow.
  insert into public.mentor_meetings (student_id, mentor_id, meeting_date, slot, ends_slot, topic, agenda, zoom_url, status, created_at)
  values (p_student, 'mentor-1', (d + 2) + ((5 - extract(isodow from d + 2)::int + 7) % 7), '05:00 PM', '05:45 PM',
          'Senior Thesis Advising & RAG Architecture Review', 'Review Year 4 capstone evaluation milestones, multi-agent cognitive graph benchmarks, and conference submission draft.', 'https://zoom.us/j/98421038592?pwd=QAI-QuantumMentor-2026', 'Scheduled', v_anchor - interval '2 days');

  insert into public.post_likes (student_id, post_id) select p_student, 'cp-2';
  insert into public.squad_members (student_id, squad_id, joined_at) values (p_student, 'sq-1', v_anchor - interval '20 days');

  insert into public.notifications (student_id, kind, title, message, link, read_at, created_at) values
    (p_student, 'system', 'New announcement from Srimanth', 'Assignment 1 Submission Deadline Extended by 24 Hours', 'announcements', null, v_anchor - interval '2 hours'),
    (p_student, 'system', 'Support replied to TKT-84920', 'DevOps Cluster Admin granted 40 more compute hours on slurm-h100-04.', 'support', null, v_anchor - interval '3 hours'),
    (p_student, 'assessment', 'Quiz open: Quiz 4: Vector Embeddings & Similarity Search', (select format('Due %s · %s questions, %s minutes', to_char(due_at at time zone app_private.campus_tz(), 'Mon FMDD'), question_count, duration_minutes) from public.quizzes where id = 'qz-1'), 'assessments', null, v_anchor - interval '3 days'),
    (p_student, 'class', 'Mentor meeting scheduled', 'Senior Thesis Advising & RAG Architecture Review with Prof. Srimanth Adep', 'mentorship', v_anchor - interval '1 day', v_anchor - interval '2 days'),
    (p_student, 'grade', 'Certificate earned', 'Python for AI & Data Science is ready to share from Grades & Certificates.', 'certificates', v_anchor - interval '2 days', v_anchor - interval '3 days'),
    (p_student, 'grade', 'Assignment graded', 'Autonomous Agent Tool Calling & Web Search System · 96/100 (A+)', 'assessments', v_anchor - interval '9 days', v_anchor - interval '10 days');
end $$;

revoke execute on function app_private.seed_content(timestamptz), app_private.seed_student_demo(uuid) from public, anon, authenticated;

select app_private.seed_content(now());
