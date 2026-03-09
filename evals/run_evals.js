// evals/run_evals.js
// Main eval runner — calls Claude API and validates responses

const {
  getAIResponse,
  getMultipleResponses,
} = require("../utils/claude_client");
const { validateResponse } = require("../utils/validator");
const { evalCases } = require("./eval_cases");
const config = require("../config/config");
const fs = require("fs");
const path = require("path");

/**
 * Run a single eval case once
 */
async function runSingleEval(evalCase) {
  const response = await getAIResponse(evalCase.prompt);
  const validation = validateResponse(response, evalCase);
  return {
    evalId: evalCase.id,
    category: evalCase.category,
    prompt: evalCase.prompt,
    description: evalCase.description,
    response: response.slice(0, 300) + (response.length > 300 ? "..." : ""),
    validation,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run flakiness test: run eval N times, check pass rate
 */
async function runFlakinessTest(evalCase) {
  const runs = config.thresholds.flakinessRuns;
  console.log(
    `  ↻ Running flakiness test for ${evalCase.id} (${runs} runs)...`,
  );

  const responses = await getMultipleResponses(evalCase.prompt, null, runs);
  const validations = responses.map((resp) => validateResponse(resp, evalCase));
  const passCount = validations.filter((v) => v.passed).length;
  const passRate = passCount / runs;

  return {
    evalId: evalCase.id,
    flakinessRuns: runs,
    passCount,
    passRate: parseFloat(passRate.toFixed(2)),
    stable: passRate >= config.thresholds.flakinessPassRate,
    validations,
  };
}

/**
 * Main runner
 */
async function runAllEvals(options = {}) {
  const { tags = null, flakinessTest = false } = options;

  // Filter by tags if provided
  let cases = evalCases;
  if (tags && tags.length > 0) {
    cases = evalCases.filter(
      (c) => c.tags && c.tags.some((t) => tags.includes(t)),
    );
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     AI Response Validation Framework — EVALs     ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`Running ${cases.length} eval cases...\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const evalCase of cases) {
    process.stdout.write(`[${evalCase.id}] ${evalCase.description}... `);

    try {
      const result = await runSingleEval(evalCase);
      results.push(result);

      if (result.validation.passed) {
        passed++;
        console.log(`✅ PASS (score: ${result.validation.overallScore})`);
      } else {
        failed++;
        console.log(`❌ FAIL (score: ${result.validation.overallScore})`);
        // Print which validators failed
        Object.entries(result.validation.validators).forEach(([key, val]) => {
          if (!val.pass) {
            console.log(`   └─ ${key}: ${val.details}`);
          }
        });
      }
    } catch (err) {
      failed++;
      console.log(`💥 ERROR: ${err.message}`);
      results.push({ evalId: evalCase.id, error: err.message });
    }
  }

  // Flakiness tests (run a subset — smoke tests only)
  const flakinessResults = [];
  if (flakinessTest) {
    console.log("\n──────────────────────────────────────────────────");
    console.log("Running Flakiness Tests (smoke cases)...\n");
    const smokeCases = cases.filter((c) => c.tags && c.tags.includes("smoke"));
    for (const evalCase of smokeCases) {
      const fr = await runFlakinessTest(evalCase);
      flakinessResults.push(fr);
      const icon = fr.stable ? "✅" : "⚠️";
      console.log(
        `${icon} [${evalCase.id}] Pass rate: ${(fr.passRate * 100).toFixed(0)}% (${fr.passCount}/${fr.flakinessRuns}) — ${fr.stable ? "STABLE" : "FLAKY"}`,
      );
    }
  }

  // Summary
  const total = cases.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  console.log("\n══════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} passed (${passRate}%)`);
  console.log(`         ${failed} failed`);
  console.log("══════════════════════════════════════════════════\n");

  // Save report
  const report = {
    runAt: new Date().toISOString(),
    summary: { total, passed, failed, passRate: `${passRate}%` },
    results,
    flakinessResults,
  };

  const reportPath = path.join(__dirname, "../reports/eval_report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Report saved to: reports/eval_report.json\n`);

  return report;
}

// Run if called directly
if (require.main === module) {
  const runFlakiness = process.argv.includes("--flakiness");
  const tagArg = process.argv.find((a) => a.startsWith("--tags="));
  const tags = tagArg ? tagArg.replace("--tags=", "").split(",") : null;

  runAllEvals({ flakinessTest: runFlakiness, tags }).catch((err) => {
    console.error("Eval run failed:", err);
    process.exit(1);
  });
}

module.exports = { runAllEvals, runSingleEval, runFlakinessTest };
