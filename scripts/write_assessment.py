import pathlib
ROOT = pathlib.Path(r"C:\Users\moham\Desktop\Vibe\Codex\Kinetra")
BASE = ROOT / "packages" / "core" / "src"
(BASE / "assessment").mkdir(parents=True, exist_ok=True)

QUIZ = r'''/**
 * Quiz generation.
 *
 * Builds deterministic quizzes from a topic description and a list of
 * candidate questions. Each question carries a difficulty, an answer key,
 * and a citation reference.
 */

import { KinetraError } from "../errors.js";
import { newPrefixedId } from "../utils/id.js";
import type { SourceRef } from "../types.js";

export type QuizDifficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  prompt: string;
  answer: string;
  difficulty: QuizDifficulty;
  topicId?: string;
  source?: SourceRef;
  rationale?: string;
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  topicId?: string;
  createdAt: string;
  questions: QuizQuestion[];
}

export interface QuizSeed {
  topic: string;
  courseId: string;
  topicId?: string;
  source?: SourceRef;
  /**
   * Pre-authored questions, if any. If absent the caller must compose
   * questions through a generator pipeline.
   */
  questions?: Array<Omit<QuizQuestion, "id">>;
  difficulty?: QuizDifficulty;
}

export function createQuiz(seed: QuizSeed): Quiz {
  if (!seed.topic) throw new KinetraError("validation", "Quiz topic is required");
  if (!seed.courseId) throw new KinetraError("validation", "Quiz courseId is required");
  const questions: QuizQuestion[] = (seed.questions ?? []).map((q) => ({
    ...q,
    id: newPrefixedId("q"),
    difficulty: q.difficulty ?? seed.difficulty ?? "medium",
    topicId: q.topicId ?? seed.topicId,
    source: q.source ?? seed.source,
  }));
  return {
    id: newPrefixedId("quiz"),
    title: `${seed.topic} quiz`,
    courseId: seed.courseId,
    topicId: seed.topicId,
    createdAt: new Date().toISOString(),
    questions,
  };
}

export function pickQuestions(
  quiz: Quiz,
  count: number,
  strategy: "sequential" | "shuffle" | "hardest-first" = "shuffle",
): QuizQuestion[] {
  if (count <= 0) return [];
  let pool = [...quiz.questions];
  if (strategy === "hardest-first") {
    const order: QuizDifficulty[] = ["hard", "medium", "easy"];
    pool.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
  } else if (strategy === "shuffle") {
    // Deterministic shuffle keyed by quiz.id so the same quiz yields the same
    // order on every call. Useful for repeatable study sessions.
    const seed = quiz.id;
    pool.sort((a, b) => (seedHash(seed + a.id) - seedHash(seed + b.id)));
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function seedHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gradeQuiz(
  quiz: Quiz,
  responses: Record<string, string>,
): { correct: number; total: number; perQuestion: Record<string, boolean> } {
  const perQuestion: Record<string, boolean> = {};
  let correct = 0;
  for (const q of quiz.questions) {
    const a = responses[q.id];
    const ok = a !== undefined && normalize(a) === normalize(q.answer);
    perQuestion[q.id] = ok;
    if (ok) correct++;
  }
  return { correct, total: quiz.questions.length, perQuestion };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
'''

(BASE / "assessment" / "quiz.ts").write_text(QUIZ, encoding="utf-8")

EXAM = r'''/**
 * Exam generation.
 *
 * Exams are quizzes with a fixed order, an overall time budget, and a
 * section breakdown. They may contain multiple sections (e.g. multiple
 * choice + free response + circuit).
 */

import { KinetraError } from "../errors.js";
import { newPrefixedId } from "../utils/id.js";
import type { Quiz, QuizQuestion } from "./quiz.js";

export interface ExamSection {
  id: string;
  title: string;
  weight: number; // 0..1
  questions: QuizQuestion[];
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  topicId?: string;
  durationMin: number;
  sections: ExamSection[];
  totalWeight: number;
  createdAt: string;
}

export interface ExamSeed {
  title: string;
  courseId: string;
  topicId?: string;
  durationMin: number;
  sections: Array<{ title: string; weight: number; questions: QuizQuestion[] }>;
}

export function createExam(seed: ExamSeed): Exam {
  if (!seed.title) throw new KinetraError("validation", "Exam title is required");
  if (seed.durationMin <= 0) throw new KinetraError("validation", "Exam duration must be > 0", { durationMin: seed.durationMin });
  let total = 0;
  for (const s of seed.sections) total += s.weight;
  if (total <= 0) throw new KinetraError("validation", "Section weights must sum > 0");
  const sections: ExamSection[] = seed.sections.map((s) => ({
    id: newPrefixedId("sec"),
    title: s.title,
    weight: s.weight,
    questions: s.questions,
  }));
  return {
    id: newPrefixedId("exam"),
    title: seed.title,
    courseId: seed.courseId,
    topicId: seed.topicId,
    durationMin: seed.durationMin,
    sections,
    totalWeight: total,
    createdAt: new Date().toISOString(),
  };
}

export function sectionScore(exam: Exam, sectionId: string, responses: Record<string, string>): number {
  const sec = exam.sections.find((s) => s.id === sectionId);
  if (!sec) throw new KinetraError("missing", `Section not found: ${sectionId}`);
  let correct = 0;
  for (const q of sec.questions) {
    const r = responses[q.id];
    if (r !== undefined && r.trim().toLowerCase() === q.answer.trim().toLowerCase()) correct++;
  }
  return correct;
}

export function toQuiz(exam: Exam, sectionId?: string): Quiz {
  const qs = sectionId
    ? (exam.sections.find((s) => s.id === sectionId)?.questions ?? [])
    : exam.sections.flatMap((s) => s.questions);
  return {
    id: newPrefixedId("quiz"),
    title: sectionId ? `${exam.title} (${sectionId})` : `${exam.title} (all)`,
    courseId: exam.courseId,
    topicId: exam.topicId,
    createdAt: exam.createdAt,
    questions: qs,
  };
}
'''

(BASE / "assessment" / "exam.ts").write_text(EXAM, encoding="utf-8")

GRADING = r'''/**
 * Grading helpers.
 *
 * Generic scoring utilities shared by quizzes, exams, and free-form
 * assignments. The AI grader (when configured) returns a structured
 * payload via the provider layer; this module reduces those payloads into
 * numeric scores for the mastery tracker.
 */

import { KinetraError } from "../errors.js";

export type GradingBand = "A" | "B" | "C" | "D" | "F";

export interface GradeResult {
  score: number; // 0..1
  band: GradingBand;
  feedback: string;
  citation?: string;
  partialCredit: number; // 0..1
}

export function bandFor(score: number): GradingBand {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export interface RawGraderPayload {
  score?: unknown;
  feedback?: unknown;
  citation?: unknown;
  partialCredit?: unknown;
}

export function normalizeGraderPayload(raw: unknown): GradeResult {
  if (!raw || typeof raw !== "object") {
    throw new KinetraError("parse", "Grader payload is not an object", { got: typeof raw });
  }
  const p = raw as RawGraderPayload;
  const score = Number(p.score);
  if (!Number.isFinite(score)) {
    throw new KinetraError("parse", "Grader score is not finite", { score: p.score });
  }
  const clamped = Math.max(0, Math.min(1, score));
  const feedback = typeof p.feedback === "string" ? p.feedback : "";
  const citation = typeof p.citation === "string" ? p.citation : undefined;
  const partialCredit = Number.isFinite(Number(p.partialCredit))
    ? Math.max(0, Math.min(1, Number(p.partialCredit)))
    : clamped;
  return { score: clamped, band: bandFor(clamped), feedback, citation, partialCredit };
}

export function combineScores(parts: number[], weights: number[]): number {
  if (parts.length !== weights.length) {
    throw new KinetraError("validation", "parts and weights length mismatch", { parts: parts.length, weights: weights.length });
  }
  let totalWeight = 0;
  for (const w of weights) totalWeight += w;
  if (totalWeight <= 0) throw new KinetraError("validation", "weights must be > 0");
  let acc = 0;
  for (let i = 0; i < parts.length; i++) {
    acc += Math.max(0, Math.min(1, parts[i])) * weights[i];
  }
  return acc / totalWeight;
}
'''

(BASE / "assessment" / "grading.ts").write_text(GRADING, encoding="utf-8")

FLASHCARDS = r'''/**
 * Flashcards.
 *
 * Simple spaced-repetition deck model with a deterministic SM-2-style
 * scheduler. Each card carries a front (prompt) and back (answer) and a
 * per-card state (ease, interval, due date).
 */

import { KinetraError } from "../errors.js";
import { newPrefixedId } from "../utils/id.js";
import type { SourceRef } from "../types.js";

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  topicId?: string;
  source?: SourceRef;
  /** SM-2 ease factor; starts at 2.5 and is clamped >= 1.3. */
  ease: number;
  /** Days until next review after the most recent rating. */
  intervalDays: number;
  /** ISO date when this card is next due. */
  dueAt: string;
  /** Number of consecutive successful reviews. */
  reps: number;
  /** Total reviews. */
  reviews: number;
}

export interface Deck {
  id: string;
  title: string;
  courseId: string;
  topicId?: string;
  createdAt: string;
  cards: FlashCard[];
}

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export function createDeck(seed: {
  title: string;
  courseId: string;
  topicId?: string;
  cards: Array<{ front: string; back: string; topicId?: string; source?: SourceRef }>;
}): Deck {
  if (!seed.title) throw new KinetraError("validation", "Deck title is required");
  if (!seed.courseId) throw new KinetraError("validation", "Deck courseId is required");
  const now = new Date();
  return {
    id: newPrefixedId("deck"),
    title: seed.title,
    courseId: seed.courseId,
    topicId: seed.topicId,
    createdAt: now.toISOString(),
    cards: seed.cards.map((c) => ({
      id: newPrefixedId("card"),
      front: c.front,
      back: c.back,
      topicId: c.topicId ?? seed.topicId,
      source: c.source,
      ease: 2.5,
      intervalDays: 0,
      dueAt: now.toISOString(),
      reps: 0,
      reviews: 0,
    })),
  };
}

/**
 * SM-2 update. grade is 0..5 (0 = total blackout, 5 = perfect).
 * Grades < 3 reset reps and bring the card due today.
 */
export function review(card: FlashCard, grade: ReviewGrade, now: Date = new Date()): FlashCard {
  if (!Number.isInteger(grade) || grade < 0 || grade > 5) {
    throw new KinetraError("validation", "grade must be 0..5", { grade });
  }
  let { ease, intervalDays, reps } = card;
  if (grade < 3) {
    reps = 0;
    intervalDays = 1;
  } else {
    if (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    reps += 1;
    const q = gradeToQuality(grade);
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const due = new Date(now.getTime() + intervalDays * 86400000);
  return { ...card, ease, intervalDays, reps, reviews: card.reviews + 1, dueAt: due.toISOString() };
}

function gradeToQuality(g: ReviewGrade): number {
  if (g <= 1) return 1;
  if (g === 2) return 2;
  if (g === 3) return 3;
  if (g === 4) return 4;
  return 5;
}

export function dueCards(deck: Deck, now: Date = new Date()): FlashCard[] {
  return deck.cards.filter((c) => new Date(c.dueAt).getTime() <= now.getTime());
}

export function applyReviews(deck: Deck, updates: Array<{ cardId: string; grade: ReviewGrade }>, now: Date = new Date()): Deck {
  const idx = new Map(deck.cards.map((c) => [c.id, c]));
  for (const u of updates) {
    const card = idx.get(u.cardId);
    if (!card) throw new KinetraError("missing", `Card not found: ${u.cardId}`);
    idx.set(card.id, review(card, u.grade, now));
  }
  return { ...deck, cards: [...idx.values()] };
}
'''

(BASE / "assessment" / "flashcards.ts").write_text(FLASHCARDS, encoding="utf-8")

MASTERY = r'''/**
 * Mastery rules.
 *
 * Pure functions that map a stream of correctness events to a mastery
 * score for a topic. The SQLite store (`store/mastery.ts`) persists the
 * score; this module holds the rule so it can be unit-tested in isolation.
 */

export interface MasteryEvent {
  correct: boolean;
  /** Weight relative to other events; defaults to 1. */
  weight?: number;
  /** Difficulty 0..1 used to inflate correct scores and deflate incorrect ones. */
  difficulty?: number;
}

export interface MasteryState {
  score: number; // 0..1
  n: number;
  lastUpdated: string;
}

const PRIOR = 0.5;

/**
 * Bayesian-style running mean with a difficulty prior. New events pull the
 * score toward 1 (correct) or 0 (incorrect), modulated by difficulty. The
 * weight parameter controls how strongly each event pulls.
 */
export function updateMastery(prev: MasteryState | null, ev: MasteryEvent, now: string = new Date().toISOString()): MasteryState {
  const w = clamp(ev.weight ?? 1, 0.01, 10);
  const d = clamp(ev.difficulty ?? 0.5, 0, 1);
  const base = prev?.score ?? PRIOR;
  const n = (prev?.n ?? 0) + w;
  // Effective target: harder events have a more pronounced effect.
  const target = ev.correct ? Math.min(1, 0.5 + 0.5 * d) : Math.max(0, 0.5 - 0.5 * d);
  const next = base + (target - base) * (w / (w + n));
  return {
    score: Math.max(0, Math.min(1, next)),
    n,
    lastUpdated: now,
  };
}

export function isMastered(state: MasteryState | null, threshold = 0.8): boolean {
  return state !== null && state.score >= threshold;
}

export function isWeak(state: MasteryState | null, threshold = 0.5): boolean {
  return state !== null && state.score < threshold;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
'''

(BASE / "assessment" / "mastery_rules.ts").write_text(MASTERY, encoding="utf-8")
print("wrote assessment/*.ts")