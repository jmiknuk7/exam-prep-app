import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Home, BookOpen, Layers, CheckSquare, Info, Flame, Award, RefreshCw, ChevronRight, ChevronLeft, RotateCcw, CheckCircle2, XCircle, Target, Zap, AlertCircle, Shield, FileText, ListChecks } from 'lucide-react';

// ============================================================
// STORAGE LAYER — works in Claude artifacts (window.storage)
// AND in VS Code / standalone React (localStorage). Auto-detects.
// ============================================================
const storage = {
  async get(key) {
    try {
      if (typeof window !== 'undefined' && window.storage?.get) return await window.storage.get(key);
      if (typeof localStorage !== 'undefined') { const v = localStorage.getItem(key); return v !== null ? { key, value: v } : null; }
    } catch (e) {}
    return null;
  },
  async set(key, value) {
    try {
      if (typeof window !== 'undefined' && window.storage?.set) return await window.storage.set(key, value);
      if (typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return { key, value }; }
    } catch (e) {}
    return null;
  },
};

// ============================================================
// DOMAINS — weights from the official exam guide
// ============================================================
const DOMAINS = [
  { id: 'd1', name: 'Agentic Architecture & Orchestration', short: 'Agentic Arch', weight: 27, color: '#C2410C' },
  { id: 'd2', name: 'Tool Design & MCP Integration', short: 'Tools & MCP', weight: 18, color: '#0F766E' },
  { id: 'd3', name: 'Claude Code Configuration', short: 'Claude Code', weight: 20, color: '#1E40AF' },
  { id: 'd4', name: 'Prompt Engineering & Structured Output', short: 'Prompting', weight: 20, color: '#7C3AED' },
  { id: 'd5', name: 'Context Management & Reliability', short: 'Context & Reliability', weight: 15, color: '#B45309' },
  { id: 'proj', name: 'Projects (Bonus)', short: 'Projects', weight: 0, color: '#475569' },
];

// ============================================================
// READ & REVIEW SECTIONS — content verified against official
// Anthropic exam guide, SDK docs, Claude Code docs, MCP spec
// ============================================================
const SECTIONS = {
  d1: [
    { id: 'd1s1', title: 'Agentic Loop Lifecycle & stop_reason', body: 'The agentic loop: send a Messages API request with tools → receive a response → inspect stop_reason → execute any tool calls → append tool results to conversation history → iterate. The four stop_reason values are end_turn (show final response to user), tool_use (execute the tool and continue), max_tokens (truncated — increase limit), and stop_sequence (hit a configured stop string). For agentic systems, only end_turn and tool_use matter in flow control. THE ONLY RELIABLE COMPLETION SIGNAL IS stop_reason == "end_turn". Anti-patterns to avoid: parsing natural language for completion phrases like "done" or "task complete"; using an arbitrary iteration cap (e.g., 15 turns) as the PRIMARY stopping mechanism; checking assistant text content as a completion indicator. Iteration caps are a safety net, not termination logic.' },
    { id: 'd1s2', title: 'Model-Driven vs Pre-Configured Decision Trees', body: 'Claude in an agentic loop chooses the next tool based on accumulated context and prior tool results — model-driven decision-making. This is different from hard-coded decision trees or fixed tool sequences. Model-driven is more flexible (adapts to ambiguous user requests, handles edge cases by reasoning) but less predictable. Hard-coded pipelines are predictable and cheaper but can\'t adapt. Common production pattern: a deterministic outer pipeline (e.g., always extract-then-enrich) combined with a model-driven inner step (Claude picks which enrichment is needed).' },
    { id: 'd1s3', title: 'Hub-and-Spoke: Coordinator-Subagent Architecture', body: 'A coordinator orchestrates multiple specialized subagents. The coordinator: decomposes tasks, dynamically selects which subagents to invoke based on query requirements (not just routing through the full pipeline every time), delegates via the Task tool, aggregates and validates results, handles errors uniformly, and routes communication. All inter-subagent communication MUST flow through the coordinator — not agent-to-agent — for observability, consistent error handling, and controlled information flow. Iterative refinement loop: the coordinator evaluates synthesis output for gaps, re-delegates to search/analysis subagents with targeted queries, re-invokes synthesis until coverage is sufficient. Over-narrow decomposition is a well-documented failure mode (e.g., decomposing "creative industries" as only visual arts).' },
    { id: 'd1s4', title: 'Task Tool & allowedTools for Spawning Subagents', body: 'Subagents are spawned via the Task tool. The coordinator\'s allowedTools MUST include "Task" (newer SDKs also emit "Agent"). Parallel subagent execution: emit multiple Task tool calls in a single coordinator RESPONSE (not across separate turns) — the SDK runs them concurrently. Explicit context passing is mandatory: subagent context must be provided directly in the prompt. Subagents do NOT automatically inherit parent context. Pattern for research: coordinator emits Task 1 (web search), Task 2 (document analysis), Task 3 (search another domain) in one response. All three run in parallel.' },
    { id: 'd1s5', title: 'Subagent Context Isolation', body: 'Subagents operate with isolated context. They do NOT inherit the coordinator\'s conversation history, and they do NOT share memory between invocations. Any information a subagent needs must be explicitly included in its prompt. Pattern: pass complete findings from prior agents directly (e.g., web search results and document analysis outputs into the synthesis subagent\'s prompt). Use structured data formats to separate content from metadata (source URLs, document names, page numbers) when passing context — preserves attribution downstream. Coordinator prompts should specify research goals and quality criteria rather than step-by-step procedural instructions — this enables subagent adaptability.' },
    { id: 'd1s6', title: 'AgentDefinition Configuration', body: 'AgentDefinition fields in the Claude Agent SDK: description (tells Claude when to use this subagent — this is the selection signal, write carefully), prompt (system prompt defining behavior), tools (restricted tool list — principle of least privilege), model ("sonnet"/"opus"/"haiku"/"inherit" — use cheaper models for simpler subtasks), mcpServers, skills, maxTurns. Programmatically defined agents (via the agents parameter) take precedence over filesystem-based agents with the same name. Give each subagent only the tools it needs for its role — too many tools (18 vs 4–5) degrades tool selection reliability.' },
    { id: 'd1s7', title: 'Agent SDK Hooks — Events & Enforcement', body: 'Hook events: PreToolUse (before tool executes — can deny/allow/ask), PostToolUse (after tool returns — can modify output), PostToolUseFailure, UserPromptSubmit, SessionStart/SessionEnd, Stop, SubagentStart/SubagentStop, PreCompact, PermissionRequest, Notification. TypeScript adds Setup, TeammateIdle, TaskCompleted, ConfigChange, WorktreeCreate, WorktreeRemove. Hook input includes session_id, tool_name, tool_input, and for subagent calls agent_id/agent_type. PreToolUse fires BEFORE permission-mode checks — a hook that returns permissionDecision:"deny" blocks a tool even in bypassPermissions mode. PostToolUse cannot undo actions (tool already ran) — use it for data normalization and context injection, not for enforcement.' },
    { id: 'd1s8', title: 'Hook Enforcement vs Prompt Guidance', body: 'Hooks provide DETERMINISTIC (100%) guarantees. Prompts provide PROBABILISTIC (>90%, never 100%) compliance. Rule: when failure has financial, legal, compliance, or safety consequences — use hooks, not prompts. Examples of hook patterns: (1) PostToolUse hook that normalizes heterogeneous data formats (Unix timestamps → ISO 8601, numeric status codes → labels) from different MCP tools before the agent processes them. (2) PreToolUse hook that blocks refunds above $500 and redirects to escalation. (3) Programmatic prerequisite that blocks process_refund calls until get_customer has returned a verified customer ID. Prompt instructions like "never refund over $500" or "always verify customer first" have non-zero failure rates — unacceptable when money or identity is on the line.' },
    { id: 'd1s9', title: 'Session Management — Resume, Fork, Fresh', body: 'Three session patterns. --resume <session-name> continues a specific named prior session — useful for long multi-day investigations. fork_session creates independent branches from a shared analysis baseline — useful to explore divergent approaches (Redux vs Context API) without losing the common prior work. Starting FRESH with a structured summary is MORE RELIABLE than --resume when prior tool results are stale (files have changed since last session, or substantial time has passed). When resuming after code modifications, explicitly inform the agent of changes — this enables targeted re-analysis instead of forcing full re-exploration. A fresh session with a compact briefing ("Here\'s what we found: [summary]. Continue by investigating X") often beats resume with outdated tool outputs.' },
    { id: 'd1s10', title: 'Task Decomposition Strategies', body: 'Two decomposition patterns. PROMPT CHAINING (fixed sequential steps) for predictable multi-aspect work: analyze each file separately, THEN run a cross-file integration pass. Use for code review, multi-pass extraction, staged pipelines. DYNAMIC ADAPTIVE DECOMPOSITION for open-ended investigation: generate subtasks based on intermediate findings. Example: "add comprehensive tests to a legacy codebase" → first map structure with Grep/Glob, then identify high-impact untested areas, then create a prioritized plan that adapts as dependencies are discovered. Multi-concern customer requests should be decomposed into distinct items, each investigated in parallel using shared context, then synthesized into a unified resolution. Large code reviews (10+ files): per-file local analysis passes + a separate cross-file integration pass — avoids attention dilution.' },
    { id: 'd1s11', title: 'Structured Handoff Protocols', body: 'When escalating to a human, compile a structured handoff summary containing: customer ID, issue summary, root cause, order/transaction IDs, actions taken (list), relevant amounts, recommended action, escalation reason. The human operator typically does NOT have access to the full conversation transcript — the summary must be self-contained. For emotional-but-not-explicit escalation signals: acknowledge frustration → propose a concrete resolution → escalate only if customer REITERATES the desire for a human. For explicit "get me a manager": escalate IMMEDIATELY without first attempting to solve.' },
  ],
  d2: [
    { id: 'd2s1', title: 'Tool Description Design', body: 'Tool descriptions are the PRIMARY mechanism LLMs use for tool selection. Minimal descriptions ("Retrieves customer info") cause misrouting when tools overlap. A good description includes: what the tool does and returns, input formats and example values, edge cases and constraints, explicit boundaries vs similar tools ("Use this tool WHEN X. Use lookup_order WHEN Y"). Write descriptions FOR THE MODEL, not the human. Rename to eliminate functional overlap: analyze_content + analyze_document → extract_web_results (web-specific) + parse_uploaded_document (file-specific). Split generic tools into purpose-specific tools with defined input/output contracts. Review system prompts for keyword-sensitive instructions that might override well-written descriptions (e.g., "always verify the customer" can cause get_customer overuse even when unnecessary).' },
    { id: 'd2s2', title: 'MCP Primitives: Tools, Resources, Prompts', body: 'Model Context Protocol exposes three primitive types. TOOLS are executable functions the model can call (get_customer, process_refund). RESOURCES are data the model can read for context (content catalogs, database schemas, issue/task hierarchies, documentation) — reduce exploratory tool calls by providing an immediate "map". PROMPTS are reusable templates invoked as /mcp__server__name. Don\'t force data into tools if a resource fits — resources are cheaper (no execution) and clearer. In Claude Code, reference MCP resources with @ mentions (@server:resource://id).' },
    { id: 'd2s3', title: 'MCP Transports: stdio, HTTP, SSE', body: 'Three transports. stdio runs the MCP server as a local child process over stdin/stdout — best for local development tools. Never write logs to stdout in a stdio server — corrupts JSON-RPC. HTTP (streamable with JSON-RPC) is the RECOMMENDED remote transport, supports OAuth natively. SSE (Server-Sent Events) was the original remote transport but is NOW DEPRECATED — migrate to HTTP for new remote setups. All three work interchangeably from the same Claude Code session.' },
    { id: 'd2s4', title: 'MCP Server Configuration & Scoping', body: 'Project-level: .mcp.json at repo root — shared via version control, team-wide. User-level: ~/.claude.json — personal, cross-project, not shared. Use ${ENV_VAR} expansion in .mcp.json (e.g., ${GITHUB_TOKEN}) for credential management — tokens never in git. Claude Code prompts for approval before first use of project-scoped servers from .mcp.json (security). All configured MCP tools are discovered at connection time and available simultaneously. Prefer community MCP servers over custom ones for standard integrations (Jira, GitHub, Slack); reserve custom servers for team-specific workflows.' },
    { id: 'd2s5', title: 'Structured Error Responses (isError flag)', body: 'MCP tool errors use isError: true with structured metadata. Include: errorCategory ("transient" / "validation" / "business" / "permission"), isRetryable (boolean), human-readable message, attempted_query, partial_results. Transient (timeout, 503) → retryable: true, local recovery in subagent. Validation (bad input) → retryable: false, fix input. Business (policy violation) → retryable: false, explain to user. Permission → retryable: false, escalate. Generic errors like "Operation failed" prevent intelligent recovery — the agent can\'t decide retry vs skip vs alternative. Distinguish ACCESS FAILURE (timeout — needs retry decision) from VALID EMPTY RESULT ("0 matches" — legitimate answer).' },
    { id: 'd2s6', title: 'Tool Distribution & Reasoning Overload', body: 'Giving an agent too many tools (18 vs 4–5) degrades selection reliability by increasing decision complexity. Agents with tools outside their specialization tend to misuse them (a synthesis agent with web_search will run ad-hoc queries that should go through the search agent). Scoped tool access: give each agent ONLY the tools for its role, plus limited cross-role tools for high-frequency needs (e.g., a verify_fact tool for the synthesis agent, with complex verifications still going through the coordinator). Replace generic tools with constrained alternatives — fetch_url → load_document (validates URL type), blocking undesired search behavior at the interface.' },
    { id: 'd2s7', title: 'tool_choice Parameter', body: 'Three configurations. "auto" — model decides whether to call a tool or return text. Default for most cases. "any" — model MUST call SOME tool but can choose which. Use when you want guaranteed structured output and multiple extraction schemas exist (unknown document type). {"type": "tool", "name": "extract_metadata"} — model MUST call a specific named tool. Use to force execution order (e.g., always run extract_metadata before enrichment in subsequent turns).' },
    { id: 'd2s8', title: 'Built-in Tools (Read/Write/Edit/Bash/Grep/Glob)', body: 'Grep — search within file contents (function names, error messages, imports). Glob — match file paths by pattern (**/*.test.tsx, src/**/*.ts). Read — load full file content. Write — create new file. Edit — precise in-place edits via unique text match. Bash — run shell commands. Pattern for incremental investigation: Glob to find files → Grep to narrow → Read to understand → Edit to change. Do NOT read all files upfront. When Edit fails due to non-unique text match, fall back to Read + Write. Trace function usage across wrappers: identify all exported names, then Grep each name across the codebase.' },
  ],
  d3: [
    { id: 'd3s1', title: 'CLAUDE.md Configuration Hierarchy', body: 'Three levels. USER-LEVEL: ~/.claude/CLAUDE.md applies only to that user, NOT shared via version control — for personal preferences. PROJECT-LEVEL: .claude/CLAUDE.md (preferred) or root CLAUDE.md — version-controlled, applies to all team members, for coding standards, testing conventions, architectural decisions. DIRECTORY-LEVEL: CLAUDE.md in subdirectories — applies when working with files in that directory, for part-of-codebase conventions. Common exam trap: a new team member doesn\'t receive project context because conventions were stored in ~/.claude/CLAUDE.md instead of .claude/CLAUDE.md committed to git. Use /memory command to verify which files are loaded and diagnose inconsistent cross-session behavior.' },
    { id: 'd3s2', title: '@import Syntax for Modular CLAUDE.md', body: 'CLAUDE.md supports @path imports for modular composition: @./standards/coding-style.md pulls in another file. Rules: @ immediately before the path (no space); relative or absolute paths accepted; relative paths resolve relative to the IMPORTING file; maximum nesting depth is 5. Use @imports in a monorepo: each package\'s CLAUDE.md imports only the shared standards that apply (one imports api-conventions.md, another imports react-patterns.md). Keeps CLAUDE.md files focused without duplication.' },
    { id: 'd3s3', title: '.claude/rules/ with YAML paths Frontmatter', body: 'Alternative to monolithic CLAUDE.md: .claude/rules/ directory of topic-specific rule files. Each file has YAML frontmatter with glob patterns — paths: ["**/*.test.tsx"] — and loads ONLY when editing matching files. Saves tokens, reduces irrelevant context. Perfect for conventions that SPAN MULTIPLE DIRECTORIES (test files scattered throughout, all Terraform files, all migration scripts). Choose path-specific rules over directory-level CLAUDE.md when files live in many locations; choose directory CLAUDE.md when conventions cluster in one spot and are irrelevant elsewhere.' },
    { id: 'd3s4', title: 'Custom Slash Commands', body: 'Slash commands are reusable prompt templates invoked with /name. PROJECT commands: .claude/commands/ — committed to VCS, shared team-wide (running /review triggers the markdown content of .claude/commands/review.md as a prompt). PERSONAL commands: ~/.claude/commands/ — local only. $ARGUMENTS placeholder passes arguments. Use slash commands for workflows developers invoke explicitly.' },
    { id: 'd3s5', title: 'Agent Skills with SKILL.md Frontmatter', body: 'Skills are advanced auto-discovered capabilities. Each lives in .claude/skills/name/SKILL.md with YAML frontmatter. Key frontmatter: context: fork (runs skill in isolated sub-agent — verbose output does NOT pollute main session), allowed-tools (tool allowlist — restricts what the skill can use for security, e.g., only Read operations to prevent destructive actions), argument-hint (prompts developer for required parameters when invoked without args). Personal skill variants: ~/.claude/skills/ with different names so you don\'t affect teammates. SKILL vs SLASH COMMAND: skills are AUTO-DISCOVERED by Claude when relevant (Claude picks based on SKILL.md); slash commands are EXPLICITLY invoked by the user.' },
    { id: 'd3s6', title: 'Plan Mode vs Direct Execution', body: 'PLAN MODE: Claude explores the codebase (Read, Grep, Glob) and produces an implementation plan for you to approve — no side effects, safe exploration. Use for: large-scale changes affecting many files, multiple viable implementation approaches, architectural decisions, unfamiliar codebases, library migrations touching 45+ files, microservice restructuring. DIRECT EXECUTION: make changes immediately. Use for: single-file, well-scoped changes (adding one validation check, a fix with a clear stack trace). COMBINED: plan mode for investigation → user approves → direct execution for implementation. EXPLORE subagent isolates verbose discovery output from the main context, returning condensed summaries. Use it for multi-phase tasks to prevent context-window exhaustion.' },
    { id: 'd3s7', title: 'Iterative Refinement Techniques', body: 'Concrete input/output examples are the MOST effective way to communicate expected transformations when prose descriptions produce inconsistent results. Provide 2–3 I/O examples. TEST-DRIVEN ITERATION: write a test suite covering expected behavior, edge cases, and performance requirements FIRST, then iterate by sharing test failures. INTERVIEW PATTERN: have Claude ask questions to surface design considerations you may not have anticipated (cache invalidation strategies, failure modes, data volume expectations) — useful in unfamiliar domains (fintech, healthcare, legal). Multiple INTERACTING issues → fix in one detailed message (fixes affect each other). INDEPENDENT issues → fix sequentially.' },
    { id: 'd3s8', title: 'Claude Code Headless Mode for CI/CD', body: 'The -p (or --print) flag is the ONLY correct way to run Claude Code in a CI/CD pipeline. Non-interactive: processes prompt → outputs to stdout → exits. Three output formats. text (default, raw to stdout). json (structured: result, model, usage, cost_usd, duration_ms, num_turns, session_id, stop_reason — 85% of CI integrations use this). stream-json (NDJSON for real-time progress). --json-schema enforces a schema on the result content. --allowedTools "Read,Grep,Glob" restricts what Claude can use. --max-turns caps agent iterations. --bare skips OAuth and keychain reads (recommended for scripted/SDK calls; will become the default for -p). Pair with a Unix timeout for safety.' },
    { id: 'd3s9', title: 'CI/CD Best Practices & Session Isolation', body: 'Session context isolation: the same Claude session that generated code is LESS EFFECTIVE at reviewing its own changes — it retains reasoning context and is biased toward its own decisions. Use an INDEPENDENT instance for review. Include prior review findings in the prompt when re-running after new commits, with instruction to report only NEW or still-unresolved issues — prevents duplicate comments on every push. Include existing test files in context when generating new tests so suggestions avoid duplication. Document testing standards, available fixtures, and review criteria in CLAUDE.md — dramatically improves test generation quality and reduces low-value output.' },
    { id: 'd3s10', title: '/compact and /memory Commands', body: '/compact summarizes prior history to free the context window — used in long sessions when tool outputs have accumulated. RISK: exact numerics, dates, and specific values can be lost to vague summaries ("about $89" instead of "$89.99"). Extract critical facts to a persistent block BEFORE compacting. /memory opens CLAUDE.md for editing mid-session and verifies which memory files are currently loaded — useful for diagnosing why conventions aren\'t being applied. Prefer /compact over /clear when you want to keep state; compaction preserves prefix cache for the next turn.' },
  ],
  d4: [
    { id: 'd4s1', title: 'Explicit Criteria Over Vague Instructions', body: 'Vague instructions fail: "be conservative", "only flag high-confidence issues", "check that comments are accurate". The model cannot calibrate vague caution. EXPLICIT CRITERIA work: "Flag a comment ONLY if (1) it describes behavior that contradicts the code, (2) it references a nonexistent function, or (3) it\'s a TODO/FIXME already fixed in code. Do NOT flag stylistically outdated comments or minor wording issues." Define WHAT to flag (and NOT flag), not HOW CAREFUL to be. High false-positive rates in some categories undermine developer trust across ALL categories — temporarily disable the worst-offender categories while improving their prompts. Define severity levels with CONCRETE CODE EXAMPLES per level (CRITICAL: runtime failure during payment processing; HIGH: SQL injection vector; MEDIUM: off-by-one error; LOW: duplication).' },
    { id: 'd4s2', title: 'Few-Shot Prompting: The Most Effective Technique', body: 'Few-shot examples are the MOST EFFECTIVE technique for achieving consistent, actionable output when detailed instructions alone produce inconsistency. 2–4 targeted examples is the sweet spot — diminishing returns past 4, plus token cost. Types: (1) examples for ambiguous scenarios WITH RATIONALE showing why one action was chosen over alternatives; (2) output format examples (location, issue, severity, suggested fix); (3) acceptable-vs-problematic pairs to reduce false positives while preserving generalization; (4) extraction from varied document structures (inline citations vs bibliographies, narrative vs table); (5) informal measurements ("two handfuls" → "~100g"). Few-shot enables the model to GENERALIZE to novel patterns — not just match pre-specified cases. Place examples where they most affect judgment (system prompt for persistent behavior, user message for one-off).' },
    { id: 'd4s3', title: 'tool_use for Guaranteed Structured Output', body: 'tool_use with JSON Schemas is the MOST RELIABLE approach for guaranteed schema-compliant output — eliminates JSON syntax errors (no missing braces, wrong types). Define extraction tools with input_schema (the tool\'s input IS your output schema). Pattern: define the tool, force it with tool_choice, parse the tool_use block from the response. tool_use does NOT prevent SEMANTIC errors: line items not summing to total, values in wrong fields, fabricated content. Use Pydantic validators or custom validation logic for semantic checks.' },
    { id: 'd4s4', title: 'Schema Design: Required, Nullable, Enum Patterns', body: 'REQUIRED vs OPTIONAL: mark a field required only when info is ALWAYS present. Required on possibly-missing data pushes the model to fabricate values. NULLABLE: use "type": ["string", "null"] for fields that may be absent — the model returns null honestly instead of hallucinating. ENUM ESCAPE HATCHES: include "other" (plus a detail string field) for values outside predefined categories, and "unclear" for cases where the model genuinely can\'t decide. Honest "unclear" beats a confident wrong category. FORMAT NORMALIZATION RULES go in the PROMPT alongside the schema: "Dates: ISO 8601 YYYY-MM-DD; \'yesterday\' → compute absolute date. Currency: numeric + currency code; \'five bucks\' → {amount:5, currency:\'USD\'}. Percentages: decimal; \'half\' → 0.5."' },
    { id: 'd4s5', title: 'Validation-Retry Loops with Error Feedback', body: 'When extracted data fails validation: send a follow-up request including (1) the ORIGINAL document, (2) the PREVIOUS (incorrect) extraction, (3) the SPECIFIC validation error ("Field total=150 but sum(line_items)=145. Re-check"). Cap retries at 2–3. RETRIES HELP for: format mismatches (date in wrong format), structural errors (value in wrong field), arithmetic inconsistencies the model can self-check. RETRIES DO NOT HELP when the required info is simply ABSENT from the source document (vs external). Recognize this class — return null or escalate. Add a detected_pattern field in findings to enable analysis of which patterns trigger false positives when devs dismiss.' },
    { id: 'd4s6', title: 'Self-Correction Patterns', body: 'Extract both calculated and stated values to detect internal contradictions. Example: { stated_total: "$150.00", calculated_total: "$145.00", conflict_detected: true, line_items: [...] }. Downstream code handles the discrepancy explicitly. For multi-source synthesis with potentially conflicting data: preserve BOTH values with attribution, annotate conflict_detected, include methodology and date fields. Do NOT arbitrarily pick — let the coordinator reconcile.' },
    { id: 'd4s7', title: 'Message Batches API', body: 'Message Batches API: 50% cost savings vs synchronous API, up to 24-hour processing window, NO guaranteed latency SLA. Multi-turn tool calling is NOT SUPPORTED — batches are fire-and-forget, one request → one response. custom_id field correlates request/response pairs (required for any real use). USE BATCHES FOR: overnight tech-debt reports, weekly security audits, nightly test generation, bulk document extraction (10K+ docs), non-blocking workloads. DO NOT USE FOR: pre-merge PR checks (blocking), interactive reviews, live customer interactions, iterative tool-calling workflows. SLA planning: for a 30-hour guarantee with 24-hour processing, submit by the 6-hour mark. FAILURE HANDLING: identify failures by custom_id, re-submit only failed items with modifications (e.g., chunking oversized documents). Refine prompts on a sample before running bulk batches.' },
    { id: 'd4s8', title: 'Multi-Pass Review Architecture', body: 'Self-review limitation: a model retains its reasoning context from generation, making it LESS LIKELY to question its own decisions in the same session — confirmation bias. Fix: run review in a SECOND INDEPENDENT Claude instance without the generator\'s history. This "fresh eyes" approach mirrors human peer review. For 10+ file PRs: Pass 1 — per-file local analysis (consistent depth per file). Pass 2 — cross-file integration pass (dataflow, type consistency, circular dependencies). Why single-pass over 14 files fails: ATTENTION DILUTION — detailed analysis on some files, shallow on others, contradictory patterns flagged-here-but-approved-there. Larger context windows do NOT fix attention quality. Verification passes where the model self-reports confidence alongside each finding enables calibrated routing.' },
    { id: 'd4s9', title: 'Prompt Caching (Concept Only — Out of Scope)', body: 'The exam guide explicitly lists "prompt caching implementation details (beyond knowing it exists)" as OUT OF SCOPE. Know the concept: prompt caching lets you mark portions of the prompt (via cache_control) so reused prefixes cost less on subsequent requests — used to reduce costs for long system prompts or large contexts reused across many calls. You do not need to memorize TTL specifics, minimum token thresholds, cache_creation_input_tokens response fields, or breakpoint placement rules. If a question frames caching as a cost mechanism and asks about concept-level decisions, use common sense; the exam will not require implementation math.' },
  ],
  d5: [
    { id: 'd5s1', title: 'Long-Context Management', body: 'Three core risks. (1) PROGRESSIVE SUMMARIZATION degrades precise values: numeric amounts, percentages, dates, customer-stated expectations become vague ("about", "roughly", "a few"). (2) LOST-IN-THE-MIDDLE: models reliably process the start and end of long inputs but may MISS findings from middle sections. (3) TOOL RESULT ACCUMULATION: a lookup_order returning 40+ fields when only 5 are relevant wastes context tokens disproportionately. Mitigations: extract transactional facts (order IDs, amounts, dates, statuses) into a persistent "case facts" BLOCK included in every prompt, OUTSIDE the summarized history. Trim verbose tool outputs to only relevant fields (PostToolUse hook). Place key findings SUMMARIES at the BEGINNING of aggregated inputs with explicit section headers to mitigate position effects. Always pass complete conversation history in subsequent API requests.' },
    { id: 'd5s2', title: 'Escalation Triggers — Appropriate vs Unreliable', body: 'APPROPRIATE escalation triggers: (1) Customer EXPLICITLY requests a human ("get me a manager") → escalate IMMEDIATELY, do not attempt investigation first. (2) Policy is AMBIGUOUS or SILENT on the specific request (competitor price-matching when policy only addresses own-site adjustments) → escalate. (3) Agent cannot make meaningful progress after reasonable attempts. (4) Financial operation above threshold (ENFORCE via hook, not prompt). (5) Multiple customer matches → ask for additional identifiers, DO NOT guess by heuristic. UNRELIABLE triggers that FAIL: sentiment analysis (frustration ≠ case complexity), self-reported confidence scores (the model is confidently wrong on hard cases — poor calibration), auto-classifiers (over-engineering; requires labeled data you may not have). For frustration without explicit escalation request: acknowledge → propose concrete resolution → escalate only if customer REITERATES.' },
    { id: 'd5s3', title: 'Error Propagation in Multi-Agent Systems', body: 'Return structured error context to the coordinator — not generic failure statuses — so it can make intelligent recovery decisions. Include: failure_type, what was attempted (attempted_query), partial results (if any), potential alternative approaches, coverage_impact. ANTI-PATTERNS: (1) Generic "search unavailable" hides context. (2) Silent suppression — returning empty results as success — prevents any recovery and risks incomplete outputs. (3) Terminating the entire workflow on a single subagent failure. (4) Infinite retries inside a subagent. PATTERN: local recovery inside subagents for TRANSIENT failures; propagate only errors the subagent CANNOT resolve, with partial results and what was attempted. Distinguish ACCESS FAILURES (timeouts — need retry decisions) from VALID EMPTY RESULTS (successful query with no matches). Structure synthesis output with COVERAGE ANNOTATIONS: "FULL COVERAGE" vs "PARTIAL COVERAGE — search timed out" so readers know what\'s well-supported vs. gap.' },
    { id: 'd5s4', title: 'Large Codebase Exploration', body: 'Context degradation in extended sessions: the model starts giving inconsistent answers and referencing "typical patterns" rather than the specific classes it discovered earlier. Mitigations: (1) SCRATCHPAD FILES (investigation-scratchpad.md, plan.md) record key findings — the agent reads them for subsequent questions to counteract degradation. (2) SUBAGENT DELEGATION isolates verbose exploration output — spawn subagents for specific questions ("find all test files", "trace refund flow dependencies") while the main agent preserves high-level coordination. Subagent reads 50 files and returns only a summary; main coordinator never sees raw contents. (3) Summarize key findings from one exploration phase BEFORE spawning subagents for the next phase; inject summaries into initial context. (4) STRUCTURED STATE PERSISTENCE for crash recovery: each agent exports state to a manifest file (agent-state/web-search.json with status, queries_executed, key_findings, coverage, gaps). Coordinator loads the manifest on resume. (5) /compact reduces context usage mid-exploration.' },
    { id: 'd5s5', title: 'Human Review & Confidence Calibration', body: 'Aggregate metrics hide failure modes. 97% overall accuracy can mask 40% error rates on specific document types or fields. STRATIFIED RANDOM SAMPLING: audit high-confidence extractions per-document-type AND per-field to measure ongoing error rates and detect novel patterns. Validate accuracy by document type AND field segment BEFORE reducing human review. Have models output FIELD-LEVEL confidence scores. Calibrate review thresholds EMPIRICALLY using labeled validation sets — not by guessing. Route low-confidence or ambiguous-source extractions to human review. Recalibrate when prompt or model changes.' },
    { id: 'd5s6', title: 'Information Provenance & Multi-Source Synthesis', body: 'Attribution is often LOST during summarization when findings are compressed without preserving claim-source mappings. Require subagents to output STRUCTURED claim-source mappings: source URL, document name, relevant excerpt/quote, publication or data collection date. Downstream synthesis MUST preserve these through aggregation. For CONFLICTING statistics from credible sources: annotate both values with source attribution and methodology — NEVER arbitrarily select one. Include publication DATES so temporal differences aren\'t misread as contradictions ("Source A 10% in 2023, Source B 15% in 2024" = trend, not conflict). Structure reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context. Render content APPROPRIATELY: financial data as tables, news as prose, technical findings as structured lists, time series chronologically — don\'t force everything into a uniform format.' },
  ],
  proj: [
    { id: 'ps1', title: 'What Projects Are', body: 'Self-contained workspaces with their own memory, chat histories, knowledge bases, and custom instructions. Use for ongoing work with reused reference materials, consistent requirements across chats, or team collaboration. Not for one-off questions. Each project chat automatically accesses its knowledge base and follows its instructions.' },
    { id: 'ps2', title: 'Project Instructions', body: 'Instructions guide Claude across every chat in a project. Good ones include: context (what the work is), process (steps), tone/style, specific requirements. Instructions can automate workflows ("when I upload a transcript, summarize using this template"). Work alongside user preferences and custom styles.' },
    { id: 'ps3', title: 'Knowledge Base & RAG', body: 'Upload PDFs, DOCX, CSVs, TXT, HTML. Descriptive filenames help retrieval. When knowledge approaches context limits, Projects automatically switch to RAG mode: retrieves most-relevant chunks rather than loading everything. Capacity expands up to 10x. Visual indicator shows when RAG is active.' },
    { id: 'ps4', title: 'Permission Levels', body: 'Can view (read + chat, no edits). Can edit (modify instructions, knowledge, members). Owner (controls sharing and visibility). Share by email or make visible to the whole organization.' },
    { id: 'ps5', title: 'Best Practices', body: 'Start focused, expand later. Keep knowledge current. Write specific, example-driven instructions. Name files descriptively. Reference docs by name in chats ("based on our Q3 report...") to focus retrieval.' },
  ],
};

// ============================================================
// FLASHCARDS
// ============================================================
const FLASHCARDS = {
  d1: [
    { q: 'Four stop_reason values?', a: 'end_turn (final), tool_use (execute and continue), max_tokens (truncated), stop_sequence (hit stop string). Only end_turn and tool_use drive agentic loops.' },
    { q: 'Only reliable loop termination signal?', a: 'stop_reason == "end_turn". Never parse text. Max iterations is a safety net, not a primary terminator.' },
    { q: 'Why route all multi-agent communication through the coordinator?', a: 'Observability, uniform error handling, controlled information flow. No agent-to-agent spaghetti.' },
    { q: 'Do subagents inherit coordinator history?', a: 'No. Fully isolated context. Required info must be explicitly passed in the subagent prompt.' },
    { q: 'Can subagents spawn their own subagents?', a: 'No. Subagents cannot spawn subagents in the Agent SDK.' },
    { q: 'Which tool name spawns subagents and what config is required?', a: '"Task" (newer SDKs emit "Agent"). The coordinator\'s allowedTools MUST include it or delegation fails.' },
    { q: 'How do you run subagents in parallel?', a: 'Emit multiple Task calls in a SINGLE coordinator response. The SDK runs them concurrently. Partition work to avoid overlap.' },
    { q: 'AgentDefinition required fields?', a: 'description (selection signal), prompt (system prompt), tools (least privilege), model ("sonnet"/"opus"/"haiku"/"inherit"), mcpServers, skills, maxTurns.' },
    { q: 'Four enforcement-relevant hook events?', a: 'PreToolUse (deny/allow before exec), PostToolUse (modify after exec, cannot undo), PostToolUseFailure, PermissionRequest.' },
    { q: 'Hook vs prompt — deterministic vs probabilistic?', a: 'Hooks = 100% deterministic. Prompts = probabilistic (>90%, never 100%). Use hooks for financial/legal/safety rules.' },
    { q: 'Can a PreToolUse hook block even in bypassPermissions mode?', a: 'Yes. PreToolUse fires BEFORE permission checks. permissionDecision:"deny" blocks regardless of permission mode.' },
    { q: 'Can PostToolUse hooks undo actions?', a: 'No. The tool has already executed. Use PreToolUse for enforcement.' },
    { q: 'When to use fork_session?', a: 'Exploring divergent approaches from a shared analysis baseline (e.g., compare Redux vs Context API refactor from same codebase exploration).' },
    { q: 'When is a fresh session better than --resume?', a: 'When prior tool results are stale (files changed), context has degraded, or you can provide a compact summary instead.' },
    { q: 'Prompt chaining vs dynamic decomposition?', a: 'Chaining = fixed sequential steps, predictable (code reviews). Dynamic = subtasks generated from intermediate findings, open-ended (legacy codebase investigation).' },
    { q: 'Most common task-decomposition bug?', a: 'Over-narrow decomposition. Coordinator misses entire subtopics (e.g., "creative industries" → only visual arts, missing music/literature/film).' },
    { q: 'Structured handoff to a human must include?', a: 'Customer ID, issue summary, root cause, order IDs, actions_taken, amounts, recommended_action, escalation_reason. Human has NO access to transcript.' },
  ],
  d2: [
    { q: 'Three MCP primitives?', a: 'Tools (executable), Resources (data to read — content catalogs), Prompts (reusable templates invoked as /mcp__server__name).' },
    { q: 'Three MCP transports — which is deprecated?', a: 'stdio (local), HTTP (recommended remote), SSE (DEPRECATED — migrate to HTTP). stdio servers must not log to stdout.' },
    { q: 'Project-shared MCP config location?', a: '.mcp.json at repo root, committed to git. Use ${ENV_VAR} for secrets. Claude Code prompts for approval on first use.' },
    { q: 'Personal MCP config location?', a: '~/.claude.json — user-level, cross-project, not shared.' },
    { q: 'Primary mechanism for tool selection?', a: 'Tool descriptions. Not the name, not the system prompt. Minimal descriptions cause misrouting among similar tools.' },
    { q: 'What should a good tool description include?', a: 'What it does/returns, input formats with examples, edge cases, explicit boundaries vs similar tools. Write for the MODEL.' },
    { q: 'What is reasoning overload?', a: 'Too many tools per agent (18 vs 4-5) degrades selection reliability. Fix: distribute tools across specialized subagents.' },
    { q: 'Structured MCP error response fields?', a: 'isError:true with errorCategory (transient/validation/business/permission), isRetryable boolean, message, attempted_query, partial_results.' },
    { q: 'Access failure vs valid empty result?', a: 'Access failure (timeout) → retry decision. Empty result ("0 matches") → legitimate answer. Don\'t conflate.' },
    { q: 'Three tool_choice modes?', a: '"auto" (model decides or returns text), "any" (must call some tool), {"type":"tool","name":"x"} (must call tool x).' },
    { q: 'When to use tool_choice:"any"?', a: 'Guaranteed structured output when multiple extraction schemas exist and document type is unknown.' },
    { q: 'When to use tool_choice:forced?', a: 'Ensure a specific tool runs first (e.g., extract_metadata before enrichment in subsequent turns).' },
    { q: 'Built-in tool to find files by name pattern?', a: 'Glob. Grep searches file CONTENTS.' },
    { q: 'Fallback when Edit fails due to non-unique text match?', a: 'Read the full file, modify programmatically, Write the updated version.' },
    { q: 'MCP Resources vs Tools — when to use Resource?', a: 'Resource for READING data (catalogs, schemas, docs). Tool for ACTIONS. Resources reduce exploratory tool calls.' },
  ],
  d3: [
    { q: 'Three CLAUDE.md hierarchy levels?', a: 'User (~/.claude/CLAUDE.md, personal), Project (.claude/CLAUDE.md, shared via VCS), Directory (CLAUDE.md in subdirs, scoped).' },
    { q: 'New hire missing project context — likely cause?', a: 'Conventions stored in ~/.claude/CLAUDE.md (user-level, not shared) instead of .claude/CLAUDE.md (project, committed to git).' },
    { q: '@import syntax rules?', a: '@ immediately before path (no space). Relative or absolute. Relative resolves to the IMPORTING file. Max nesting depth 5.' },
    { q: 'Purpose of .claude/rules/ with paths frontmatter?', a: 'Each rule loads ONLY when editing files matching its glob pattern. Saves tokens. Perfect for conventions spanning directories.' },
    { q: 'Path-specific rules vs directory CLAUDE.md — when each?', a: 'Path-rules for conventions spanning many directories (tests). Directory CLAUDE.md for conventions tied to one location.' },
    { q: 'Where do team-shared slash commands live?', a: '.claude/commands/ in the project, committed to VCS. Personal commands in ~/.claude/commands/.' },
    { q: 'Skill vs slash command?', a: 'Skills auto-discovered by Claude (SKILL.md YAML frontmatter decides applicability). Slash commands explicitly invoked by user.' },
    { q: 'Three key SKILL.md frontmatter fields?', a: 'context: fork (isolated subagent), allowed-tools (security allowlist), argument-hint (prompts for args if missing).' },
    { q: 'When to use plan mode?', a: 'Large-scale changes, multiple valid approaches, architectural decisions (microservice restructuring, library migrations touching 45+ files).' },
    { q: 'When to use direct execution?', a: 'Single-file well-scoped changes, clear stack trace, adding one validation check.' },
    { q: 'What is the Explore subagent for?', a: 'Isolating verbose discovery output from the main context; returns only summaries. Prevents context exhaustion in multi-phase tasks.' },
    { q: 'Correct non-interactive CI flag?', a: '-p (or --print). Processes prompt, outputs to stdout, exits.' },
    { q: 'Three --output-format values?', a: 'text (default), json (structured: result, model, usage, cost_usd, session_id), stream-json (NDJSON for real-time).' },
    { q: 'Flags to enforce schema-compliant output in CI?', a: '--output-format json --json-schema <schema>. Pair with --allowedTools and --max-turns for safety.' },
    { q: 'Risk of using the same session to review its own code?', a: 'Session retains generation reasoning, biased toward its own decisions. Use an INDEPENDENT session for review.' },
    { q: '/compact risk?', a: 'Exact numerics, dates, specifics can be lost to vague summaries. Extract critical facts to a persistent block first.' },
    { q: 'Purpose of /memory command?', a: 'Verify which memory files are loaded and diagnose inconsistent behavior across sessions.' },
  ],
  d4: [
    { q: 'Why do "be conservative" and "be careful" fail?', a: 'The model cannot calibrate vague caution. Define WHAT to flag (explicit criteria), not HOW CAREFUL to be.' },
    { q: 'Ideal few-shot example count?', a: '2–4 covering edge cases and ambiguous scenarios. Diminishing returns past 4, plus token cost.' },
    { q: 'Strongest mechanism for guaranteed JSON output?', a: 'tool_use with JSON Schema. Prompt-level "respond in JSON" can fail on syntax.' },
    { q: 'Does tool_use prevent semantic errors?', a: 'No — only syntactic validity. Totals can still not reconcile, values can be in wrong fields. Use validators.' },
    { q: 'When is a schema field required?', a: 'Only when info is ALWAYS present. Required on missing data pushes the model to fabricate.' },
    { q: 'Handle possibly-missing fields?', a: '"type": ["string", "null"]. Model returns null instead of hallucinating.' },
    { q: 'Why add "other" or "unclear" to an enum?', a: 'Escape hatches for values outside predefined categories. Honest "unclear" beats a confident wrong category.' },
    { q: 'When retry-with-error WILL help?', a: 'Format errors (wrong date format), structural errors (value in wrong field), arithmetic inconsistencies.' },
    { q: 'When retry WILL NOT help?', a: 'Info absent from source. Return null or escalate; don\'t waste tokens retrying.' },
    { q: 'Retry cap?', a: '2–3 attempts. Unlimited retries waste tokens.' },
    { q: 'Message Batches API savings and window?', a: '50% discount, up to 24-hour window, no latency SLA.' },
    { q: 'What is NOT supported in Batches?', a: 'Multi-turn tool calling in a single request. Batches are fire-and-forget.' },
    { q: 'Blocking PR check — sync or batch?', a: 'Synchronous. Batches with 24-hour window are unacceptable for blocking workflows.' },
    { q: 'custom_id purpose?', a: 'Correlate batch request/response pairs. Required to identify and re-submit failed items.' },
    { q: 'Why independent session for review?', a: 'Generator-session retains reasoning, biased toward its own decisions. Fresh session = unbiased critique.' },
    { q: 'Why single-pass review of 14 files is flawed?', a: 'Attention dilution — inconsistent depth, contradictory findings, missed obvious bugs. Split: per-file + cross-file integration pass.' },
    { q: 'Is prompt caching implementation on the exam?', a: 'Knowing it EXISTS is in scope. Implementation details (TTLs, breakpoints, token minimums) are EXPLICITLY OUT OF SCOPE.' },
  ],
  d5: [
    { q: 'Lost-in-the-middle effect?', a: 'Models reliably process start and end of long inputs but may miss middle findings. Place key info at those positions with explicit headings.' },
    { q: 'What degrades during progressive summarization?', a: 'Numeric values, percentages, dates become vague ("about", "roughly"). Extract critical facts to a persistent block before summarization.' },
    { q: 'How do you trim verbose tool output?', a: 'PostToolUse hook — keep only relevant fields. If lookup_order returns 40 fields and 5 matter, drop 35.' },
    { q: 'Purpose of scratchpad files?', a: 'Persist key findings across context boundaries. Agent reads and updates. Reclaims tokens, survives session boundaries.' },
    { q: 'Appropriate escalation triggers?', a: 'Explicit "get me a manager", policy gap, inability to progress, financial above threshold (via hook), multiple ambiguous customer matches (ask for ID).' },
    { q: 'Unreliable escalation signals?', a: 'Sentiment analysis (mood ≠ complexity), self-reported confidence (confidently wrong), auto-classifier (overengineered).' },
    { q: 'Why is 97% aggregate accuracy potentially misleading?', a: 'Hides 40% errors on specific doc types or fields. Use stratified random sampling per type and field.' },
    { q: 'How to set confidence thresholds?', a: 'Empirically from labeled validation data. Recalibrate on any prompt or model change.' },
    { q: 'Structured subagent error includes?', a: 'failure_type, attempted_query, partial_results, alternative_approaches, coverage_impact. Never generic "unavailable".' },
    { q: 'Why distinguish access failure from valid empty result?', a: 'Access failure → retry decision. Empty result → valid answer. Coordinator recovery differs.' },
    { q: 'Handle two conflicting sources?', a: 'Preserve both with full attribution (source, date, methodology). Annotate conflict_detected. Coordinator reconciles — not the analysis agent.' },
    { q: 'Why include dates in source citations?', a: 'Temporal differences aren\'t contradictions. Source A 10% in 2023, B 15% in 2024 = trend.' },
    { q: 'Four context-management strategies?', a: 'Subagent delegation, scratchpad files, /compact, structured state persistence (manifests for crash recovery).' },
  ],
  proj: [
    { q: 'When create Project vs ad-hoc chat?', a: 'Ongoing work with reused materials, consistent requirements, team collaboration. Not for one-off questions.' },
    { q: 'What triggers RAG mode?', a: 'Knowledge approaching context limit. Automatic. Capacity expands up to 10x.' },
    { q: 'Three permission levels?', a: 'Can view, Can edit, Owner.' },
    { q: 'Why descriptive filenames matter?', a: 'Claude uses filenames to route retrieval. Q4-2025-Sales-Report.pdf beats document1.pdf.' },
  ],
};

// ============================================================
// QUIZ — 12 OFFICIAL questions from exam guide (verbatim) +
// 60+ additional scenario questions derived from the same guide
// ============================================================
const QUIZ = [
  // ========== OFFICIAL SAMPLE QUESTIONS — VERBATIM FROM ANTHROPIC EXAM GUIDE ==========
  { official: true, d: 'd1', sc: 'Customer Support', q: 'Production data shows that in 12% of cases, your agent skips get_customer entirely and calls lookup_order using only the customer\'s stated name, occasionally leading to misidentified accounts and incorrect refunds. What change would most effectively address this reliability issue?', opts: ['Add a programmatic prerequisite that blocks lookup_order and process_refund calls until get_customer has returned a verified customer ID.', 'Enhance the system prompt to state that customer verification via get_customer is mandatory before any order operations.', 'Add few-shot examples showing the agent always calling get_customer first, even when customers volunteer order details.', 'Implement a routing classifier that analyzes each request and enables only the subset of tools appropriate for that request type.'], correct: 0, exp: 'When a specific tool sequence is required for critical business logic (like verifying customer identity before processing refunds), programmatic enforcement provides deterministic guarantees that prompt-based approaches cannot. Options B and C rely on probabilistic LLM compliance, which is insufficient when errors have financial consequences. Option D addresses tool availability rather than tool ordering, which is not the actual problem.' },
  { official: true, d: 'd2', sc: 'Customer Support', q: 'Production logs show the agent frequently calls get_customer when users ask about orders (e.g., "check my order #12345"), instead of calling lookup_order. Both tools have minimal descriptions ("Retrieves customer information" / "Retrieves order details") and accept similar identifier formats. What\'s the most effective first step to improve tool selection reliability?', opts: ['Add few-shot examples to the system prompt demonstrating correct tool selection patterns, with 5-8 examples showing order-related queries routing to lookup_order.', 'Expand each tool\'s description to include input formats it handles, example queries, edge cases, and boundaries explaining when to use it versus similar tools.', 'Implement a routing layer that parses user input before each turn and pre-selects the appropriate tool based on detected keywords and identifier patterns.', 'Consolidate both tools into a single lookup_entity tool that accepts any identifier and internally determines which backend to query.'], correct: 1, exp: 'Tool descriptions are the primary mechanism LLMs use for tool selection. When descriptions are minimal, models lack the context to differentiate between similar tools. Option B directly addresses this root cause with a low-effort, high-leverage fix. Few-shot examples (A) add token overhead without fixing the underlying issue. A routing layer (C) is over-engineered and bypasses the LLM\'s natural language understanding. Consolidating tools (D) is a valid architectural choice but requires more effort than a "first step" warrants when the immediate problem is inadequate descriptions.' },
  { official: true, d: 'd5', sc: 'Customer Support', q: 'Your agent achieves 55% first-contact resolution, well below the 80% target. Logs show it escalates straightforward cases (standard damage replacements with photo evidence) while attempting to autonomously handle complex situations requiring policy exceptions. What\'s the most effective way to improve escalation calibration?', opts: ['Add explicit escalation criteria to your system prompt with few-shot examples demonstrating when to escalate versus resolve autonomously.', 'Have the agent self-report a confidence score (1-10) before each response and automatically route requests to humans when confidence falls below a threshold.', 'Deploy a separate classifier model trained on historical tickets to predict which requests need escalation before the main agent begins processing.', 'Implement sentiment analysis to detect customer frustration levels and automatically escalate when negative sentiment exceeds a threshold.'], correct: 0, exp: 'Adding explicit escalation criteria with few-shot examples directly addresses the root cause: unclear decision boundaries. This is the proportionate first response before adding infrastructure. Option B fails because LLM self-reported confidence is poorly calibrated — the agent is already incorrectly confident on hard cases. Option C is over-engineered, requiring labeled data and ML infrastructure when prompt optimization hasn\'t been tried. Option D solves a different problem entirely; sentiment doesn\'t correlate with case complexity, which is the actual issue.' },
  { official: true, d: 'd3', sc: 'Code Gen', q: 'You want to create a custom /review slash command that runs your team\'s standard code review checklist. This command should be available to every developer when they clone or pull the repository. Where should you create this command file?', opts: ['In the .claude/commands/ directory in the project repository', 'In ~/.claude/commands/ in each developer\'s home directory', 'In the CLAUDE.md file at the project root', 'In a .claude/config.json file with a commands array'], correct: 0, exp: 'Project-scoped custom slash commands should be stored in the .claude/commands/ directory within the repository. These commands are version-controlled and automatically available to all developers when they clone or pull the repo. Option B is for personal commands. Option C (CLAUDE.md) is for project instructions and context, not command definitions. Option D describes a configuration mechanism that doesn\'t exist in Claude Code.' },
  { official: true, d: 'd3', sc: 'Code Gen', q: 'You\'ve been assigned to restructure the team\'s monolithic application into microservices. This will involve changes across dozens of files and requires decisions about service boundaries and module dependencies. Which approach should you take?', opts: ['Enter plan mode to explore the codebase, understand dependencies, and design an implementation approach before making changes.', 'Start with direct execution and make changes incrementally, letting the implementation reveal the natural service boundaries.', 'Use direct execution with comprehensive upfront instructions detailing exactly how each service should be structured.', 'Begin in direct execution mode and only switch to plan mode if you encounter unexpected complexity during implementation.'], correct: 0, exp: 'Plan mode is designed for complex tasks involving large-scale changes, multiple valid approaches, and architectural decisions — exactly what monolith-to-microservices restructuring requires. It enables safe codebase exploration and design before committing to changes. Option B risks costly rework when dependencies are discovered late. Option C assumes you already know the right structure. Option D ignores that the complexity is already stated in the requirements.' },
  { official: true, d: 'd3', sc: 'Code Gen', q: 'Your codebase has distinct areas with different coding conventions: React components use functional style with hooks, API handlers use async/await with specific error handling, and database models follow a repository pattern. Test files are spread throughout the codebase alongside the code they test, and you want all tests to follow the same conventions regardless of location. What\'s the most maintainable way to ensure Claude automatically applies the correct conventions when generating code?', opts: ['Create rule files in .claude/rules/ with YAML frontmatter specifying glob patterns to conditionally apply conventions based on file paths', 'Consolidate all conventions in the root CLAUDE.md file under headers for each area, relying on Claude to infer which section applies', 'Create skills in .claude/skills/ for each code type that include the relevant conventions in their SKILL.md files', 'Place a separate CLAUDE.md file in each subdirectory containing that area\'s specific conventions'], correct: 0, exp: 'Option A is correct because .claude/rules/ with glob patterns (e.g., **/*.test.tsx) allows conventions to be automatically applied based on file paths regardless of directory location — essential for test files spread throughout the codebase. Option B relies on inference rather than explicit matching. Option C requires manual skill invocation. Option D can\'t easily handle files spread across many directories since CLAUDE.md files are directory-bound.' },
  { official: true, d: 'd1', sc: 'Multi-Agent Research', q: 'After running the system on the topic "impact of AI on creative industries," you observe that each subagent completes successfully: the web search agent finds relevant articles, the document analysis agent summarizes papers correctly, and the synthesis agent produces coherent output. However, the final reports cover only visual arts, completely missing music, writing, and film production. When you examine the coordinator\'s logs, you see it decomposed the topic into three subtasks: "AI in digital art creation," "AI in graphic design," and "AI in photography." What is the most likely root cause?', opts: ['The synthesis agent lacks instructions for identifying coverage gaps in the findings it receives from other agents.', 'The coordinator agent\'s task decomposition is too narrow, resulting in subagent assignments that don\'t cover all relevant domains of the topic.', 'The web search agent\'s queries are not comprehensive enough and need to be expanded to cover more creative industry sectors.', 'The document analysis agent is filtering out sources related to non-visual creative industries due to overly restrictive relevance criteria.'], correct: 1, exp: 'The coordinator\'s logs reveal the root cause directly: it decomposed "creative industries" into only visual arts subtasks (digital art, graphic design, photography), completely omitting music, writing, and film. The subagents executed their assigned tasks correctly — the problem is what they were assigned. Options A, C, and D incorrectly blame downstream agents that are working correctly within their assigned scope.' },
  { official: true, d: 'd5', sc: 'Multi-Agent Research', q: 'The web search subagent times out while researching a complex topic. You need to design how this failure information flows back to the coordinator agent. Which error propagation approach best enables intelligent recovery?', opts: ['Return structured error context to the coordinator including the failure type, the attempted query, any partial results, and potential alternative approaches.', 'Implement automatic retry logic with exponential backoff within the subagent, returning a generic "search unavailable" status only after all retries are exhausted.', 'Catch the timeout within the subagent and return an empty result set marked as successful.', 'Propagate the timeout exception directly to a top-level handler that terminates the entire research workflow.'], correct: 0, exp: 'Structured error context gives the coordinator the information it needs to make intelligent recovery decisions — whether to retry with a modified query, try an alternative approach, or proceed with partial results. Option B\'s generic status hides valuable context. Option C suppresses the error by marking failure as success, which prevents any recovery. Option D terminates the entire workflow unnecessarily when recovery strategies could succeed.' },
  { official: true, d: 'd2', sc: 'Multi-Agent Research', q: 'During testing, you observe that the synthesis agent frequently needs to verify specific claims while combining findings. Currently, when verification is needed, the synthesis agent returns control to the coordinator, which invokes the web search agent, then re-invokes synthesis with results. This adds 2-3 round trips per task and increases latency by 40%. Your evaluation shows that 85% of these verifications are simple fact-checks (dates, names, statistics) while 15% require deeper investigation. What\'s the most effective approach to reduce overhead while maintaining system reliability?', opts: ['Give the synthesis agent a scoped verify_fact tool for simple lookups, while complex verifications continue delegating to the web search agent through the coordinator.', 'Have the synthesis agent accumulate all verification needs and return them as a batch to the coordinator at the end of its pass, which then sends them all to the web search agent at once.', 'Give the synthesis agent access to all web search tools so it can handle any verification need directly without round-trips through the coordinator.', 'Have the web search agent proactively cache extra context around each source during initial research, anticipating what the synthesis agent might need to verify.'], correct: 0, exp: 'Option A applies the principle of least privilege by giving the synthesis agent only what it needs for the 85% common case (simple fact verification) while preserving the existing coordination pattern for complex cases. Option B\'s batching approach creates blocking dependencies since synthesis steps may depend on earlier verified facts. Option C over-provisions the synthesis agent, violating separation of concerns. Option D relies on speculative caching that cannot reliably predict what will be needed.' },
  { official: true, d: 'd3', sc: 'Claude Code CI', q: 'Your pipeline script runs `claude "Analyze this pull request for security issues"` but the job hangs indefinitely. Logs indicate Claude Code is waiting for interactive input. What\'s the correct approach to run Claude Code in an automated pipeline?', opts: ['Add the -p flag: `claude -p "Analyze this pull request for security issues"`', 'Set the environment variable CLAUDE_HEADLESS=true before running the command', 'Redirect stdin from /dev/null: `claude "..." < /dev/null`', 'Add the --batch flag: `claude --batch "..."`'], correct: 0, exp: 'The -p (or --print) flag is the documented way to run Claude Code in non-interactive mode. It processes the prompt, outputs the result to stdout, and exits without waiting for user input — exactly what CI/CD pipelines require. The other options reference non-existent features or use Unix workarounds that don\'t properly address Claude Code\'s command syntax.' },
  { official: true, d: 'd4', sc: 'Claude Code CI', q: 'Your team wants to reduce API costs for automated analysis. Currently, real-time Claude calls power two workflows: (1) a blocking pre-merge check that must complete before developers can merge, and (2) a technical debt report generated overnight for review the next morning. Your manager proposes switching both to the Message Batches API for its 50% cost savings. How should you evaluate this proposal?', opts: ['Use batch processing for the technical debt reports only; keep real-time calls for pre-merge checks.', 'Switch both workflows to batch processing with status polling to check for completion.', 'Keep real-time calls for both workflows to avoid batch result ordering issues.', 'Switch both to batch processing with a timeout fallback to real-time if batches take too long.'], correct: 0, exp: 'The Message Batches API offers 50% cost savings but has processing times up to 24 hours with no guaranteed latency SLA. This makes it unsuitable for blocking pre-merge checks where developers wait for results, but ideal for overnight batch jobs like technical debt reports. Option B is wrong because "often faster" completion isn\'t acceptable for blocking workflows. Option C reflects a misconception — batch results can be correlated using custom_id fields. Option D adds unnecessary complexity.' },
  { official: true, d: 'd4', sc: 'Claude Code CI', q: 'A pull request modifies 14 files across the stock tracking module. Your single-pass review analyzing all files together produces inconsistent results: detailed feedback for some files but superficial comments for others, obvious bugs missed, and contradictory feedback — flagging a pattern as problematic in one file while approving identical code elsewhere in the same PR. How should you restructure the review?', opts: ['Split into focused passes: analyze each file individually for local issues, then run a separate integration-focused pass examining cross-file data flow.', 'Require developers to split large PRs into smaller submissions of 3-4 files before the automated review runs.', 'Switch to a higher-tier model with a larger context window to give all 14 files adequate attention in one pass.', 'Run three independent review passes on the full PR and only flag issues that appear in at least two of the three runs.'], correct: 0, exp: 'Splitting reviews into focused passes directly addresses the root cause: attention dilution when processing many files at once. File-by-file analysis ensures consistent depth, while a separate integration pass catches cross-file issues. Option B shifts burden to developers without improving the system. Option C misunderstands that larger context windows don\'t solve attention quality issues. Option D would actually suppress detection of real bugs by requiring consensus.' },

  // ========== DOMAIN 1 EXTENDED ==========
  { d: 'd1', q: 'A customer support agent built with the Agent SDK loops indefinitely. The team added: exit if assistant text contains "Task complete" OR if 15 iterations are reached. Both conditions now produce bad outcomes — premature exit on mid-thought "done" phrasing, or hitting 15 turns on legitimate complex cases. What is the correct termination condition?', opts: ['Parse assistant text for completion phrases; increase iteration cap to 30', 'Exit when stop_reason == "end_turn"; treat max_iterations as a safety net only', 'Exit on the first text-only response with no tool_use blocks', 'Require the model to output a special { "done": true } JSON field'], correct: 1, exp: 'The only reliable termination is stop_reason == "end_turn". Text parsing is fragile — the model may say "done" mid-chain-of-thought. Iteration caps are safety against runaway loops, not primary termination logic.' },
  { d: 'd1', q: 'A developer expects a PostToolUse hook to undo a destructive Bash command after observing the output. What limitation applies?', opts: ['PostToolUse hooks cannot undo actions — the tool has already executed. Use PreToolUse with permissionDecision:"deny" for prevention.', 'PostToolUse hooks can modify output but cannot block execution. For safety gates, PreToolUse is required.', 'Both statements are true; the correct mechanism is PreToolUse for prevention.', 'PostToolUse hooks only work on MCP tools, not built-in Bash.'], correct: 2, exp: 'Both explanations in A and B are accurate and worth knowing. PostToolUse fires after execution — it can modify output, inject context, or normalize formats but cannot prevent actions. PreToolUse is the right hook for blocking destructive commands.' },
  { d: 'd1', q: 'A coordinator needs subagents to delegate a test analysis task to a "test-runner" subagent. allowedTools = ["Read", "Grep", "Glob"]. Nothing happens — the coordinator attempts to do the analysis itself. Most likely cause?', opts: ['The subagent description is too vague for Claude to select', 'The coordinator\'s allowedTools does not include "Task", so it cannot spawn subagents', 'Subagents require bypassPermissions mode', 'The subagent model is set to "haiku" which doesn\'t support delegation'], correct: 1, exp: 'To delegate, the coordinator must have "Task" (or "Agent" in newer SDKs) in allowedTools. Without the Task tool, subagents are unreachable.' },
  { d: 'd1', q: 'You want to investigate two alternative refactoring approaches (Redux vs Context API) from the same starting point. Both should inherit the codebase exploration you\'ve done so far but then diverge. Which Agent SDK primitive fits?', opts: ['--resume to continue a shared session', 'fork_session to create independent branches from a shared baseline', 'Two separate new sessions with manual context paste', '/compact followed by two sequential investigations'], correct: 1, exp: 'fork_session creates independent branches from shared context. Both forks inherit up to the branch point then diverge. Perfect for A/B comparison.' },
  { d: 'd1', q: 'A coordinator needs summaries of 60 documents. Reading all 60 itself would consume ~150K tokens. Best approach to preserve the coordinator\'s context?', opts: ['Read them in batches of 10 and summarize each batch', 'Delegate to a subagent that reads all 60 and returns only the summary', 'Run /compact after every 10 files', 'Switch the coordinator to a larger context window model'], correct: 1, exp: 'Subagent delegation is context management as architecture. The subagent\'s context absorbs the work; only the condensed summary crosses back. Coordinator stays lean.' },
  { d: 'd1', q: 'Which statement about subagents in the Claude Agent SDK is correct?', opts: ['Subagents automatically inherit the coordinator\'s conversation history', 'Subagents can recursively spawn their own subagents for deep task trees', 'Subagents have isolated context that does NOT inherit coordinator history; they cannot spawn further subagents', 'Subagents share memory across parallel invocations'], correct: 2, exp: 'Subagents have isolated context (context must be explicitly passed in prompt). Subagents cannot spawn subagents.' },
  { d: 'd1', q: 'Your workflow requires extract → enrich order strictly. The model sometimes skips extraction and tries to enrich unknown data. Most reliable enforcement?', opts: ['Prompt instruction: "always extract metadata first"', 'Few-shot examples showing the correct order', 'Programmatic precondition (hook or orchestration layer) that blocks the enrich tool until extract has completed', 'Lower model temperature'], correct: 2, exp: 'Critical ordering requires programmatic enforcement. Hooks or explicit orchestration are deterministic. Prompts and examples are probabilistic.' },
  { d: 'd1', q: 'For parallel subagent execution in the Claude Agent SDK, which statement is correct?', opts: ['Subagents share common working memory and can synchronize mid-execution', 'Multiple Task calls in a SINGLE coordinator response execute concurrently; partition work and pass all needed context', 'Parallel subagents require a separate concurrency primitive', 'Subagents must run sequentially for consistency'], correct: 1, exp: 'Multiple Task calls in a single coordinator RESPONSE run in parallel. Partitioning and explicit context-passing are coordinator responsibilities.' },
  { d: 'd1', q: 'A subagent times out while fetching data. It returns { status: "error", message: "search unavailable" }. The coordinator cannot decide whether to retry, try an alternative, or continue. What should the subagent return instead?', opts: ['Structured error context: failure_type, attempted_query, partial_results, alternative_approaches', 'The raw exception stack trace', 'An empty result set marked as successful', 'Propagate the exception and abort the workflow'], correct: 0, exp: 'Structured error context lets the coordinator decide intelligently. Generic messages hide info; silent success masks failure; aborting discards partial progress.' },
  { d: 'd1', q: 'You need to normalize heterogeneous timestamp formats (Unix epochs, ISO 8601, human-readable) from multiple MCP tools before the model reads them. Which hook fits?', opts: ['PreToolUse', 'PostToolUse (normalizes tool output before the model processes it)', 'UserPromptSubmit', 'SessionStart'], correct: 1, exp: 'PostToolUse intercepts tool results after execution but before the model consumes them — ideal for normalizing heterogeneous formats into a consistent representation.' },

  // ========== DOMAIN 2 EXTENDED ==========
  { d: 'd2', q: 'A research system has two tools: analyze_content ("analyzes content and extracts key information") on the web-search agent and analyze_document ("analyzes documents and extracts key information") on the doc analysis agent. Logs show 45% of "analyze the uploaded report" requests route to the web-search agent. Best fix?', opts: ['Add a pre-routing classifier before the coordinator', 'Rename analyze_content to extract_web_results and update its description to explicitly reference web search and URLs', 'Add few-shot examples to the coordinator prompt', 'Merge both tools into a single analyze tool'], correct: 1, exp: 'Tool descriptions are the primary selection mechanism. Renaming and disambiguating descriptions fixes the root cause directly without adding infrastructure layers.' },
  { d: 'd2', q: 'An MCP tool returns on failure: { "isError": true, "content": "Operation failed" }. The agent cannot decide what to do. Best error contract?', opts: ['{ "isError": true, "content": "ERROR_500" }', '{ "isError": true, "content": { "errorCategory": "transient", "isRetryable": true, "message": "Service temporarily unavailable", "attempted_query": "order_id=12345", "partial_results": null } }', 'Throw an exception and let the SDK default-handle it', 'Return a structured success response with empty data'], correct: 1, exp: 'Structured error metadata (category, retryable flag, attempted query, partial results) lets the agent decide how to recover. Opaque errors block intelligent recovery.' },
  { d: 'd2', q: 'You need to share an MCP server configuration (GitHub integration) with your team automatically on git clone, with an env-var-supplied token. Where should the config live?', opts: ['~/.claude.json — user-level, cross-project', 'An enterprise policy file', '.mcp.json at project root, using ${GITHUB_TOKEN}, committed to git', 'A custom script in .claude/hooks/'], correct: 2, exp: '.mcp.json at project root is the team-shared location. ${VAR} substitution keeps secrets out of git. Claude Code prompts for approval on first use.' },
  { d: 'd2', q: 'A document analysis subagent was given the general-purpose fetch_url tool so it could download documents. Logs show it now frequently downloads search engine result pages doing ad-hoc web search — behavior that should route to the web-search agent. Best architectural fix?', opts: ['Add a prompt instruction that fetch_url should only be used for document URLs', 'Replace fetch_url with a load_document tool that validates URL points to a document format', 'Block search engine domains via an allowlist filter', 'Remove fetch_url and route all URL fetching through the coordinator'], correct: 1, exp: 'Principle of least privilege: constrain capability at the interface. A narrow tool validating input type prevents undesired behavior at the source. B is the most surgical fix.' },
  { d: 'd2', q: 'Which MCP primitive fits exposing a catalog of database schemas the agent can read for context?', opts: ['Tool', 'Resource', 'Prompt', 'A custom schema_fetcher tool per table'], correct: 1, exp: 'Resources are for data the agent reads for context (catalogs, schemas, docs). Tools are for actions. A Resource eliminates exploratory calls by providing an immediate map.' },
  { d: 'd2', q: 'Your team has a local MCP server that runs as a child process on each developer\'s machine. Which transport fits?', opts: ['stdio — local child process via stdin/stdout', 'HTTP — recommended for local integrations', 'SSE — the standard local transport', 'WebSockets'], correct: 0, exp: 'stdio is the local transport. HTTP is recommended REMOTE. SSE is deprecated for remote. Never log to stdout in a stdio server — corrupts JSON-RPC.' },
  { d: 'd2', q: 'A subagent is given 18 tools. It frequently picks the wrong one and wastes tokens deliberating. Best fix?', opts: ['Improve each tool description', 'Switch to a more capable model', 'Distribute tools across specialized subagents with 5-10 relevant tools each; apply least privilege', 'Add a routing classifier as a separate agent'], correct: 2, exp: 'Reasoning overload comes from too-many-tools. The fix is distribution — each agent gets a narrow set. Better descriptions help but don\'t solve overload itself.' },
  { d: 'd2', q: 'You need the model to always call one specific tool for the first action of an extraction pipeline. Which tool_choice is correct?', opts: ['{"type": "auto"}', '{"type": "any"}', '{"type": "tool", "name": "extract_metadata"}', 'Omit tool_choice entirely'], correct: 2, exp: 'Forced selection with {"type":"tool","name":"..."} guarantees the specific tool is called. "any" forces some tool; "auto" lets the model decide whether to call any.' },
  { d: 'd2', q: 'Guaranteed structured output is needed; your schema has several valid extraction variants (invoice vs receipt vs statement). Which tool_choice?', opts: ['{"type":"auto"}', '{"type":"any"} — model MUST call a tool but picks which', '{"type":"tool", "name":"extract_invoice"}', 'Define one tool with a union schema'], correct: 1, exp: '"any" forces a tool call (guaranteed structured output) while letting the model pick the right variant. "auto" might return text. Forced single-tool removes model choice.' },
  { d: 'd2', q: 'In 2026 you\'re installing an MCP server with SSE transport. What applies?', opts: ['SSE is the recommended transport for new integrations', 'SSE is deprecated in favor of HTTP streamable; migrate when feasible', 'SSE requires enterprise authentication', 'SSE and HTTP are equivalent'], correct: 1, exp: 'SSE was the original remote transport but is now deprecated in favor of streamable HTTP. Use HTTP for new remote setups.' },

  // ========== DOMAIN 3 EXTENDED ==========
  { d: 'd3', q: 'A new developer joins the team. Claude Code doesn\'t follow project conventions. Your lead has documented all conventions in ~/.claude/CLAUDE.md on their personal machine. Fix?', opts: ['Have the new hire copy the lead\'s CLAUDE.md to their own ~/.claude/', 'Move the conventions to .claude/CLAUDE.md at the project root, committed to git', 'Put conventions in a README.md Claude will auto-discover', 'Have the new hire set ANTHROPIC_CLAUDE_PATH'], correct: 1, exp: 'User-level is per-person, not shared. Project-level (.claude/CLAUDE.md or root CLAUDE.md) is committed and automatic for every contributor.' },
  { d: 'd3', q: 'A teammate proposes replacing your /review slash command with a Skill. Functional difference?', opts: ['Skills are faster than slash commands', 'Slash commands are user-invoked with /name; Skills (with SKILL.md frontmatter) are auto-discovered by Claude when relevant', 'Skills only work in Claude Desktop', 'They are identical'], correct: 1, exp: 'Skills auto-load when relevant (SKILL.md frontmatter decides applicability). Slash commands are explicit user invocations.' },
  { d: 'd3', q: 'A SKILL.md has YAML frontmatter "context: fork". What does this do?', opts: ['Duplicates the skill for team review', 'Runs the skill in an isolated subagent so verbose output does not pollute the main session', 'Requires user approval on every invocation', 'Marks the skill as experimental'], correct: 1, exp: 'context: fork runs the skill in an isolated subagent. Good for skills with verbose output (Explore, long analyses).' },
  { d: 'd3', q: 'Your team wants structured output from Claude in CI so a script can parse findings and post inline PR comments. Best flag combination?', opts: ['Just -p — parse text output with regex', '-p --output-format json (optionally --json-schema)', 'Use Claude Desktop and manually copy JSON', '-p --format structured'], correct: 1, exp: 'claude -p --output-format json returns result, model, usage, cost_usd, session_id. --json-schema enforces a schema on the nested result content.' },
  { d: 'd3', q: 'A multi-file PR code review in CI keeps posting duplicate comments on re-review after each new push. How to prevent duplication?', opts: ['Only run the review on the first push', 'Fetch prior review comments and include them in the prompt; instruct Claude to only report NEW or still-unresolved issues', 'Use a cache to deduplicate post-hoc via string matching', 'Limit Claude to one comment per file'], correct: 1, exp: 'Feed prior findings into context and instruct Claude to only report new or unresolved. String-match dedup misses semantically-equivalent rephrased comments.' },
  { d: 'd3', q: 'You want CLAUDE.md to reuse shared standards across multiple packages in a monorepo without duplication. Which syntax applies?', opts: ['Embed shared content with #include directives', 'Use @path imports, e.g., @./standards/testing.md — max nesting depth 5', 'Use ~shared~ reference tags', 'Symlink CLAUDE.md files between packages'], correct: 1, exp: 'CLAUDE.md supports @path imports. Relative paths resolve to the importing file\'s location. Max nesting depth is 5.' },
  { d: 'd3', q: 'In headless mode (-p) you want Claude to only use specific tools. Which flag enforces this?', opts: ['--tools-list', '--allowedTools "Read,Grep,Glob"', '--permissions read-only', 'CLAUDE_TOOLS env var'], correct: 1, exp: '--allowedTools with comma-separated list restricts what Claude can use. Pair with --max-turns and a Unix timeout for CI safety.' },
  { d: 'd3', q: 'The /compact command does what, and what is its main risk?', opts: ['Clears all history; risk is losing recent context', 'Summarizes prior history to free context window; risk is exact numerics/dates/specifics can be lost — extract critical facts to a persistent block first', 'Compresses the prompt cache; risk is increased latency', 'Compacts binary log files; risk is none'], correct: 1, exp: '/compact summarizes history to reclaim context. Summarization can lose precise values — extract them to a scratchpad block beforehand.' },
  { d: 'd3', q: 'You want to debug why Claude Code isn\'t applying your documented conventions. Which command verifies which memory files are loaded?', opts: ['/debug-config', '/memory', '/inspect-claude-md', '/reload'], correct: 1, exp: '/memory opens the loaded CLAUDE.md files for viewing/editing — helps diagnose why conventions aren\'t applied (often wrong hierarchy placement).' },
  { d: 'd3', q: 'Your CLAUDE.md places all conventions in the root file with headers per area. Claude inconsistently applies them to matching files. What\'s the better architecture?', opts: ['Same file, more emphasis phrases ("IMPORTANT:", "ALWAYS:")', '.claude/rules/ files with YAML frontmatter paths globs that conditionally load rules only when editing matching files', 'Run /memory to force reload', 'Move the whole thing to user-level ~/.claude/CLAUDE.md'], correct: 1, exp: 'Path-specific rules load only when editing matching files — deterministic conditional activation vs. relying on Claude inferring which section of a monolith applies.' },

  // ========== DOMAIN 4 EXTENDED ==========
  { d: 'd4', q: 'A code review prompt says "be conservative and only flag high-confidence issues." False-positive rates stay high. How should you rewrite?', opts: ['Add "really, be very careful" for emphasis', 'Replace with explicit criteria: "Flag a comment ONLY if (1) it contradicts the code, (2) references a nonexistent function, or (3) is a TODO/FIXME already fixed. Do NOT flag stylistically outdated or minor wording issues."', 'Switch to a more capable model', 'Add temperature=0'], correct: 1, exp: 'Vague caution can\'t be calibrated. Explicit criteria — what to flag, what NOT to flag, with categories — define the task concretely.' },
  { d: 'd4', q: 'An extraction tool has a required field stated_total. Many source documents omit this. What happens, and how do you fix it?', opts: ['The model returns null silently', 'The model fabricates a plausible value to satisfy the required constraint — fix by making the field nullable: "type": ["number", "null"]', 'The API returns 400', 'The request times out'], correct: 1, exp: 'Required fields on possibly-missing data push the model to fabricate. Nullable types let the model honestly return null.' },
  { d: 'd4', q: 'You want to extract product categories, but some source docs don\'t fit predefined categories. Best enum design?', opts: ['Force the nearest category', 'Add "other" with a detail string for outside-category values, and "unclear" for genuinely ambiguous cases', 'Use free-text (no enum)', 'Always return null when unclear'], correct: 1, exp: 'Escape-hatch enums preserve info without forcing bad categorizations. Honest "unclear" beats a confident wrong label.' },
  { d: 'd4', q: 'A validation-retry loop fails 3 times; the total doesn\'t reconcile because the source simply doesn\'t list all items. Best behavior?', opts: ['Increase retries to 10', 'Recognize retry won\'t help when info is absent; return partial with conflict flag and route to human review', 'Refuse any extraction', 'Switch models'], correct: 1, exp: 'Retry helps with format/structural errors, not missing source information. Recognize this class and escalate or return partial with flags.' },
  { d: 'd4', q: 'You\'re processing 10,000 invoices. Results needed in 16 hours. Batches API: 50% savings, up to 24-hour window. Best approach?', opts: ['Sync for safety', 'Batches — 50% savings, non-blocking workload, 16h > typical batch completion; correlate with custom_id, re-submit any failures', 'Split evenly across both', 'Sync for first 1000, batch for rest'], correct: 1, exp: 'Bulk, non-blocking, deadline > batch window = Batches. 50% savings at scale is material. custom_id correlates responses for failure re-submission.' },
  { d: 'd4', q: 'You want review in CI to find issues the generation session missed. Most effective architectural principle?', opts: ['Ask the generation session to review its output with a stricter prompt', 'Run review in an INDEPENDENT Claude session without the generation history', 'Enable extended thinking on the original session', 'Use a different random seed'], correct: 1, exp: 'Self-review is biased toward the generator\'s decisions. Independent session = unbiased critique — mirrors human peer review.' },
  { d: 'd4', q: 'Ideal number of few-shot examples for a structured extraction task covering 3 edge cases?', opts: ['1', '3–4 covering edge cases and hardest inputs', '20+ for safety', 'Zero — zero-shot always beats'], correct: 1, exp: '3–4 is the practical sweet spot. Cover the hard cases. More = diminishing returns and token cost.' },
  { d: 'd4', q: 'For informal measurements ("two handfuls of rice", "a pinch of salt"), which technique improves extraction consistency most?', opts: ['Temperature = 0', 'Few-shot examples showing 3-4 input→output mappings for informal measurements with rationale', 'A longer rule-based description', 'Switch to Opus'], correct: 1, exp: 'Few-shot examples of informal measurement handling give the model a concrete pattern. Rules alone struggle with the long tail.' },
  { d: 'd4', q: 'You need the STRONGEST possible guarantee that Claude returns a valid JSON object matching a schema. Which approach?', opts: ['Add "respond only in valid JSON, no preamble" to the prompt', 'tool_use with a JSON Schema — eliminates syntax errors', 'Post-process output with a JSON parser and retry', 'All three combined, primarily relying on the prompt text'], correct: 1, exp: 'tool_use with JSON Schema guarantees syntactic validity. Prompt-level JSON can still fail. Retry loops are secondary; tool_use is primary.' },
  { d: 'd4', q: 'About prompt caching and the CCA-F exam: what is the correct scope?', opts: ['Memorize TTL values, breakpoint counts, and cache_creation_input_tokens math', 'Know prompt caching exists and conceptually reduces costs for repeated prefixes; implementation details (TTLs, breakpoint math) are OUT OF SCOPE per the exam guide', 'Prompt caching is heavily tested on the exam', 'Not on the exam at all'], correct: 1, exp: 'The official exam guide explicitly lists "prompt caching implementation details (beyond knowing it exists)" as OUT OF SCOPE. Know the concept; don\'t over-study the mechanics.' },

  // ========== DOMAIN 5 EXTENDED ==========
  { d: 'd5', q: 'A synthesis agent reliably cites findings from the first 15K and last 10K tokens of a 75K-token aggregated input, but misses critical middle findings. Best restructure?', opts: ['Shrink all inputs to under 30K', 'Place a key-findings summary at the start, organize detailed results with explicit section headings, include dates/sources per finding', 'Rotate which subagent\'s results appear first across runs', 'Stream results to synthesis incrementally'], correct: 1, exp: 'Lost-in-the-middle: lead with key findings summary, use explicit section headings for navigation, repeat critical info at both ends.' },
  { d: 'd5', q: 'A customer says "this is outrageous, I\'m very unhappy with your product quality!" What should the agent do?', opts: ['Escalate immediately — customer sounds upset', 'Acknowledge frustration, offer a concrete resolution (replacement/refund), and only escalate if the customer REITERATES wanting a human', 'Route to sentiment-analysis to decide', 'Ask the customer to rate satisfaction 1-10'], correct: 1, exp: 'Expressing dissatisfaction ≠ requesting a manager. Acknowledge → resolve → escalate on reiteration. Sentiment alone is unreliable.' },
  { d: 'd5', q: 'Customer explicitly says "I want to speak to a manager." Correct behavior?', opts: ['Attempt to solve first for first-contact resolution', 'Acknowledge → propose resolution → escalate only if customer stays upset', 'Immediately call escalate_to_human with a structured handoff — do NOT attempt to solve first', 'Ask "are you sure?"'], correct: 2, exp: 'Explicit manager request = immediate escalation. Attempting to solve first damages trust. Structured handoff ensures the human has context.' },
  { d: 'd5', q: 'An extraction pipeline reports 97% overall accuracy. Leadership wants to automate 100% of processing. What\'s the risk?', opts: ['None — 97% is excellent', '97% aggregate can hide 40% error rates on specific doc types or fields. Use stratified random sampling per type and field; keep low-confidence extractions in human review', '97% is unrepresentative — real number is lower', 'Model will degrade over time'], correct: 1, exp: 'Aggregate metrics hide distribution. Stratified sampling exposes per-segment failure rates. Route low-confidence to review; calibrate empirically.' },
  { d: 'd5', q: 'Your support agent often LOSES key case facts (order ID, refund amount) after long conversations because /compact summarizes them as "about $89". Best mitigation?', opts: ['Disable /compact entirely', 'Extract case facts into a structured persistent block included in every prompt — survives summarization', 'Use extended thinking every turn', 'Restart the session every 10 turns'], correct: 1, exp: 'Case-facts block persists critical structured data outside summarized history. Compaction can\'t lose what\'s re-provided each turn.' },
  { d: 'd5', q: 'A web-search subagent returns: academic DB → 15 papers, industry reports → "0 results", patent DB → "Connection timeout". When passing errors to the coordinator, which approach is best?', opts: ['Flatten to "67% success" metric', 'Report both "timeout" and "0 results" as failures requiring retry', 'Distinguish access failure (timeout — retry decision) from valid empty result (0 results — legitimate answer). Different semantics require different responses', 'Retry silently until all three return data'], correct: 2, exp: 'Timeout and "0 results" are fundamentally different outcomes. Merging them discards information. The coordinator needs the distinction to route recovery.' },
  { d: 'd5', q: 'Two credible sources give conflicting statistics: government report says 40% growth, industry analysis says 12%. How should the document analysis subagent handle this?', opts: ['Pick the more credible source and footnote the other', 'Pick an average', 'Complete analysis with both values annotated as conflicting, full source attribution and dates, and let the coordinator reconcile with broader context', 'Stop analysis and escalate before continuing'], correct: 2, exp: 'Preserve both values with attribution. Don\'t arbitrarily pick. The coordinator has broader context to reconcile or escalate.' },
  { d: 'd5', q: 'A subagent finishes its core work, then hits an edge case it can\'t handle. It silently returns an empty result. Problem?', opts: ['Nothing — graceful degradation', 'Silent suppression masks failure as success — the coordinator cannot distinguish "no results" from "agent errored". Return structured error context with partial results and failure type', 'The subagent should have retried infinitely', 'The coordinator should have caught this'], correct: 1, exp: 'Silent suppression is an anti-pattern. The coordinator cannot recover from what it cannot see. Structured errors enable intelligent recovery.' },
  { d: 'd5', q: 'Agent is at ~180K tokens, response quality has degraded, key details being forgotten. Best next step?', opts: ['Switch to larger-context model mid-session', 'Create a fresh session with a compact briefing: goals, decisions made, open questions, file paths', '/compact aggressively and keep going', 'Ask the user to start over'], correct: 1, exp: 'Fresh session with briefing beats --resume when context has degraded. Briefing recovers state; clean context recovers attention quality.' },
  { d: 'd5', q: 'For confidence calibration on extraction quality, which approach is correct?', opts: ['Set thresholds based on intuition — 80% auto-approve', 'Ask the model to rate 1-10 and trust its self-rating', 'Collect model-reported confidence on labeled validation data, measure actual accuracy vs reported confidence, set thresholds empirically, recalibrate on changes', 'Use SDK defaults'], correct: 2, exp: 'Empirical calibration from labeled data. Model self-ratings can be confidently wrong. Thresholds are workload-specific; recalibrate on prompt or model change.' },
  { d: 'd5', q: 'A synthesis report says "the AI music market is estimated at $3.2B." What\'s missing?', opts: ['Nothing — factual claim', 'Source attribution, date, and methodology. Without provenance, conflicting claims can\'t be reconciled and temporal context is lost', 'A confidence score', 'A unit'], correct: 1, exp: 'Attribution loss is the core provenance anti-pattern. Subagents must preserve claim → source mappings (URL, source, date, methodology) through synthesis.' },

  // ========== DOMAIN 1 SUPPLEMENTAL (task-statement-grounded) ==========
  { d: 'd1', q: 'A multi-agent research system produces synthesis reports that miss obvious sub-topics even though each subagent executes cleanly. You want the coordinator to detect gaps and fill them automatically. What pattern achieves this?', opts: ['Run synthesis twice and merge outputs', 'Increase web-search result counts by 3x', 'Implement an iterative refinement loop: the coordinator evaluates synthesis output for gaps, re-delegates to search/analysis subagents with targeted queries, and re-invokes synthesis until coverage is sufficient', 'Add a post-processing LLM pass to rewrite the synthesis'], correct: 2, exp: 'Iterative refinement loops are the documented pattern (exam guide Task 1.2). The coordinator evaluates synthesis quality and closes coverage gaps by re-delegating with more specific queries. Single-pass doubling, search-count tweaks, or post-hoc rewriting do not address the root cause — gaps in what was researched.' },
  { d: 'd1', q: 'Two research subagents work in parallel on "AI in healthcare." Both cover the same major hospital systems, consuming nearly 2x the tokens with no breadth gain. Best architectural fix?', opts: ['Deduplicate outputs post-hoc before passing to synthesis', 'Run the subagents sequentially, passing the first result as context to the second', 'Have the coordinator explicitly partition the research scope before delegating — assign distinct subtopics or source types (e.g., acute care vs primary care, or academic papers vs industry reports) to each subagent', 'Switch to a single larger agent'], correct: 2, exp: 'Task 1.2 explicitly calls out partitioning research scope to minimize duplication — assigning distinct subtopics or source types. Post-hoc dedup wastes tokens. Sequential execution abandons parallelism. Single-agent negates hub-and-spoke benefits.' },
  { d: 'd1', q: 'When your web-search subagent returns findings to the synthesis agent, source attribution is frequently lost during the handoff. Synthesis output cites no URLs or dates. What structural fix works?', opts: ['Paraphrase each finding before passing it on', 'Pass raw text blobs to preserve all info', 'Use structured data formats that separate content from metadata (source URLs, document names, page numbers, publication dates) when passing context between agents', 'Ask the synthesis agent to re-fetch sources'], correct: 2, exp: 'Task 1.3 specifies structured data separating content from metadata as the documented pattern. Downstream agents can then preserve attribution through synthesis. Paraphrasing and re-fetching both lose fidelity.' },
  { d: 'd1', q: 'Your coordinator\'s system prompt is a 40-step procedural checklist. When a new research domain comes up, the coordinator rigidly follows the checklist and misses domain-specific subtasks. Better approach?', opts: ['Add 20 more checklist steps to cover edge cases', 'Replace the procedural checklist with a prompt specifying research goals and quality criteria (e.g., "Produce a report with balanced coverage, cited claims, and conflict annotations") rather than step-by-step procedural instructions', 'Route new domains through a fallback path', 'Raise the model temperature for more creativity'], correct: 1, exp: 'Task 1.3: write coordinator prompts with goals and quality criteria rather than step-by-step procedures — enables subagent adaptability to novel inputs. More steps compound rigidity. Fallbacks skirt the root cause. Temperature changes output style, not coordination quality.' },
  { d: 'd1', q: 'A customer message contains three separate concerns: a billing dispute from last month, a delayed shipment this week, and a product defect claim. The agent produces a single unified response that handles one concern well but misses details on the others. Best approach?', opts: ['Handle each concern one at a time, requiring the customer to re-submit', 'Escalate the whole ticket because it is multi-concern', 'Ask the customer to prioritize which concern should be handled first', 'Decompose the multi-concern request into distinct items, investigate each in parallel using shared customer context, then synthesize a unified resolution'], correct: 3, exp: 'Task 1.4 specifies decomposing multi-concern customer requests into distinct items and investigating each in parallel. Serial handling degrades UX. Escalation wastes agent capability. Asking the customer to prioritize shifts work onto them.' },
  { d: 'd1', q: 'You --resume a Claude Code investigation session from yesterday. Since then your team merged a PR that refactored the auth module. Claude starts making recommendations based on the OLD auth code it cached in its session context. Best remediation?', opts: ['Always start fresh sessions; never use --resume', 'Run /compact and hope the stale details are summarized away', 'Explicitly inform the resumed agent about the specific files that changed so it can do targeted re-analysis of those files — rather than forcing full re-exploration', 'Trust that the model will re-read files it needs'], correct: 2, exp: 'Task 1.7: when resuming sessions after code modifications, explicitly inform the agent about changes for targeted re-analysis. /compact would worsen the stale-context problem. The model will not automatically re-read files unless prompted.' },

  // ========== DOMAIN 2 SUPPLEMENTAL (task-statement-grounded) ==========
  { d: 'd2', q: 'Tool descriptions in your support system are well-written, yet the agent still calls get_customer unnecessarily on order-only queries. You review the system prompt and find it says "Always verify the customer\'s identity before any operation." Diagnosis?', opts: ['Tool descriptions need to be even more detailed', 'Add a PreToolUse hook blocking get_customer on order-only queries', 'Switch to a model with better tool selection', 'The system prompt\'s keyword-sensitive phrasing ("always verify") creates an unintended tool association that overrides well-written tool descriptions. Rephrase or remove it'], correct: 3, exp: 'Task 2.1 covers reviewing system prompts for keyword-sensitive instructions that override tool descriptions. "Always verify" creates an implicit mandate the model interprets as an imperative for get_customer. Tools are not the problem; the system prompt is.' },
  { d: 'd2', q: 'Your codebase has a generic analyze_document MCP tool that handles extraction, summarization, and validation. Agents pick it inconsistently for these three different tasks. Best refactor?', opts: ['Add 15 more examples to the analyze_document description', 'Rename analyze_document to process_document_smart', 'Consolidate analyze_document with analyze_content into a universal analyze_anything', 'Split into purpose-specific tools with defined input/output contracts — e.g., extract_data_points, summarize_content, and verify_claim_against_source — each with a focused description'], correct: 3, exp: 'Task 2.1: split generic tools into purpose-specific tools with defined input/output contracts. Further consolidation is the opposite fix. Renaming or padding descriptions does not solve overlapping purpose.' },
  { d: 'd2', q: 'A refund request exceeds the policy maximum. Your refund tool returns isError:true. What metadata should accompany this error to help the agent communicate properly with the customer?', opts: ['A raw SQL exception trace', 'retryable:true with the original amount so the agent retries', 'A generic "operation failed" message', 'retryable:false with errorCategory:"business" and a customer-friendly explanation of the business rule so the agent can communicate appropriately'], correct: 3, exp: 'Task 2.2: return retryable:false flags with customer-friendly explanations for business rule violations. Stack traces help no one. Wrong retryable flags cause wasted retries on non-retryable errors.' },
  { d: 'd2', q: 'Your synthesis agent needs simple fact-checks 85% of the time (dates, names, stats) and deep investigation 15% of the time. Currently every verification round-trips through the coordinator. Documented pattern for reducing overhead while preserving separation of concerns?', opts: ['Give the synthesis agent full access to all web-search tools so it is self-sufficient', 'Proactively cache extra context around every source', 'Provide a scoped cross-role verify_fact tool on the synthesis agent for high-frequency simple lookups; continue routing complex verifications through the coordinator to the web-search agent', 'Accumulate all verifications and batch them at end-of-run'], correct: 2, exp: 'Task 2.3: scoped cross-role tools for high-frequency needs. This applies least-privilege while eliminating 85% of unnecessary round-trips. Full access violates separation; batching creates blocking dependencies; proactive caching is speculative.' },
  { d: 'd2', q: 'You need Jira integration for Claude Code. Options: use the community mcp-server-jira package, or write a custom MCP server. What does the exam guide recommend?', opts: ['Always write custom for maximum control', 'Prefer existing community MCP servers for standard integrations (like Jira); reserve custom servers for team-specific workflows community servers do not cover', 'Whichever was updated more recently', 'Only custom MCP servers are supported; community servers do not work with Agent SDK'], correct: 1, exp: 'Task 2.4: choose existing community MCP servers over custom implementations for standard integrations, reserving custom servers for team-specific workflows. Time on custom work is better spent on unique needs.' },
  { d: 'd2', q: 'Your Claude Code session has both the built-in Grep tool and an MCP codebase_search tool that uses semantic embeddings. Logs show the agent always picks Grep even when semantic search would work better. Best fix?', opts: ['Remove Grep from allowedTools', 'Raise the temperature', 'Prefix the system prompt with "USE MCP TOOLS FIRST"', 'Enhance the codebase_search MCP tool description to explain its unique capabilities (semantic matching, ranked results) and when to prefer it over Grep — e.g., for conceptual searches where exact strings are unknown'], correct: 3, exp: 'Task 2.4: enhance MCP tool descriptions to explain unique capabilities so the agent does not default to built-ins. Removing Grep is heavy-handed; temperature changes do not fix selection; prompt imperatives are probabilistic and fragile.' },

  // ========== DOMAIN 3 SUPPLEMENTAL (task-statement-grounded) ==========
  { d: 'd3', q: 'You documented testing conventions in your project CLAUDE.md last week. This morning Claude is not following them. Which command verifies which memory files are actually loaded?', opts: ['/debug-config', '/inspect-claude-md', '/memory', '/reload'], correct: 2, exp: 'Task 3.1: /memory verifies which memory files are loaded and diagnoses inconsistent behavior across sessions. The other commands do not exist.' },
  { d: 'd3', q: 'Your monorepo uses @import heavily. Root imports standards.md, which imports testing.md, which imports fixtures.md, which imports data-shapes.md, which imports types.md, which imports primitives.md. Claude does not load primitives.md. Why?', opts: ['@import does not support chained imports at all', 'You need absolute paths for imports beyond 2 levels', 'Claude Code caches the first 4 imports only', 'Maximum @import nesting depth is 5; primitives.md is at depth 6 and is silently skipped'], correct: 3, exp: '@path supports chaining with a documented maximum nesting depth of 5. Flatten your import chain or consolidate files at the deepest levels.' },
  { d: 'd3', q: 'You created .claude/skills/analyze-deps/SKILL.md that requires a directory path argument. When a developer invokes /analyze-deps without arguments, you want Claude to prompt them for the missing path. Which frontmatter field?', opts: ['required-args: ["path"]', 'default-arg: "./"', 'param-prompt: "Enter a path"', 'argument-hint: "Path to the directory to analyze"'], correct: 3, exp: 'Task 3.2: argument-hint is the documented SKILL.md frontmatter field that prompts developers for required parameters when the skill is invoked without arguments.' },
  { d: 'd3', q: 'You need Claude to implement a caching layer for a new internal API. You have never built cache invalidation before — there are multiple viable strategies (TTL, event-based, hybrid) with non-obvious tradeoffs. Best collaborative pattern?', opts: ['Write detailed upfront specs and hand them to Claude', 'Ask Claude to generate 3 complete implementations and pick one', 'Use the interview pattern — have Claude ask clarifying questions to surface design considerations (invalidation strategy, failure modes, cache sizing) before implementing, so non-obvious tradeoffs become explicit', 'Lower temperature for more conservative implementation'], correct: 2, exp: 'Task 3.5: the interview pattern — having Claude ask questions to surface considerations the developer may not have anticipated — is the documented pattern for unfamiliar domains. Upfront specs assume you already know what you do not know.' },
  { d: 'd3', q: 'You are building a data-transformation function with edge cases around nulls, negative numbers, and very large inputs. Claude\'s first implementation handles the happy path but fails on edges. What pattern guides iterative improvement most effectively?', opts: ['Ask Claude to "be more careful" in the next iteration', 'Use extended thinking and hope for deeper reasoning', 'Manually review and paste feedback text', 'Test-driven iteration: write a test suite first covering expected behavior, edge cases, and performance requirements, then iterate by sharing test failures for Claude to address'], correct: 3, exp: 'Task 3.5: test-driven iteration — writing tests first then iterating on failures — is the documented pattern. It gives Claude concrete criteria. "Be more careful" is vague. Extended thinking does not manufacture missing requirements.' },
  { d: 'd3', q: 'A code review surfaces 5 issues. Issues 1-3 interact (fixing #1 affects how #2 should be fixed, which affects #3). Issues 4 and 5 are independent fixes in different files. How should you communicate these to Claude?', opts: ['All 5 in a single message', 'All 5 sequentially, one at a time', 'Address issues 1-3 in a single detailed message (since they interact); address issues 4 and 5 sequentially as independent fixes', 'Parallelize all 5 across separate sessions'], correct: 2, exp: 'Task 3.5: interacting issues handled in a single detailed message (fixes affect each other); independent issues sequentially. Bundling independents adds noise; splitting interacting issues loses context between fixes.' },

  // ========== DOMAIN 4 SUPPLEMENTAL (task-statement-grounded) ==========
  { d: 'd4', q: 'Your automated reviewer flags 100+ style issues per PR, but 80% are false positives. Developer trust is plummeting — they are starting to ignore ALL review comments, including legitimate security findings. Short-term action?', opts: ['Turn off the entire automated review until you can improve it', 'Accept the FP rate as the cost of catching real issues', 'Halve the severity thresholds across ALL categories', 'Temporarily disable the high-false-positive style category to restore developer trust; continue running the accurate categories (security, bugs) while you improve the style prompt separately'], correct: 3, exp: 'Task 4.1: temporarily disable high-FP categories to restore trust while improving prompts for those categories. High FP rates in ONE category undermine trust across ALL categories. Turning everything off throws away value; across-the-board threshold cuts lose real findings.' },
  { d: 'd4', q: 'Your code reviewer produces inconsistent severity classifications — the same null-pointer bug is marked "critical" in one review, "medium" in another. What prompt change fixes this?', opts: ['Set temperature to 0', 'Add "be consistent" to the prompt', 'Have the model self-rate confidence alongside each finding', 'Define explicit severity criteria with CONCRETE CODE EXAMPLES for each level (e.g., CRITICAL: null-pointer in payment code that runs on every transaction; HIGH: SQL injection; MEDIUM: off-by-one in logging)'], correct: 3, exp: 'Task 4.1: define explicit severity criteria with concrete code examples for each level to achieve consistent classification. Temperature=0 only reduces generation variance, not criteria ambiguity. "Be consistent" is vague. Confidence ratings do not define the criteria.' },
  { d: 'd4', q: 'Your invoice extraction schema has shipping_address as required. About 15% of invoices are for digital goods with no shipping address. The model fabricates addresses to satisfy the required constraint. Best fix?', opts: ['Provide a default value like "N/A" and keep it required', 'Set temperature to 0 so the model stops making things up', 'Add few-shot examples showing fabricated addresses as "wrong"', 'Change shipping_address to nullable: "type": ["string", "null"] — the model returns null instead of fabricating when the info is absent'], correct: 3, exp: 'Task 4.3: design schema fields as nullable when source documents may not contain the information, preventing the model from fabricating values to satisfy required fields. Defaults and few-shot anti-examples leave the root cause in place.' },
  { d: 'd4', q: 'Developers frequently dismiss certain automated review findings as false positives. You want to systematically analyze WHICH patterns trigger dismissals so you can improve prompts. What schema field should you add to findings?', opts: ['severity_override', 'dismiss_count', 'reviewer_confidence_score', 'detected_pattern — tracks the specific code construct that triggered each finding, enabling systematic analysis of which patterns cause false positives'], correct: 3, exp: 'Task 4.4: add detected_pattern fields to structured findings to enable analysis of false positive patterns when developers dismiss findings. You can then see "we keep flagging this pattern; developers keep dismissing it" and refine.' },
  { d: 'd4', q: 'Invoice extraction sometimes produces totals that do not match line items (e.g., total = $150, line items sum = $145). You want the model to self-flag these inconsistencies. What schema pattern works?', opts: ['Retry with a stricter prompt until totals match', 'Round all values to the nearest dollar to paper over rounding differences', 'Ask the model to pick whichever total looks more plausible', 'Extract both calculated_total (summed from line_items) AND stated_total (from the document); add a conflict_detected boolean that is true when they differ. Downstream code handles the discrepancy explicitly'], correct: 3, exp: 'Task 4.4: self-correction validation flows — extract calculated_total alongside stated_total and add conflict_detected booleans. Other options either hide inconsistencies (rounding) or compound error (arbitrary pick).' },
  { d: 'd4', q: 'You need extraction results within a 30-hour SLA. The Message Batches API\'s processing window is up to 24 hours with no SLA guarantee. How do you plan batch submission cadence to hit the 30h deadline reliably?', opts: ['Submit all batches 30 hours before each deadline', 'Use synchronous API only — batches are too risky', 'Submit one batch per hour', 'Calculate submission windows: 30h SLA minus 24h max batch processing = 6h buffer. Submit in 4-hour windows so each batch has margin even if a single batch takes the full 24h'], correct: 3, exp: 'Task 4.5: calculate batch submission frequency based on SLA constraints — 4-hour windows to guarantee 30h SLA with 24h processing. Single-submission has no margin. Sync-only abandons 50% savings. Hourly is wasteful without calculation.' },

  // ========== DOMAIN 5 SUPPLEMENTAL (task-statement-grounded) ==========
  { d: 'd5', q: 'Your synthesis agent processes 80K tokens of aggregated research. Critical findings in the middle 40K are consistently missed, even when they directly answer the research question. Best restructure?', opts: ['Shrink all inputs to under 40K total', 'Randomly shuffle content so findings appear in varied positions across runs', 'Use a model with a larger context window', 'Place a key-findings summary at the beginning, organize detailed results with explicit section headers for navigation, and repeat critical conclusions at the end — mitigates the lost-in-the-middle effect'], correct: 3, exp: 'Task 5.1: place key findings summaries at the beginning AND organize detailed results with explicit section headers to mitigate position effects. Lost-in-the-middle is an attention phenomenon — bigger context windows do not fix it.' },
  { d: 'd5', q: 'A subagent hits an HTTP 503 on a tool call. It could propagate to the coordinator immediately, or handle locally. Best design?', opts: ['Always propagate to coordinator — keep subagents pure', 'Retry infinitely inside the subagent until success', 'Mark the whole task as failed immediately', 'Implement local recovery in the subagent for transient failures (1-2 retries with backoff); propagate to coordinator only errors the subagent cannot resolve, including what was attempted and any partial results'], correct: 3, exp: 'Task 5.3: subagents implement local recovery for transient failures and propagate only errors they cannot resolve (with attempt context and partial results). Propagating everything wastes coordinator cycles. Infinite retries block the system.' },
  { d: 'd5', q: 'Your extraction pipeline reports 97% aggregate accuracy. You want to detect NEW error patterns emerging in high-confidence extractions BEFORE they cause systematic problems. What measurement strategy catches novel failure modes?', opts: ['Sample only the low-confidence extractions for review', 'Uniform random sampling across all extractions', 'Review only cases where customers complained', 'Stratified random sampling of high-confidence extractions — stratified by document type AND field — for ongoing error-rate measurement and novel pattern detection'], correct: 3, exp: 'Task 5.5: stratified random sampling of HIGH-confidence extractions across document types and fields detects novel patterns. Sampling only low-confidence misses systemic high-confidence failures. Uniform sampling under-samples rare types.' },
  { d: 'd5', q: 'Your research synthesis report contains financial data (quarterly revenues), news summaries (narrative updates), and technical benchmark results (latency, throughput). Forcing all into uniform markdown bullet lists makes the report unreadable. Best approach?', opts: ['Uniform bullet lists everywhere for consistency and scannability', 'Convert everything to JSON for machine-readability', 'Use narrative prose for everything since reports are read by humans', 'Render different content types appropriately: financial data as tables, news as prose, technical findings as structured lists, time series chronologically — content-appropriate formatting rather than uniform conversion'], correct: 3, exp: 'Task 5.6: render different content types appropriately (financial as tables, news as prose, technical as structured lists) rather than converting everything to a uniform format. Uniformity is optimized for the formatter, not the reader.' },
  { d: 'd5', q: 'Your CI pipeline uses bypassPermissions to skip interactive prompts. You must guarantee that `rm -rf /` is ALWAYS blocked, regardless of permission mode. Which mechanism survives bypassPermissions?', opts: ['Set the permission mode to "default" in CI (abandoning non-interactivity)', 'Add a Bash denylist in settings.json (not honored in bypassPermissions)', 'A PostToolUse hook that cleans up after execution', 'A PreToolUse hook that returns permissionDecision:"deny" — PreToolUse fires BEFORE the permission-mode check, so denial applies regardless of permission mode, including bypassPermissions and --dangerously-skip-permissions'], correct: 3, exp: 'PreToolUse hooks fire before permission-mode checks. A deny decision blocks the tool even in bypassPermissions mode. PostToolUse cannot undo an executed command. Denylists in settings.json are respected by permission modes but bypassed by bypassPermissions.' },
  { d: 'd5', q: 'A coordinator has PreToolUse hooks enforcing safety rules. It spawns subagents. You want the SAME safety hooks to apply to subagent tool calls. What ensures this?', opts: ['Hooks automatically inherit to subagents', 'Wrap every subagent spawn in try/except', 'Use permission mode "default" on subagents — they will fall back to parent rules', 'Subagents do NOT automatically inherit parent agent permissions. Configure PreToolUse hooks or permission rules that apply to subagent sessions; to avoid repeated prompts, use hooks for auto-approval of specific tools'], correct: 3, exp: 'Documented behavior: subagents do not inherit parent permissions automatically. Configure PreToolUse hooks or permission rules that apply to subagent sessions. Try/except in code does not address the model\'s tool-calling behavior.' },

  // ========== PROJECTS ==========
  { d: 'proj', q: 'When does a Project switch to RAG mode?', opts: ['Always', 'When the knowledge base approaches context limits — automatic; capacity expands up to 10x', 'Only on paid plans', 'When there are 10+ files'], correct: 1, exp: 'Automatic switch on approaching context limits. Retrieves relevant chunks. Feels unchanged from the user side.' },
  { d: 'proj', q: 'A teammate needs to modify project instructions and add knowledge but not change access. Which permission?', opts: ['Can view', 'Can edit', 'Owner', 'Admin'], correct: 1, exp: 'Can edit: modifies instructions, knowledge, members. Owner: also controls sharing/visibility.' },
  { d: 'proj', q: 'Best filename for project knowledge?', opts: ['doc.pdf', 'Q4-2025-Brand-Guidelines.pdf', 'file_final_v2_USE_THIS.pdf', 'stuff.pdf'], correct: 1, exp: 'Descriptive filenames help Claude route retrieval. Filenames are a routing signal.' },
];

// ============================================================
// EXAM INFO — from the official Anthropic exam guide
// ============================================================
const EXAM_INFO = {
  format: '60 multiple-choice questions (1 correct of 4), 120 minutes, closed-book, no AI assistance',
  passing: '720 / 1000 scaled score. No guessing penalty — answer every question.',
  scenarios: '4 of 6 scenarios randomly selected per sitting',
  proctor: 'Recording-based (not live) — take it at your convenience',
  cost: '$99 (free for first 5,000 Claude Partner Network employees)',
  scoreReport: 'Delivered within 2 business days',
  experience: '6+ months building production Claude systems (Agent SDK, Claude Code, MCP, API)',
  scenarioList: [
    { name: 'Customer Support Resolution Agent', gist: 'Returns, billing, account issues. MCP tools: get_customer/lookup_order/process_refund/escalate_to_human. Target 80%+ first-contact resolution.', domains: 'D1, D2, D5' },
    { name: 'Code Generation with Claude Code', gist: 'Generation, refactoring, debugging, docs. Slash commands, CLAUDE.md, plan mode vs direct execution.', domains: 'D3, D5' },
    { name: 'Multi-Agent Research System', gist: 'Coordinator delegates to web search / document analysis / synthesis / report subagents. Reports with citations.', domains: 'D1, D2, D5' },
    { name: 'Developer Productivity with Claude', gist: 'Codebase exploration, boilerplate, routine automation. Built-in tools + MCP servers.', domains: 'D2, D3, D1' },
    { name: 'Claude Code for CI/CD', gist: 'Automated reviews, test generation, PR feedback. -p mode, structured output, minimize false positives.', domains: 'D3, D4' },
    { name: 'Structured Data Extraction', gist: 'Unstructured docs → structured data. JSON Schema validation. Edge cases. High accuracy.', domains: 'D4, D5' },
  ],
  inScope: [
    'Agentic loop implementation & stop_reason handling',
    'Coordinator-subagent orchestration & Task tool',
    'Subagent context management & explicit context passing',
    'Tool interface design & MCP servers/resources',
    'Error handling, structured errors & propagation',
    'Escalation decision-making & handoff protocols',
    'CLAUDE.md hierarchy & @import & .claude/rules/',
    'Slash commands, Skills (SKILL.md frontmatter)',
    'Plan mode vs direct execution',
    'Iterative refinement & the interview pattern',
    'Structured output via tool_use & JSON Schemas',
    'Few-shot prompting for consistency',
    'Message Batches API (appropriateness, custom_id)',
    'Context window optimization & lost-in-the-middle',
    'Human review workflows & confidence calibration',
    'Information provenance & conflict handling',
  ],
  outOfScope: [
    'Fine-tuning or training custom models',
    'API authentication, billing, account management',
    'Detailed language/framework implementation specifics',
    'Deploying or hosting MCP servers (infra/networking)',
    'Claude internal architecture, training, model weights',
    'Constitutional AI, RLHF, safety training',
    'Embedding models, vector database implementation',
    'Computer Use, vision/image analysis',
    'Streaming API implementation details',
    'Rate limiting, quotas, pricing calculations',
    'OAuth, API key rotation, auth protocols',
    'Cloud provider configs (AWS, GCP, Azure)',
    'Performance benchmarking or model comparison',
    'Prompt caching IMPLEMENTATION DETAILS (know it exists)',
    'Token counting algorithms or tokenization',
  ],
  exercises: [
    { title: 'Build a Multi-Tool Agent with Escalation Logic', body: 'Define 3–4 MCP tools with detailed descriptions that differentiate each tool. Implement an agentic loop checking stop_reason. Add structured error responses (errorCategory, isRetryable, message). Implement a programmatic hook enforcing a business rule (e.g., blocking operations over a threshold). Test with multi-concern messages.', domains: 'D1, D2, D5' },
    { title: 'Configure Claude Code for a Team Development Workflow', body: 'Create project-level CLAUDE.md. Create .claude/rules/ files with YAML paths globs for different code areas. Create a project skill in .claude/skills/ with context:fork and allowed-tools. Configure MCP server in .mcp.json with env-var expansion and a personal server in ~/.claude.json. Test plan mode vs direct execution on tasks of varying complexity.', domains: 'D3, D2' },
    { title: 'Build a Structured Data Extraction Pipeline', body: 'Extraction tool with required + optional + nullable fields, enum with "other"+detail, "unclear" for ambiguous. Implement validation-retry loop with Pydantic. Add few-shot examples for varied document formats. Design batch processing with custom_id failure handling. Route low-confidence extractions to human review.', domains: 'D4, D5' },
    { title: 'Design and Debug a Multi-Agent Research Pipeline', body: 'Build coordinator with at least two subagents. Ensure coordinator\'s allowedTools includes "Task". Implement parallel execution (multiple Task calls in one response). Structured output with source attribution. Simulate timeout to test error propagation with structured context. Test conflicting sources — verify synthesis preserves both with attribution.', domains: 'D1, D2, D5' },
  ],
};

// ============================================================
// STORAGE STATE
// ============================================================
const STORAGE_KEY = 'cca-study-v3';
const defaultState = () => ({ sections: {}, flashcards: {}, quizAttempts: [], streak: { current: 0, last: null, days: [] }, createdAt: new Date().toISOString() });
const loadState = async () => { const r = await storage.get(STORAGE_KEY); if (r?.value) { try { return JSON.parse(r.value); } catch (e) {} } return defaultState(); };
const saveState = async (s) => { await storage.set(STORAGE_KEY, JSON.stringify(s)); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const touchStreak = (streak) => {
  const today = todayISO();
  if (streak.last === today) return streak;
  const gap = streak.last ? daysBetween(streak.last, today) : 1;
  const days = [...(streak.days || [])];
  if (!days.includes(today)) days.push(today);
  return { current: gap === 1 ? (streak.current || 0) + 1 : 1, last: today, days: days.slice(-90) };
};

// ============================================================
// METRICS
// ============================================================
const computeMetrics = (state) => {
  const byDomain = {};
  DOMAINS.forEach(d => {
    const flashTotal = (FLASHCARDS[d.id] || []).length;
    const flashMastered = Object.values(state.flashcards || {}).filter(f => f.domain === d.id && f.mastered).length;
    const sectionTotal = (SECTIONS[d.id] || []).length;
    const sectionDone = Object.values(state.sections || {}).filter(s => s.domain === d.id && s.reviewed).length;
    const quizFor = (state.quizAttempts || []).flatMap(a => a.answers.filter(ans => ans.domain === d.id));
    const quizAcc = quizFor.length ? quizFor.filter(a => a.correct).length / quizFor.length : 0;
    const flashRate = flashTotal ? flashMastered / flashTotal : 0;
    const sectionRate = sectionTotal ? sectionDone / sectionTotal : 0;
    const domainScore = flashRate * 0.4 + quizAcc * 0.45 + sectionRate * 0.15;
    byDomain[d.id] = { flashTotal, flashMastered, sectionTotal, sectionDone, quizAcc, flashRate, sectionRate, domainScore, quizCount: quizFor.length };
  });
  const weighted = DOMAINS.filter(d => d.weight > 0);
  const confidence = weighted.reduce((acc, d) => acc + byDomain[d.id].domainScore * (d.weight / 100), 0);
  const streakBonus = Math.min((state.streak?.current || 0) / 14, 1) * 0.05;
  const final = Math.min(confidence + streakBonus, 1);
  const weakest = weighted.reduce((w, d) => byDomain[d.id].domainScore < byDomain[w.id].domainScore ? d : w, weighted[0]);
  return { byDomain, confidence: final, weakest };
};

// ============================================================
// UI
// ============================================================
const Pill = ({ color, children }) => (
  <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: color + '22', color }}>{children}</span>
);
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
    <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wide font-medium mb-2"><Icon size={14} /> {label}</div>
    <div className="text-3xl font-bold" style={{ color: color || '#1E293B' }}>{value}</div>
    {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
  </div>
);

const Dashboard = ({ state, metrics, onGo, onStartWeakQuiz }) => {
  const { byDomain, confidence, weakest } = metrics;
  const pct = Math.round(confidence * 100);
  const confColor = pct >= 80 ? '#0F766E' : pct >= 65 ? '#15803D' : pct >= 50 ? '#C2410C' : pct >= 35 ? '#B45309' : '#991B1B';
  const confLabel = pct >= 80 ? 'Ready to sit the exam' : pct >= 65 ? 'Strong — final drilling' : pct >= 50 ? 'Building momentum' : pct >= 35 ? 'Foundation forming' : 'Early days';
  const quizData = (state.quizAttempts || []).slice(-12).map((a, i) => ({ name: `#${i + 1}`, score: Math.round((a.correct / a.total) * 100) }));
  const domainData = DOMAINS.filter(d => d.weight > 0).map(d => ({ name: d.short, full: d.name, score: Math.round(byDomain[d.id].domainScore * 100), weight: d.weight, color: d.color }));
  const totalMastered = Object.values(state.flashcards || {}).filter(f => f.mastered).length;
  const totalFlash = Object.values(FLASHCARDS).flat().length;
  const totalReviewed = Object.values(state.sections || {}).filter(s => s.reviewed).length;
  const totalSections = Object.values(SECTIONS).flat().length;
  const attempts = (state.quizAttempts || []).length;
  const avgScore = attempts ? Math.round((state.quizAttempts.reduce((a, q) => a + (q.correct / q.total), 0) / attempts) * 100) : 0;
  const streakDays = state.streak?.days || [];
  const grid = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); grid.push({ iso: d.toISOString().slice(0, 10), active: streakDays.includes(d.toISOString().slice(0, 10)) }); }
  const weakestScore = Math.round(byDomain[weakest.id].domainScore * 100);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-stone-50 via-white to-orange-50 rounded-2xl p-6 border border-stone-200 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider font-medium mb-2">Exam Readiness Score</div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="text-6xl font-bold" style={{ color: confColor }}>{pct}<span className="text-3xl">%</span></div>
              <div className="text-stone-600">{confLabel}</div>
            </div>
            <div className="text-xs text-stone-500 mt-2">Weighted by official exam percentages (27/18/20/20/15) + streak bonus</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onGo('read')} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700">Study</button>
            <button onClick={() => onGo('flash')} className="px-4 py-2 bg-white text-stone-900 border border-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50">Flashcards</button>
            <button onClick={() => onGo('quiz')} className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-medium hover:bg-orange-800">Quiz</button>
          </div>
        </div>
      </div>

      {attempts > 0 && weakestScore < 75 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-900">Weakest domain: {weakest.name} ({weakestScore}%)</div>
            <div className="text-sm text-amber-800 mt-1">Worth {weakest.weight}% of the exam. Focus here next.</div>
          </div>
          <button onClick={() => onStartWeakQuiz(weakest.id)} className="px-3 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 whitespace-nowrap">
            <Zap size={14} className="inline mr-1" />Focus Quiz
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Streak" value={state.streak?.current || 0} sub={`${streakDays.length} total days`} color="#C2410C" />
        <StatCard icon={Target} label="Flashcards" value={`${totalMastered}/${totalFlash}`} sub="Mastered" color="#0F766E" />
        <StatCard icon={BookOpen} label="Coverage" value={`${totalReviewed}/${totalSections}`} sub="Sections reviewed" color="#1E40AF" />
        <StatCard icon={Award} label="Quiz Avg" value={attempts ? `${avgScore}%` : '—'} sub={`${attempts} attempts`} color="#7C3AED" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Domain Mastery</h3>
            <span className="text-xs text-stone-500">weighted by exam %</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={domainData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n, p) => [`${v}% (domain weight ${p.payload.weight}%)`, p.payload.full]} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>{domainData.map((d, i) => <rect key={i} fill={d.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 border border-stone-200">
          <h3 className="font-semibold text-stone-800 mb-4">Quiz Score Trend</h3>
          {quizData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={quizData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#C2410C" strokeWidth={2.5} dot={{ r: 4, fill: '#C2410C' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-stone-400 text-sm py-20 text-center">Take a quiz to see your trend</div>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Last 30 Days</h3>
          <span className="text-xs text-stone-500">study activity</span>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}>
          {grid.map(d => <div key={d.iso} title={d.iso} className={`aspect-square rounded ${d.active ? 'bg-orange-600' : 'bg-stone-100'}`} />)}
        </div>
      </div>
    </div>
  );
};

const ReadMode = ({ state, setState }) => {
  const [domainId, setDomainId] = useState('d1');
  const toggle = (id) => {
    const cur = state.sections[id]?.reviewed;
    const next = { ...state, sections: { ...state.sections, [id]: { domain: domainId, reviewed: !cur, when: new Date().toISOString() } }, streak: touchStreak(state.streak || {}) };
    setState(next); saveState(next);
  };
  const domain = DOMAINS.find(d => d.id === domainId);
  const sections = SECTIONS[domainId] || [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map(d => (
          <button key={d.id} onClick={() => setDomainId(d.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${domainId === d.id ? 'text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'}`} style={{ backgroundColor: domainId === d.id ? d.color : undefined }}>
            {d.short} {d.weight > 0 && <span className="opacity-70">({d.weight}%)</span>}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: domain.color }} />
          <div>
            <h2 className="text-2xl font-bold text-stone-900">{domain.name}</h2>
            {domain.weight > 0 && <div className="text-sm text-stone-500">{domain.weight}% of exam · {sections.length} sections</div>}
          </div>
        </div>
        <div className="space-y-4">
          {sections.map(s => {
            const reviewed = state.sections[s.id]?.reviewed;
            return (
              <div key={s.id} className={`p-4 rounded-lg border ${reviewed ? 'bg-teal-50 border-teal-200' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-stone-900">{s.title}</h3>
                  <button onClick={() => toggle(s.id)} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${reviewed ? 'bg-teal-600 text-white' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
                    <CheckCircle2 size={14} /> {reviewed ? 'Reviewed' : 'Mark reviewed'}
                  </button>
                </div>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Flashcards = ({ state, setState }) => {
  const [domainId, setDomainId] = useState('d1');
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = FLASHCARDS[domainId] || [];
  useEffect(() => { setIdx(0); setFlipped(false); }, [domainId]);
  if (!cards.length) return null;
  const card = cards[idx];
  const key = `${domainId}-${idx}`;
  const s = state.flashcards[key];
  const mark = (mastered) => {
    const next = { ...state, flashcards: { ...state.flashcards, [key]: { domain: domainId, mastered, when: new Date().toISOString() } }, streak: touchStreak(state.streak || {}) };
    setState(next); saveState(next);
    if (idx < cards.length - 1) { setIdx(idx + 1); setFlipped(false); }
  };
  const domain = DOMAINS.find(d => d.id === domainId);
  const masteredCount = cards.filter((_, i) => state.flashcards[`${domainId}-${i}`]?.mastered).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map(d => {
          const count = (FLASHCARDS[d.id] || []).length;
          const mc = (FLASHCARDS[d.id] || []).filter((_, i) => state.flashcards[`${d.id}-${i}`]?.mastered).length;
          return (
            <button key={d.id} onClick={() => setDomainId(d.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${domainId === d.id ? 'text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'}`} style={{ backgroundColor: domainId === d.id ? d.color : undefined }}>
              {d.short} <span className="opacity-70">({mc}/{count})</span>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="text-stone-500">Card {idx + 1} of {cards.length}</div>
          <div className="flex items-center gap-2">
            <Pill color={domain.color}>{masteredCount}/{cards.length} mastered</Pill>
            {s?.mastered && <Pill color="#0F766E">✓</Pill>}
          </div>
        </div>
        <div onClick={() => setFlipped(!flipped)} className="min-h-[280px] rounded-xl border-2 border-stone-200 bg-gradient-to-br from-stone-50 to-white p-8 flex items-center justify-center cursor-pointer hover:border-stone-300">
          <div className="text-center max-w-2xl">
            {!flipped ? (
              <>
                <div className="text-xs uppercase tracking-wider text-stone-400 mb-4">Question</div>
                <div className="text-xl font-semibold text-stone-900 leading-relaxed">{card.q}</div>
                <div className="text-xs text-stone-400 mt-6">Click to reveal</div>
              </>
            ) : (
              <>
                <div className="text-xs uppercase tracking-wider text-stone-400 mb-4">Answer</div>
                <div className="text-lg text-stone-800 leading-relaxed">{card.a}</div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 gap-2 flex-wrap">
          <button onClick={() => { setIdx(Math.max(0, idx - 1)); setFlipped(false); }} disabled={idx === 0} className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-30">
            <ChevronLeft size={16} /> Previous
          </button>
          {flipped && (
            <div className="flex gap-2">
              <button onClick={() => mark(false)} className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200"><RotateCcw size={14} /> Review again</button>
              <button onClick={() => mark(true)} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"><CheckCircle2 size={14} /> Got it</button>
            </div>
          )}
          <button onClick={() => { setIdx(Math.min(cards.length - 1, idx + 1)); setFlipped(false); }} disabled={idx === cards.length - 1} className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-30">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Quiz = ({ state, setState, initialFilter, onConsumeInitial }) => {
  const [mode, setMode] = useState(initialFilter ? 'quiz-starting' : 'setup');
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [size, setSize] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showExp, setShowExp] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      const pool = QUIZ.filter(q => q.d === initialFilter);
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(shuffled); setIdx(0); setAnswers([]); setSelected(null); setShowExp(false); setMode('quiz');
      onConsumeInitial?.();
    }
  }, [initialFilter]);

  const start = () => {
    let pool = filter === 'all' ? QUIZ : QUIZ.filter(q => q.d === filter);
    if (officialOnly) pool = pool.filter(q => q.official);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(size, pool.length));
    setQuestions(shuffled); setIdx(0); setAnswers([]); setSelected(null); setShowExp(false); setMode('quiz');
  };

  const submit = () => {
    const q = questions[idx];
    setAnswers([...answers, { domain: q.d, correct: selected === q.correct, selected, q: q.q, official: q.official }]);
    setShowExp(true);
  };

  const next = () => {
    if (idx + 1 < questions.length) { setIdx(idx + 1); setSelected(null); setShowExp(false); }
    else {
      const correct = answers.filter(a => a.correct).length;
      const attempt = { when: new Date().toISOString(), correct, total: questions.length, answers, filter, officialOnly };
      const updated = { ...state, quizAttempts: [...(state.quizAttempts || []), attempt], streak: touchStreak(state.streak || {}) };
      setState(updated); saveState(updated); setMode('results');
    }
  };

  if (mode === 'setup' || mode === 'quiz-starting') {
    const officialCount = QUIZ.filter(q => q.official).length;
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">New Practice Quiz</h2>
        <p className="text-stone-600 mb-6">Real exam: 60 questions in 120 min, passing at 720/1000. This pool: {QUIZ.length} questions including {officialCount} verbatim from the official Anthropic exam guide.</p>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Domain</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>All</button>
              {DOMAINS.map(d => (
                <button key={d.id} onClick={() => setFilter(d.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === d.id ? 'text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`} style={{ backgroundColor: filter === d.id ? d.color : undefined }}>
                  {d.short}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Question source</label>
            <div className="flex gap-2">
              <button onClick={() => setOfficialOnly(false)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!officialOnly ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>All questions ({QUIZ.length})</button>
              <button onClick={() => setOfficialOnly(true)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${officialOnly ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                <Shield size={12} /> Official only ({officialCount})
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Length</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 20, 60, 999].map(n => (
                <button key={n} onClick={() => setSize(n)} className={`px-4 py-2 rounded-lg text-sm font-medium ${size === n ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                  {n === 999 ? 'All' : n === 60 ? '60 (exam sim)' : n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={start} className="w-full py-3 bg-orange-700 text-white rounded-lg font-medium hover:bg-orange-800">Start Quiz</button>
        </div>
      </div>
    );
  }

  if (mode === 'results') {
    const correct = answers.filter(a => a.correct).length;
    const pct = Math.round((correct / answers.length) * 100);
    const byD = {};
    answers.forEach(a => { if (!byD[a.domain]) byD[a.domain] = { c: 0, t: 0 }; byD[a.domain].t++; if (a.correct) byD[a.domain].c++; });
    const passing = pct >= 72;
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Quiz Complete</h2>
        <div className="text-6xl font-bold my-6" style={{ color: passing ? '#0F766E' : pct >= 50 ? '#C2410C' : '#991B1B' }}>{pct}%</div>
        <div className="text-stone-600 mb-6">{correct} of {answers.length} correct{passing && ' — above 720/1000 passing threshold'}</div>
        <div className="space-y-2 mb-6">
          {Object.entries(byD).map(([dId, v]) => {
            const d = DOMAINS.find(x => x.id === dId);
            const dp = Math.round((v.c / v.t) * 100);
            return (
              <div key={dId} className="flex items-center gap-3">
                <div className="w-44 text-sm text-stone-700 truncate">{d.short}</div>
                <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${dp}%`, backgroundColor: d.color }} /></div>
                <div className="text-sm text-stone-600 w-16 text-right">{v.c}/{v.t}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setMode('setup')} className="flex-1 py-2.5 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-700">New Quiz</button>
          <button onClick={() => setMode('review')} className="flex-1 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50">Review Answers</button>
        </div>
      </div>
    );
  }

  if (mode === 'review') {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Answer Review</h2>
          <button onClick={() => setMode('setup')} className="px-3 py-1.5 text-sm bg-stone-900 text-white rounded-lg">New Quiz</button>
        </div>
        {answers.map((a, i) => {
          const q = questions[i];
          return (
            <div key={i} className={`bg-white rounded-xl border-2 p-5 ${a.correct ? 'border-teal-200' : 'border-red-200'}`}>
              <div className="flex items-start gap-2 mb-3">
                {a.correct ? <CheckCircle2 className="text-teal-600 flex-shrink-0 mt-0.5" size={20} /> : <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />}
                <div className="flex-1">
                  {q.official && <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded mb-1">OFFICIAL</span>}
                  <div className="font-medium text-stone-900">{q.q}</div>
                </div>
              </div>
              <div className="space-y-1.5 ml-7 mb-3">
                {q.opts.map((o, oi) => (
                  <div key={oi} className={`text-sm px-3 py-1.5 rounded ${oi === q.correct ? 'bg-teal-50 text-teal-900 font-medium' : oi === a.selected ? 'bg-red-50 text-red-900' : 'text-stone-600'}`}>
                    {String.fromCharCode(65 + oi)}. {o}
                  </div>
                ))}
              </div>
              <div className="ml-7 text-sm text-stone-600 bg-stone-50 p-3 rounded"><strong>Why:</strong> {q.exp}</div>
            </div>
          );
        })}
      </div>
    );
  }

  const q = questions[idx];
  if (!q) return null;
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span>Q{idx + 1} of {questions.length}</span>
          {q.official && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1"><Shield size={10} />OFFICIAL</span>}
          {q.sc && <span className="text-xs text-stone-500">· {q.sc}</span>}
        </div>
        <Pill color={DOMAINS.find(d => d.id === q.d).color}>{DOMAINS.find(d => d.id === q.d).short}</Pill>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-1.5 mb-6">
        <div className="h-full bg-orange-600 rounded-full" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>
      <h3 className="text-base md:text-lg font-semibold text-stone-900 mb-5 leading-relaxed">{q.q}</h3>
      <div className="space-y-2 mb-5">
        {q.opts.map((o, oi) => {
          const isSel = selected === oi;
          const isCorr = showExp && oi === q.correct;
          const isWrong = showExp && isSel && oi !== q.correct;
          return (
            <button key={oi} onClick={() => !showExp && setSelected(oi)} disabled={showExp} className={`w-full text-left p-3 rounded-lg border-2 ${isCorr ? 'bg-teal-50 border-teal-500' : isWrong ? 'bg-red-50 border-red-400' : isSel ? 'bg-orange-50 border-orange-400' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-stone-500 text-sm mt-0.5">{String.fromCharCode(65 + oi)}</span>
                <span className="text-stone-900 text-sm">{o}</span>
              </div>
            </button>
          );
        })}
      </div>
      {showExp && (
        <div className="p-4 bg-stone-50 rounded-lg mb-4 border border-stone-200">
          <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-1">Explanation</div>
          <div className="text-sm text-stone-800 leading-relaxed">{q.exp}</div>
        </div>
      )}
      <div className="flex justify-end">
        {!showExp ? (
          <button onClick={submit} disabled={selected === null} className="px-5 py-2 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-30">Submit</button>
        ) : (
          <button onClick={next} className="px-5 py-2 bg-orange-700 text-white rounded-lg font-medium hover:bg-orange-800">{idx + 1 < questions.length ? 'Next' : 'Results'}</button>
        )}
      </div>
    </div>
  );
};

const ExamInfo = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-8">
      <h2 className="text-3xl font-bold mb-2">Claude Certified Architect — Foundations</h2>
      <p className="text-stone-300">Anthropic's first architecture-level certification. All content below verified against the official Anthropic exam guide.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Format</div><div className="text-stone-900 text-sm">{EXAM_INFO.format}</div></div>
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Passing</div><div className="text-stone-900 text-sm">{EXAM_INFO.passing}</div></div>
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Scenarios</div><div className="text-stone-900 text-sm">{EXAM_INFO.scenarios}</div></div>
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Proctoring</div><div className="text-stone-900 text-sm">{EXAM_INFO.proctor}</div></div>
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Target Candidate</div><div className="text-stone-900 text-sm">{EXAM_INFO.experience}</div></div>
      <div className="bg-white rounded-xl p-5 border border-stone-200"><div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Score Report</div><div className="text-stone-900 text-sm">{EXAM_INFO.scoreReport}</div></div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <h3 className="font-bold text-stone-900 mb-4">Domain Weights</h3>
      <div className="space-y-3">
        {DOMAINS.filter(d => d.weight > 0).map(d => (
          <div key={d.id} className="flex items-center gap-3">
            <div className="w-64 text-sm text-stone-700">{d.name}</div>
            <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.weight * 3.7}%`, backgroundColor: d.color }} /></div>
            <div className="text-sm font-semibold text-stone-900 w-10 text-right">{d.weight}%</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <h3 className="font-bold text-stone-900 mb-4">The 6 Scenarios (4 per exam)</h3>
      <div className="space-y-3">
        {EXAM_INFO.scenarioList.map((s, i) => (
          <div key={i} className="p-3 bg-stone-50 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="font-bold text-orange-700 text-sm">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap"><div className="font-semibold text-stone-900 text-sm">{s.name}</div><span className="text-xs text-stone-500">{s.domains}</span></div>
                <div className="text-sm text-stone-600 mt-0.5">{s.gist}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <div className="flex items-center gap-2 mb-4"><ListChecks className="text-teal-700" size={20} /><h3 className="font-bold text-stone-900">In Scope</h3></div>
      <ul className="space-y-1 text-sm text-stone-700">{EXAM_INFO.inScope.map((t, i) => <li key={i} className="flex items-start gap-2"><span className="text-teal-600 flex-shrink-0">✓</span>{t}</li>)}</ul>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <div className="flex items-center gap-2 mb-4"><XCircle className="text-red-700" size={20} /><h3 className="font-bold text-stone-900">Out of Scope (don't waste time)</h3></div>
      <ul className="space-y-1 text-sm text-stone-700">{EXAM_INFO.outOfScope.map((t, i) => <li key={i} className="flex items-start gap-2"><span className="text-red-600 flex-shrink-0">✗</span>{t}</li>)}</ul>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">⚠ The official guide explicitly lists "prompt caching implementation details (beyond knowing it exists)" as out of scope. Don't memorize TTLs, breakpoint math, or cache_creation_input_tokens — just know the concept.</div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <div className="flex items-center gap-2 mb-4"><FileText className="text-indigo-700" size={20} /><h3 className="font-bold text-stone-900">Hands-On Prep Exercises (from the exam guide)</h3></div>
      <div className="space-y-3">
        {EXAM_INFO.exercises.map((e, i) => (
          <div key={i} className="p-3 bg-stone-50 rounded-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1"><div className="font-semibold text-stone-900 text-sm">{i + 1}. {e.title}</div><span className="text-xs text-stone-500">{e.domains}</span></div>
            <div className="text-sm text-stone-600">{e.body}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <h3 className="font-bold text-stone-900 mb-4">How to Access the Exam</h3>
      <ol className="space-y-3">
        {['Create an Anthropic Skilljar account using your partner/company email', 'Study using these tabs + Anthropic Academy courses (Building with Claude API is the flagship)', 'Take the official Skilljar practice exam — unlimited retakes; aim for 900+ before the real one', 'Complete the EAP attestation at anthropic.skilljar.com (must be logged in with partner email)', 'Access the EAP exam — recording-based proctoring, take it on your schedule'].map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
            <div className="text-sm text-stone-800">{s}</div>
          </li>
        ))}
      </ol>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <h3 className="font-bold text-stone-900 mb-3">Anthropic Academy Courses</h3>
      <div className="space-y-1.5 text-sm">
        {[{ name: 'Building with the Claude API (flagship, ~8.1hr)', url: 'https://anthropic.skilljar.com/claude-with-the-anthropic-api' }, { name: 'Introduction to Model Context Protocol', url: 'https://anthropic.skilljar.com/introduction-to-model-context-protocol' }, { name: 'Model Context Protocol: Advanced Topics', url: 'https://anthropic.skilljar.com/model-context-protocol-advanced-topics' }, { name: 'Introduction to Subagents', url: 'https://anthropic.skilljar.com/introduction-to-subagents' }, { name: 'Introduction to Agent Skills', url: 'https://anthropic.skilljar.com/introduction-to-agent-skills' }, { name: 'Claude Code in Action', url: 'https://anthropic.skilljar.com/claude-code-in-action' }, { name: 'Claude 101', url: 'https://anthropic.skilljar.com/claude-101' }].map(r => <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-orange-700 hover:underline">• {r.name}</a>)}
      </div>
    </div>

    <div className="bg-white rounded-xl p-6 border border-stone-200">
      <h3 className="font-bold text-stone-900 mb-3">Key Documentation</h3>
      <div className="space-y-1.5 text-sm">
        {[{ name: 'Official Exam Guide (PDF)', url: 'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F8lsy243ftffjjy1cx9lm3o2bw%2Fpublic%2F1773274827%2FClaude+Certified+Architect+%E2%80%93+Foundations+Certification+Exam+Guide.pdf' }, { name: 'Messages API', url: 'https://docs.claude.com/en/api/messages' }, { name: 'Tool Use', url: 'https://docs.claude.com/en/docs/build-with-claude/tool-use/overview' }, { name: 'Message Batches', url: 'https://docs.claude.com/en/docs/build-with-claude/batch-processing' }, { name: 'Agent SDK Overview', url: 'https://platform.claude.com/docs/en/agent-sdk/overview' }, { name: 'Agent SDK Hooks', url: 'https://platform.claude.com/docs/en/agent-sdk/hooks' }, { name: 'Agent SDK Subagents', url: 'https://platform.claude.com/docs/en/agent-sdk/subagents' }, { name: 'Claude Code Memory/CLAUDE.md', url: 'https://code.claude.com/docs/en/memory' }, { name: 'Claude Code Headless', url: 'https://code.claude.com/docs/en/headless' }, { name: 'Claude Code MCP', url: 'https://code.claude.com/docs/en/mcp' }, { name: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/' }].map(r => <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-orange-700 hover:underline">• {r.name}</a>)}
      </div>
    </div>
  </div>
);

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [state, setState] = useState(defaultState());
  const [loaded, setLoaded] = useState(false);
  const [quizFilter, setQuizFilter] = useState(null);
  useEffect(() => { (async () => { const s = await loadState(); setState(s); setLoaded(true); })(); }, []);
  const metrics = useMemo(() => computeMetrics(state), [state]);
  const reset = async () => { if (!confirm('Reset all study progress?')) return; const fresh = defaultState(); setState(fresh); await saveState(fresh); };
  const startWeakQuiz = (domainId) => { setQuizFilter(domainId); setTab('quiz'); };
  if (!loaded) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500">Loading your progress...</div>;
  const tabs = [{ id: 'dashboard', label: 'Dashboard', icon: Home }, { id: 'read', label: 'Read & Review', icon: BookOpen }, { id: 'flash', label: 'Flashcards', icon: Layers }, { id: 'quiz', label: 'Practice Quiz', icon: CheckSquare }, { id: 'exam', label: 'Exam Info', icon: Info }];
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white font-bold">C</div>
            <div>
              <div className="font-bold text-stone-900">CCA-F Study</div>
              <div className="text-xs text-stone-500">Claude Certified Architect — Foundations</div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map(t => { const Icon = t.icon; return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                <Icon size={15} /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            ); })}
            <button onClick={reset} title="Reset progress" className="ml-1 p-2 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-lg"><RefreshCw size={15} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard state={state} metrics={metrics} onGo={setTab} onStartWeakQuiz={startWeakQuiz} />}
        {tab === 'read' && <ReadMode state={state} setState={setState} />}
        {tab === 'flash' && <Flashcards state={state} setState={setState} />}
        {tab === 'quiz' && <Quiz state={state} setState={setState} initialFilter={quizFilter} onConsumeInitial={() => setQuizFilter(null)} />}
        {tab === 'exam' && <ExamInfo />}
      </main>
      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-stone-400">
        Independent study resource. Not affiliated with Anthropic. Content verified against the official Anthropic CCA-F exam guide (v0.1, Feb 2026), SDK docs, and MCP spec. 12 sample questions reproduced from the publicly-available official exam guide PDF.
      </footer>
    </div>
  );
}
