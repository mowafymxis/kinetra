import pathlib
ROOT = pathlib.Path(r"C:\Users\moham\Desktop\Vibe\Codex\Kinetra")
BASE = ROOT / "packages" / "core" / "src"
(BASE / "workspace").mkdir(parents=True, exist_ok=True)

WORKSPACE = r'''/**
 * Workspace.
 *
 * Aggregates the user's in-memory artifact set, source-library rows, and
 * retrieved context. A workspace is the unit a Codex plugin session, the
 * CLI, or the desktop app hands to the engine. Persisting a workspace
 * yields a deterministic JSON envelope that can be reloaded across
 * processes.
 */

import { KinetraError } from "../errors.js";
import { newPrefixedId } from "../utils/id.js";
import { sha256 } from "../utils/hash.js";
import type { ArtifactBase, ArtifactKind } from "../artifacts.js";
import { validateArtifact } from "../artifacts.js";

export interface WorkspaceEntry {
  /** Stable id within the workspace. */
  entryId: string;
  /** Original artifact id, if applicable. */
  artifactId?: string;
  /** Display title. */
  title: string;
  /** Course this entry belongs to. */
  courseId: string;
  /** Topic id, optional. */
  topicId?: string;
  /** SHA-256 hash of the canonical artifact model (kind + model JSON). */
  contentHash: string;
  /** ISO timestamp when the entry was created. */
  createdAt: string;
}

export interface WorkspaceSnapshot {
  workspaceId: string;
  name: string;
  createdAt: string;
  entries: WorkspaceEntry[];
}

export class Workspace {
  readonly workspaceId: string;
  name: string;
  readonly createdAt: string;
  private entries: WorkspaceEntry[] = [];

  constructor(name: string, workspaceId?: string) {
    if (!name || typeof name !== "string") {
      throw new KinetraError("validation", "Workspace name is required", { name });
    }
    this.workspaceId = workspaceId ?? newPrefixedId("ws");
    this.name = name;
    this.createdAt = new Date().toISOString();
  }

  addArtifact(a: ArtifactBase<ArtifactKind, unknown>, opts: { courseId: string; topicId?: string }): WorkspaceEntry {
    validateArtifact(a);
    if (!opts.courseId) throw new KinetraError("validation", "courseId is required", { kind: a.kind });
    const entry: WorkspaceEntry = {
      entryId: newPrefixedId("we"),
      artifactId: a.id,
      title: a.title,
      courseId: opts.courseId,
      topicId: opts.topicId,
      contentHash: sha256(JSON.stringify({ kind: a.kind, model: a.model })),
      createdAt: new Date().toISOString(),
    };
    // Idempotency: same artifact id is replaced in-place.
    const idx = this.entries.findIndex((e) => e.artifactId === a.id);
    if (idx >= 0) this.entries[idx] = entry;
    else this.entries.push(entry);
    return entry;
  }

  byCourse(courseId: string): WorkspaceEntry[] {
    return this.entries.filter((e) => e.courseId === courseId);
  }

  byTopic(courseId: string, topicId: string): WorkspaceEntry[] {
    return this.entries.filter((e) => e.courseId === courseId && e.topicId === topicId);
  }

  remove(entryId: string): boolean {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.entryId !== entryId);
    return this.entries.length !== before;
  }

  clear(): void {
    this.entries = [];
  }

  size(): number { return this.entries.length; }
  list(): WorkspaceEntry[] { return [...this.entries]; }

  snapshot(): WorkspaceSnapshot {
    return {
      workspaceId: this.workspaceId,
      name: this.name,
      createdAt: this.createdAt,
      entries: [...this.entries],
    };
  }

  toJSON(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }
}

export function loadWorkspace(raw: string): Workspace {
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== "object") {
    throw new KinetraError("parse", "Workspace JSON is not an object");
  }
  const ws = new Workspace(obj.name, obj.workspaceId);
  ws.entries = Array.isArray(obj.entries) ? obj.entries : [];
  return ws;
}
'''

(BASE / "workspace" / "workspace.ts").write_text(WORKSPACE, encoding="utf-8")

ARTIFACT = r'''/**
 * Artifact repository helpers.
 *
 * Bridges the Artifact data model with the persistent SQLite store and the
 * in-memory workspace. The store API is defined in `store/artifacts.ts`;
 * this module exists so plugin and CLI code can call a single ergonomic
 * surface.
 */

import { KinetraError } from "../errors.js";
import type { ArtifactBase, ArtifactKind } from "../artifacts.js";
import { validateArtifact, hashArtifact } from "../artifacts.js";
import { Workspace } from "./workspace.js";

export interface ArtifactSaveResult {
  artifactId: string;
  contentHash: string;
  duplicate: boolean;
}

export interface ArtifactStoreLike {
  upsert(a: ArtifactBase<ArtifactKind, unknown>): { duplicate: boolean };
  remove(id: string): boolean;
  byKind(kind: ArtifactKind, courseId?: string): ArtifactBase<ArtifactKind, unknown>[];
}

export class ArtifactRepository {
  constructor(private store: ArtifactStoreLike) {}

  save(
    a: ArtifactBase<ArtifactKind, unknown>,
    courseId: string,
    topicId?: string,
    workspace?: Workspace,
  ): ArtifactSaveResult {
    validateArtifact(a);
    const result = this.store.upsert(a);
    const hash = hashArtifact(a);
    if (workspace) {
      workspace.addArtifact(a, { courseId, topicId });
    }
    return { artifactId: a.id, contentHash: hash, duplicate: result.duplicate };
  }

  remove(id: string, workspace?: Workspace): boolean {
    const removed = this.store.remove(id);
    if (workspace) {
      const entries = workspace.list().filter((e) => e.artifactId === id);
      for (const e of entries) workspace.remove(e.entryId);
    }
    return removed;
  }

  byKind(kind: ArtifactKind, courseId?: string): ArtifactBase<ArtifactKind, unknown>[] {
    return this.store.byKind(kind, courseId);
  }

  byCourse(courseId: string): ArtifactBase<ArtifactKind, unknown>[] {
    return this.store.byKind("document", courseId);
  }
}

export function findArtifact<T extends ArtifactBase<ArtifactKind, unknown>>(
  artifacts: ArtifactBase<ArtifactKind, unknown>[],
  id: string,
): T {
  const a = artifacts.find((x) => x.id === id);
  if (!a) throw new KinetraError("missing", `Artifact not found: ${id}`);
  return a as T;
}
'''

(BASE / "workspace" / "artifact.ts").write_text(ARTIFACT, encoding="utf-8")
print("wrote workspace/workspace.ts and workspace/artifact.ts")