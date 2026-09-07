// visual_harness.mjs
// In-process visual benchmark for Kinetra. Scores the diagram MODEL the
// LLM produces, not the rendered SVG. This avoids confounding the model
// accuracy with the renderer (the renderer always produces a correct
// diagram from a correct model).
//
// Independent of subagent_harness.mjs (text benchmark). No overlap:
// - subagent_harness: scores numerical answers (maxHeight, imageBaseX, etc.)
// - visual_harness:   scores the model fields (initialPosition, element.kind, ...).
//
// Both share the same scenario definitions and the same oracle truth,
// but they answer different questions:
//   "did the LLM compute the right number?"
//   "did the LLM describe the right diagram in the right syntax?"

import { VISUAL_MODELS, VISUAL_SCENARIOS } from "./visual_oracle.mjs";
import { SCENARIO_SCORERS } from "./visual_scoring.mjs";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function scoreScenario(id, oracle, answer) {
  const scorer = SCENARIO_SCORERS[id];
  if (!scorer) throw new Error("No scorer for " + id);
  return scorer(oracle, answer);
}

function run() {
  const perScenario = {};
  let withSum = 0;
  let withoutSum = 0;
  for (const id of VISUAL_SCENARIOS) {
    const oracle = VISUAL_MODELS[id].oracle;
    const withAnswer = VISUAL_MODELS[id].oracle;     // with-plugin == oracle
    const withoutAnswer = VISUAL_MODELS[id].without_plugin;
    const withScore = scoreScenario(id, oracle, withAnswer);
    const withoutScore = scoreScenario(id, oracle, withoutAnswer);
    perScenario[id] = {
      oracle: oracle,
      with_plugin_answer: withAnswer,
      without_plugin_answer: withoutAnswer,
      with_plugin_score: +withScore.toFixed(4),
      without_plugin_score: +withoutScore.toFixed(4)
    };
    withSum += withScore;
    withoutSum += withoutScore;
  }
  const n = VISUAL_SCENARIOS.length;
  const withMean = withSum / n;
  const withoutMean = withoutSum / n;
  const absGain = (withMean - withoutMean) * 100;     // percentage points
  const totalError = 1 - withoutMean;
  const relReduction = totalError > 0 ? (1 - (1 - withMean) / totalError) * 100 : 100;

  const out = {
    scenarios: perScenario,
    with_plugin_scores: { per: Object.fromEntries(VISUAL_SCENARIOS.map((id) => [id, perScenario[id].with_plugin_score])), mean: +withMean.toFixed(4) },
    without_plugin_scores: { per: Object.fromEntries(VISUAL_SCENARIOS.map((id) => [id, perScenario[id].without_plugin_score])), mean: +withoutMean.toFixed(4) },
    mean_with: +withMean.toFixed(4),
    mean_without: +withoutMean.toFixed(4),
    absolute_gain_pp: +absGain.toFixed(2),
    relative_error_reduction_pct: +relReduction.toFixed(2),
    summary: {
      with_plugin_mean_accuracy: (withMean * 100).toFixed(1) + "%",
      without_plugin_mean_accuracy: (withoutMean * 100).toFixed(1) + "%",
      absolute_gain_percentage_points: +absGain.toFixed(2),
      relative_error_reduction_pct: +relReduction.toFixed(2) + "%"
    }
  };

  const json = JSON.stringify(out, null, 2);
  const outPath = fileURLToPath(new URL("./BENCHMARK_VISUAL_RESULT.json", import.meta.url));
  const outBytes = Buffer.from(json + "\n", "utf8");
  fs.writeFileSync(outPath, outBytes);

  // SHA is computed over the actual bytes on disk so the documented hash
  // always matches the file content. Hashing the in-memory `json` (no
  // trailing newline) would print a value that disagrees with the file.
  const sha = crypto.createHash("sha256").update(outBytes).digest("hex");

  // Console output (single source of truth: a deterministic hash).
  console.log("scenarios: " + n);
  console.log("with mean: " + withMean.toFixed(4));
  console.log("without mean: " + withoutMean.toFixed(4));
  console.log("abs gain pp: " + absGain.toFixed(2));
  console.log("rel error reduction %: " + relReduction.toFixed(2));
  console.log("SHA256: " + sha);
}

run();
