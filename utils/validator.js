// utils/validator.js
// Core validation engine for AI responses

const config = require("../config/config");

/**
 * ─────────────────────────────────────────────
 *  1. KEYWORD COVERAGE VALIDATOR
 *  Checks if the response contains required keywords
 * ─────────────────────────────────────────────
 */
function validateKeywordCoverage(response, requiredKeywords) {
  if (!requiredKeywords || requiredKeywords.length === 0)
    return { pass: true, score: 1, details: "No keywords required" };

  const lowerResponse = response.toLowerCase();
  const found = requiredKeywords.filter((kw) =>
    lowerResponse.includes(kw.toLowerCase()),
  );
  const score = found.length / requiredKeywords.length;
  const pass = score >= config.thresholds.keywordCoverage;

  return {
    pass,
    score: parseFloat(score.toFixed(2)),
    found,
    missing: requiredKeywords.filter(
      (kw) => !lowerResponse.includes(kw.toLowerCase()),
    ),
    details: `${found.length}/${requiredKeywords.length} keywords found`,
  };
}

/**
 * ─────────────────────────────────────────────
 *  2. FORBIDDEN CONTENT VALIDATOR
 *  Ensures response does NOT contain banned phrases
 * ─────────────────────────────────────────────
 */
function validateForbiddenContent(response, forbiddenPhrases) {
  if (!forbiddenPhrases || forbiddenPhrases.length === 0)
    return { pass: true, score: 1, details: "No forbidden phrases defined" };

  const lowerResponse = response.toLowerCase();
  const found = forbiddenPhrases.filter((phrase) =>
    lowerResponse.includes(phrase.toLowerCase()),
  );

  return {
    pass: found.length === 0,
    score: found.length === 0 ? 1 : 0,
    foundForbidden: found,
    details:
      found.length === 0
        ? "No forbidden content found"
        : `Forbidden content found: ${found.join(", ")}`,
  };
}

/**
 * ─────────────────────────────────────────────
 *  3. RESPONSE LENGTH VALIDATOR
 *  Checks response is within acceptable length range
 * ─────────────────────────────────────────────
 */
function validateResponseLength(response, options = {}) {
  const len = response.trim().length;
  const min = options.minLength || config.thresholds.minResponseLength;
  const max = options.maxLength || null;

  const tooShort = len < min;
  const tooLong = max ? len > max : false;
  const pass = !tooShort && !tooLong;

  return {
    pass,
    score: pass ? 1 : 0,
    length: len,
    details: tooShort
      ? `Too short: ${len} chars (min: ${min})`
      : tooLong
        ? `Too long: ${len} chars (max: ${max})`
        : `Length OK: ${len} chars`,
  };
}

/**
 * ─────────────────────────────────────────────
 *  4. TOPIC RELEVANCE VALIDATOR (Semantic Proxy)
 *  Uses keyword overlap as a proxy for semantic similarity
 *  since we don't have embedding APIs in offline mode
 * ─────────────────────────────────────────────
 */
function validateTopicRelevance(response, topicKeywords) {
  if (!topicKeywords || topicKeywords.length === 0)
    return { pass: true, score: 1, details: "No topic defined" };

  const words = response.toLowerCase().split(/\W+/);
  const topicWords = topicKeywords.map((k) => k.toLowerCase());
  const matchCount = topicWords.filter((tw) =>
    words.some((w) => w.includes(tw) || tw.includes(w)),
  ).length;

  const score = matchCount / topicKeywords.length;
  const pass = score >= config.thresholds.semanticSimilarity;

  return {
    pass,
    score: parseFloat(score.toFixed(2)),
    details: `Topic relevance: ${(score * 100).toFixed(0)}% (threshold: ${config.thresholds.semanticSimilarity * 100}%)`,
  };
}

/**
 * ─────────────────────────────────────────────
 *  5. TONE/SENTIMENT VALIDATOR
 *  Checks if response has appropriate tone
 * ─────────────────────────────────────────────
 */
function validateTone(response, expectedTone) {
  const positiveWords = [
    "happy",
    "glad",
    "please",
    "help",
    "assist",
    "resolve",
    "solution",
    "apolog",
    "sorry",
    "thank",
    "certainly",
    "absolutely",
    "sure",
  ];
  const negativeWords = [
    "cannot",
    "impossible",
    "never",
    "refuse",
    "won't",
    "don't care",
    "not my problem",
  ];

  const lowerRes = response.toLowerCase();
  const positiveCount = positiveWords.filter((w) =>
    lowerRes.includes(w),
  ).length;
  const negativeCount = negativeWords.filter((w) =>
    lowerRes.includes(w),
  ).length;

  const toneScore =
    (positiveCount - negativeCount) /
    Math.max(positiveCount + negativeCount, 1);

  let pass = true;
  let details = "";

  if (expectedTone === "empathetic" || expectedTone === "helpful") {
    pass = toneScore >= 0 && positiveCount >= 1;
    details = `Tone score: ${toneScore.toFixed(2)}, positive signals: ${positiveCount}`;
  } else if (expectedTone === "neutral") {
    pass = Math.abs(toneScore) <= 0.5;
    details = `Neutral tone check passed: ${pass}`;
  }

  return {
    pass,
    score: parseFloat(((toneScore + 1) / 2).toFixed(2)), // normalize to 0-1
    toneScore,
    details,
  };
}

/**
 * ─────────────────────────────────────────────
 *  6. FORMAT VALIDATOR
 *  Checks if response follows expected structural format
 * ─────────────────────────────────────────────
 */
function validateFormat(response, formatRules = {}) {
  const results = {};

  if (formatRules.mustStartWithGreeting) {
    const greetings = [
      "hello",
      "hi",
      "hey",
      "dear",
      "greetings",
      "thank you for",
    ];
    results.greeting = response
      .slice(0, 50)
      .toLowerCase()
      .split(" ")
      .some((w) => greetings.some((g) => w.startsWith(g)));
  }

  if (formatRules.mustEndWithOffer) {
    const offerPhrases = [
      "help",
      "assist",
      "let me know",
      "feel free",
      "anything else",
    ];
    results.closingOffer = offerPhrases.some((p) =>
      response.toLowerCase().slice(-150).includes(p),
    );
  }

  if (formatRules.noMarkdown) {
    results.noMarkdown =
      !response.includes("**") &&
      !response.includes("##") &&
      !response.includes("```");
  }

  const allPassed = Object.values(results).every(Boolean);
  return {
    pass: allPassed,
    score: allPassed ? 1 : 0,
    checks: results,
    details: JSON.stringify(results),
  };
}

/**
 * ─────────────────────────────────────────────
 *  MASTER VALIDATOR
 *  Runs all applicable validators and returns aggregated result
 * ─────────────────────────────────────────────
 */
function validateResponse(response, evalCase) {
  const results = {};
  let totalScore = 0;
  let totalWeight = 0;

  // Run keyword validation
  if (evalCase.requiredKeywords) {
    results.keywords = validateKeywordCoverage(
      response,
      evalCase.requiredKeywords,
    );
    totalScore += results.keywords.score * 3; // weight: 3
    totalWeight += 3;
  }

  // Run forbidden content check
  if (evalCase.forbiddenPhrases) {
    results.forbidden = validateForbiddenContent(
      response,
      evalCase.forbiddenPhrases,
    );
    totalScore += results.forbidden.score * 4; // weight: 4 (critical)
    totalWeight += 4;
  }

  // Run length check
  results.length = validateResponseLength(
    response,
    evalCase.lengthOptions || {},
  );
  totalScore += results.length.score * 1;
  totalWeight += 1;

  // Run topic relevance
  if (evalCase.topicKeywords) {
    results.topic = validateTopicRelevance(response, evalCase.topicKeywords);
    totalScore += results.topic.score * 3;
    totalWeight += 3;
  }

  // Run tone check
  if (evalCase.expectedTone) {
    results.tone = validateTone(response, evalCase.expectedTone);
    totalScore += results.tone.score * 2;
    totalWeight += 2;
  }

  // Run format check
  if (evalCase.formatRules) {
    results.format = validateFormat(response, evalCase.formatRules);
    totalScore += results.format.score * 1;
    totalWeight += 1;
  }

  const overallScore =
    totalWeight > 0 ? parseFloat((totalScore / totalWeight).toFixed(2)) : 1;
  const passed = Object.values(results).every((r) => r.pass);

  return {
    passed,
    overallScore,
    validators: results,
    response: response.slice(0, 200) + (response.length > 200 ? "..." : ""),
  };
}

module.exports = {
  validateKeywordCoverage,
  validateForbiddenContent,
  validateResponseLength,
  validateTopicRelevance,
  validateTone,
  validateFormat,
  validateResponse,
};
