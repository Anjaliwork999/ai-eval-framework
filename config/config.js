// config/config.js
// Central configuration for the AI Eval Framework

module.exports = {
  // --- AI Model Settings ---
  model: {
    name: "claude-sonnet-4-20250514",
    max_tokens: 1024,
  },

  // --- Validation Thresholds ---
  thresholds: {
    // Minimum semantic similarity score (0-1) for a response to pass
    // Uses keyword overlap + topic matching
    semanticSimilarity: 0.45,

    // Minimum keyword coverage: ratio of expected keywords found in response
    keywordCoverage: 0.7,

    // Minimum sentiment match: how close sentiment must be (-1 to 1 scale)
    sentimentTolerance: 0.4,

    // Max response length multiplier vs baseline (e.g., 3x = 300% of baseline)
    maxLengthMultiplier: 5,

    // Minimum response length in characters
    minResponseLength: 20,

    // For flakiness control: run each eval N times and check pass rate
    flakinessRuns: 3,
    flakinessPassRate: 0.67, // At least 2 out of 3 runs must pass
  },

  // --- Categories for Chatbot Responses ---
  responseCategories: {
    ORDER_TRACKING: "order_tracking",
    REFUND: "refund",
    DELIVERY_ISSUE: "delivery_issue",
    MENU_QUERY: "menu_query",
    GENERAL_SUPPORT: "general_support",
  },
};
