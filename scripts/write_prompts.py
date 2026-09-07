import pathlib
ROOT = pathlib.Path(r"C:\Users\moham\Desktop\Vibe\Codex\Kinetra")
BASE = ROOT / "packages" / "core" / "src"
(BASE / "prompts").mkdir(parents=True, exist_ok=True)

TEMPLATES = r'''/**
 * Prompt templates.
 *
 * The orchestrator and skills compose prompts from small, named fragments.
 * Keeping them in one place makes the system auditable and lets us
 * regression-test for accidental prompt drift.
 */

import { KinetraError } from "../errors.js";

export type PromptName =
  | "tutor.ask"
  | "tutor.explain"
  | "tutor.hint"
  | "research.search"
  | "research.summarize"
  | "exam.generate"
  | "exam.grade"
  | "flashcards.generate"
  | "study-plan.build";

export interface PromptContext {
  topic: string;
  course?: string;
  sources?: string;
  history?: string;
  studentLevel?: "intro" | "undergrad" | "grad";
}

export interface PromptTemplate {
  name: PromptName;
  system: string;
  build: (ctx: PromptContext) => string;
}

const SYSTEM_TUTOR = `You are Kinetra, a careful technical tutor. You always
ground answers in the supplied sources. You cite them inline using [n]
notation. You do not invent equations or numeric results. If you are
unsure, say so explicitly.`;

const SYSTEM_RESEARCH = `You are Kinetra, a technical research assistant.
Summarize from the supplied sources only. Do not introduce external facts.
Always preserve citations.`;

const SYSTEM_EXAM_GEN = `You are an exam author. Produce questions that are
clear, unambiguous, and unambiguously answerable from the source material.
Use only standard notation.`;

const SYSTEM_GRADER = `You are a strict but fair grader. Compare the
student answer to the model solution and the source excerpts. Award
partial credit explicitly. Output a JSON object with keys: score, feedback,
citation.`;

export const TEMPLATES: Record<PromptName, PromptTemplate> = {
  "tutor.ask": {
    name: "tutor.ask",
    system: SYSTEM_TUTOR,
    build: (c) =>
      `Topic: ${c.topic}\nCourse: ${c.course ?? "(unspecified)"}\n` +
      (c.history ? `Recent history:\n${c.history}\n` : "") +
      (c.sources ? `Sources:\n${c.sources}\n` : "") +
      `\nAnswer the student's question. Cite sources as [n].`,
  },
  "tutor.explain": {
    name: "tutor.explain",
    system: SYSTEM_TUTOR,
    build: (c) =>
      `Explain "${c.topic}" at a ${c.studentLevel ?? "undergrad"} level.\n` +
      (c.sources ? `Ground the explanation in:\n${c.sources}\n` : ""),
  },
  "tutor.hint": {
    name: "tutor.hint",
    system: SYSTEM_TUTOR,
    build: (c) =>
      `Provide a single short hint for "${c.topic}" without revealing the answer. ` +
      `If the student has already had ${"${0}"} hints, give a stronger nudge.`,
  },
  "research.search": {
    name: "research.search",
    system: SYSTEM_RESEARCH,
    build: (c) =>
      `Find the most relevant passages on: ${c.topic}\n` +
      (c.sources ? `Restrict to:\n${c.sources}` : "Use any available source."),
  },
  "research.summarize": {
    name: "research.summarize",
    system: SYSTEM_RESEARCH,
    build: (c) =>
      `Summarize the supplied excerpts on ${c.topic}. Keep every citation.`,
  },
  "exam.generate": {
    name: "exam.generate",
    system: SYSTEM_EXAM_GEN,
    build: (c) =>
      `Generate 5 questions of mixed difficulty on ${c.topic}.\n` +
      `Include a model answer and a citation for each.\n` +
      (c.sources ? `Source corpus:\n${c.sources}` : ""),
  },
  "exam.grade": {
    name: "exam.grade",
    system: SYSTEM_GRADER,
    build: (c) =>
      `Topic: ${c.topic}\nModel solution:\n${c.sources ?? "(none provided)"}\n` +
      `Student answer:\n${c.history ?? "(empty)"}\nGrade it.`,
  },
  "flashcards.generate": {
    name: "flashcards.generate",
    system: SYSTEM_TUTOR,
    build: (c) =>
      `Generate 10 flashcards on ${c.topic}. Each card: front (a question) and back (a precise answer).`,
  },
  "study-plan.build": {
    name: "study-plan.build",
    system: SYSTEM_TUTOR,
    build: (c) =>
      `Build a 2-week study plan covering ${c.topic}. Weight topics by the student's weakest areas.`,
  },
};

export function getTemplate(name: PromptName): PromptTemplate {
  const t = TEMPLATES[name];
  if (!t) throw new KinetraError("validation", `Unknown prompt template: ${name}`, { name });
  return t;
}

export function render(name: PromptName, ctx: PromptContext): { system: string; user: string } {
  const t = getTemplate(name);
  return { system: t.system, user: t.build(ctx) };
}
'''

(BASE / "prompts" / "templates.ts").write_text(TEMPLATES, encoding="utf-8")

SANITIZE = r'''/**
 * Prompt injection defense.
 *
 * Treats retrieved text strictly as data. The sanitizer strips or escapes
 * control sequences that can be abused to override system instructions,
 * and detects well-known injection patterns so callers can refuse to feed
 * the source to the model.
 */

import { KinetraError } from "../errors.js";

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /ignore (?:all )?(?:previous|prior) (?:instructions?|prompts?)/i,
  /disregard (?:the )?(?:system|above) (?:prompt|message)/i,
  /you are now (?:a|an|the) [^\n.]{1,60}/i,
  /reveal (?:your|the) (?:system|hidden) (?:prompt|instructions?)/i,
  /print (?:your|the) (?:system|initial) (?:prompt|message)/i,
  /<\s*system\s*>/i,
];

export interface SanitizationResult {
  text: string;
  hadInjection: boolean;
  patterns: string[];
}

/**
 * Strip control characters (except newlines), collapse excessive whitespace,
 * and mark suspiciously instruction-like phrases.
 */
export function sanitize(text: string): SanitizationResult {
  if (typeof text !== "string") {
    throw new KinetraError("validation", "sanitize() expects a string", { got: typeof text });
  }
  let out = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Neutralize markdown headings that pretend to be system messages.
  out = out.replace(/^#{1,6}\s*system\s*[:\-]/gim, "# ");
  const patterns: string[] = [];
  for (const pat of SUSPICIOUS_PATTERNS) {
    if (pat.test(out)) {
      patterns.push(pat.source);
      // Replace the trigger with a bracketed marker so the model can see
      // that the surrounding source was flagged, without obeying it.
      out = out.replace(pat, "[injection-flag]");
    }
  }
  return { text: out, hadInjection: patterns.length > 0, patterns };
}

/**
 * Hard refusal: throws if any pattern matches. Use when the caller cannot
 * tolerate even a flagged document reaching the model.
 */
export function assertSafe(text: string): void {
  const res = sanitize(text);
  if (res.hadInjection) {
    throw new KinetraError("security", "Source text contains prompt-injection markers", {
      patterns: res.patterns,
    });
  }
}

/**
 * Wraps user-controlled text in a clearly-labelled block so the model can
 * distinguish retrieved content from instructions.
 */
export function fenceAsContext(text: string, label: string = "source"): string {
  return `<<<${label}>>>\n${text}\n<<</${label}>>>`;
}
'''

(BASE / "prompts" / "sanitize.ts").write_text(SANITIZE, encoding="utf-8")
print("wrote prompts/templates.ts and prompts/sanitize.ts")