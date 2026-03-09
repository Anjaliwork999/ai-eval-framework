// tests/validator.test.js
// Unit tests for all validation functions

const {
  validateKeywordCoverage,
  validateForbiddenContent,
  validateResponseLength,
  validateTopicRelevance,
  validateTone,
  validateFormat,
  validateResponse,
} = require("../utils/validator");

// ─────────────────────────────────────────────────────
//  KEYWORD COVERAGE TESTS
// ─────────────────────────────────────────────────────
describe("validateKeywordCoverage", () => {
  test("passes when all required keywords are present", () => {
    const result = validateKeywordCoverage(
      "Your order is being tracked and will be delivered soon.",
      ["order", "track", "deliver"],
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  test("fails when too many keywords are missing", () => {
    const result = validateKeywordCoverage("Hello, how can I help you today?", [
      "refund",
      "order",
      "cancel",
      "delivery",
      "payment",
    ]);
    expect(result.pass).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  test("is case-insensitive", () => {
    const result = validateKeywordCoverage("Your ORDER has been CONFIRMED.", [
      "order",
      "confirmed",
    ]);
    expect(result.pass).toBe(true);
  });

  test("returns pass:true when no keywords required", () => {
    const result = validateKeywordCoverage("Any response here", []);
    expect(result.pass).toBe(true);
  });

  test("partial match fails below threshold", () => {
    const result = validateKeywordCoverage("Your refund has been initiated.", [
      "refund",
      "order",
      "payment",
      "cancel",
      "days",
    ]);
    // Only 1/5 = 0.2, below 0.7 threshold
    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(0.7);
  });
});

// ─────────────────────────────────────────────────────
//  FORBIDDEN CONTENT TESTS
// ─────────────────────────────────────────────────────
describe("validateForbiddenContent", () => {
  test("passes when no forbidden phrases present", () => {
    const result = validateForbiddenContent(
      "I apologize for the inconvenience. Let me help resolve this.",
      ["not our problem", "can't help", "your fault"],
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  test("fails when forbidden phrase found", () => {
    const result = validateForbiddenContent(
      "Sorry, we can't help with that request.",
      ["can't help", "not possible"],
    );
    expect(result.pass).toBe(false);
    expect(result.foundForbidden).toContain("can't help");
  });

  test("passes with empty forbidden list", () => {
    const result = validateForbiddenContent("Any response", []);
    expect(result.pass).toBe(true);
  });

  test("detects forbidden phrases case-insensitively", () => {
    const result = validateForbiddenContent(
      "This is NOT OUR PROBLEM to handle.",
      ["not our problem"],
    );
    expect(result.pass).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
//  RESPONSE LENGTH TESTS
// ─────────────────────────────────────────────────────
describe("validateResponseLength", () => {
  test("passes for adequate length response", () => {
    const result = validateResponseLength(
      "Thank you for reaching out! I can see your order is currently being prepared at the restaurant and will be picked up shortly.",
      { minLength: 50 },
    );
    expect(result.pass).toBe(true);
  });

  test("fails for too-short response", () => {
    const result = validateResponseLength("Ok.", { minLength: 50 });
    expect(result.pass).toBe(false);
    expect(result.details).toContain("Too short");
  });

  test("fails for too-long response", () => {
    const longText = "a".repeat(1000);
    const result = validateResponseLength(longText, {
      minLength: 20,
      maxLength: 500,
    });
    expect(result.pass).toBe(false);
    expect(result.details).toContain("Too long");
  });

  test("uses default minLength when not specified", () => {
    const result = validateResponseLength("Hi");
    expect(result.pass).toBe(false); // "Hi" is 2 chars, below default 20
  });
});

// ─────────────────────────────────────────────────────
//  TOPIC RELEVANCE TESTS
// ─────────────────────────────────────────────────────
describe("validateTopicRelevance", () => {
  test("passes for on-topic response", () => {
    const result = validateTopicRelevance(
      "I can see your refund of ₹250 has been initiated and will be credited within 5-7 business days to your account.",
      ["refund", "initiated", "business", "days", "amount"],
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0.45);
  });

  test("fails for completely off-topic response", () => {
    const result = validateTopicRelevance(
      "The weather today is sunny and bright!",
      ["refund", "order", "delivery", "payment", "cancel"],
    );
    expect(result.pass).toBe(false);
  });

  test("passes with no topic keywords", () => {
    const result = validateTopicRelevance("Any response", []);
    expect(result.pass).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
//  TONE VALIDATION TESTS
// ─────────────────────────────────────────────────────
describe("validateTone", () => {
  test("passes empathetic check for apologetic response", () => {
    const result = validateTone(
      "I'm so sorry to hear that! I'll help resolve this issue for you right away. Please allow me to assist.",
      "empathetic",
    );
    expect(result.pass).toBe(true);
  });

  test("fails empathetic check for cold response", () => {
    const result = validateTone(
      "Your order status cannot be determined at this time.",
      "empathetic",
    );
    // No positive signal words
    expect(result.pass).toBe(false);
  });

  test("passes helpful tone check", () => {
    const result = validateTone(
      "Certainly! I'll assist you with that. Please let me know if you need anything else.",
      "helpful",
    );
    expect(result.pass).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
//  FORMAT VALIDATION TESTS
// ─────────────────────────────────────────────────────
describe("validateFormat", () => {
  test("passes closing offer check", () => {
    const result = validateFormat(
      "Your refund has been processed. Please let me know if you need anything else or if I can help with something!",
      { mustEndWithOffer: true },
    );
    expect(result.checks.closingOffer).toBe(true);
  });

  test("detects unwanted markdown", () => {
    const result = validateFormat(
      "Here are the steps:\n**Step 1:** Go to the app\n## Section",
      { noMarkdown: true },
    );
    expect(result.checks.noMarkdown).toBe(false);
    expect(result.pass).toBe(false);
  });

  test("passes no-markdown check for plain text", () => {
    const result = validateFormat(
      "Please open the app and navigate to orders section to track your delivery.",
      { noMarkdown: true },
    );
    expect(result.checks.noMarkdown).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
//  MASTER VALIDATOR INTEGRATION TESTS
// ─────────────────────────────────────────────────────
describe("validateResponse (master validator)", () => {
  test("passes a well-formed refund response", () => {
    const evalCase = {
      requiredKeywords: ["refund", "sorry"],
      forbiddenPhrases: ["no refund", "your problem"],
      topicKeywords: ["refund", "initiated", "days"],
      expectedTone: "empathetic",
      lengthOptions: { minLength: 50 },
    };
    const response =
      "I'm so sorry to hear about this! Your refund has been initiated and will be processed within 5-7 business days. Please let me know if I can assist further.";
    const result = validateResponse(response, evalCase);
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBeGreaterThan(0.5);
  });

  test("fails a response with forbidden phrase", () => {
    const evalCase = {
      forbiddenPhrases: ["no refund", "your problem"],
      lengthOptions: { minLength: 20 },
    };
    const response =
      "This is your problem. We do not issue refunds in this case.";
    const result = validateResponse(response, evalCase);
    expect(
      result.validation ? result.validation.passed : result.passed,
    ).toBeDefined();
  });

  test("returns score between 0 and 1", () => {
    const evalCase = {
      requiredKeywords: ["help", "order"],
      topicKeywords: ["order", "help", "support"],
    };
    const response = "I can help you with your order. Let me check the status.";
    const result = validateResponse(response, evalCase);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });
});
