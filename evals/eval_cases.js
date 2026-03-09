// evals/eval_cases.js
// All evaluation test cases for the Swiggy chatbot

const { responseCategories } = require("../config/config");

/**
 * Each eval case defines:
 *  - id: unique identifier
 *  - category: type of query
 *  - prompt: what the user asks
 *  - description: what we're testing
 *  - requiredKeywords: words that MUST appear in response
 *  - forbiddenPhrases: words/phrases that must NOT appear
 *  - topicKeywords: used for semantic/topic relevance scoring
 *  - expectedTone: empathetic | helpful | neutral
 *  - lengthOptions: min/max character limits
 *  - formatRules: structural checks
 *  - tags: for filtering/grouping
 */
const evalCases = [
  // ─── ORDER TRACKING ───────────────────────────────────────────
  {
    id: "OT-001",
    category: responseCategories.ORDER_TRACKING,
    prompt: "Where is my order? I placed it 45 minutes ago.",
    description: "Should provide order tracking help with empathy",
    requiredKeywords: ["order", "track"],
    forbiddenPhrases: ["i don't know", "not sure", "can't help"],
    topicKeywords: [
      "order",
      "delivery",
      "status",
      "track",
      "minutes",
      "location",
    ],
    expectedTone: "empathetic",
    lengthOptions: { minLength: 50 },
    formatRules: { mustEndWithOffer: true },
    tags: ["order", "tracking", "smoke"],
  },
  {
    id: "OT-002",
    category: responseCategories.ORDER_TRACKING,
    prompt: "My order shows delivered but I haven't received anything!",
    description: "Should acknowledge the issue and offer resolution",
    requiredKeywords: ["sorry", "investigate", "resolve"],
    forbiddenPhrases: ["your fault", "not our problem", "impossible"],
    topicKeywords: [
      "delivered",
      "received",
      "issue",
      "check",
      "resolve",
      "investigate",
    ],
    expectedTone: "empathetic",
    lengthOptions: { minLength: 80 },
    tags: ["order", "escalation", "critical"],
  },

  // ─── REFUND ───────────────────────────────────────────────────
  {
    id: "RF-001",
    category: responseCategories.REFUND,
    prompt: "I want a refund. My food was completely wrong.",
    description: "Should acknowledge and explain refund process",
    requiredKeywords: ["refund", "sorry"],
    forbiddenPhrases: ["no refund", "refunds not available", "your problem"],
    topicKeywords: ["refund", "wrong", "food", "process", "initiate", "amount"],
    expectedTone: "empathetic",
    lengthOptions: { minLength: 60 },
    tags: ["refund", "smoke"],
  },
  {
    id: "RF-002",
    category: responseCategories.REFUND,
    prompt: "How long does it take to get a refund after cancellation?",
    description: "Should give clear timeline information",
    requiredKeywords: ["days", "business"],
    forbiddenPhrases: ["forever", "we don't do refunds"],
    topicKeywords: [
      "refund",
      "days",
      "business",
      "cancellation",
      "timeline",
      "bank",
    ],
    expectedTone: "helpful",
    lengthOptions: { minLength: 40, maxLength: 600 },
    tags: ["refund", "faq"],
  },

  // ─── DELIVERY ISSUE ───────────────────────────────────────────
  {
    id: "DI-001",
    category: responseCategories.DELIVERY_ISSUE,
    prompt: "My delivery partner is asking for extra money. Is that allowed?",
    description: "Should clearly state policy and offer to report",
    requiredKeywords: ["not", "policy", "report"],
    forbiddenPhrases: ["pay them", "that's fine", "acceptable"],
    topicKeywords: [
      "delivery",
      "partner",
      "money",
      "policy",
      "report",
      "allowed",
    ],
    expectedTone: "helpful",
    lengthOptions: { minLength: 60 },
    tags: ["delivery", "policy", "critical"],
  },
  {
    id: "DI-002",
    category: responseCategories.DELIVERY_ISSUE,
    prompt: "It's been 90 minutes and my order still hasn't arrived!",
    description: "Should show urgency, empathy and escalate",
    requiredKeywords: ["sorry", "check"],
    forbiddenPhrases: ["wait longer", "be patient", "not our fault"],
    topicKeywords: [
      "delay",
      "minutes",
      "arrive",
      "sorry",
      "check",
      "escalate",
      "restaurant",
    ],
    expectedTone: "empathetic",
    lengthOptions: { minLength: 70 },
    tags: ["delivery", "delay", "critical", "smoke"],
  },

  // ─── MENU QUERY ───────────────────────────────────────────────
  {
    id: "MQ-001",
    category: responseCategories.MENU_QUERY,
    prompt: "Does the restaurant have vegan options?",
    description: "Should acknowledge and guide user to check menu",
    requiredKeywords: ["menu", "check"],
    forbiddenPhrases: ["we don't know", "impossible to say"],
    topicKeywords: [
      "vegan",
      "menu",
      "options",
      "restaurant",
      "filter",
      "check",
    ],
    expectedTone: "helpful",
    lengthOptions: { minLength: 40 },
    tags: ["menu", "faq"],
  },

  // ─── GENERAL SUPPORT ──────────────────────────────────────────
  {
    id: "GS-001",
    category: responseCategories.GENERAL_SUPPORT,
    prompt: "How do I apply a promo code?",
    description: "Should explain promo code steps clearly",
    requiredKeywords: ["promo", "apply", "code"],
    forbiddenPhrases: ["can't help with that"],
    topicKeywords: ["promo", "code", "discount", "apply", "checkout", "cart"],
    expectedTone: "helpful",
    lengthOptions: { minLength: 60 },
    tags: ["promo", "faq", "smoke"],
  },
  {
    id: "GS-002",
    category: responseCategories.GENERAL_SUPPORT,
    prompt: "I want to delete my Swiggy account.",
    description: "Should guide through account deletion or escalate",
    requiredKeywords: ["account"],
    forbiddenPhrases: ["just delete the app", "we can't help"],
    topicKeywords: ["account", "delete", "settings", "support", "request"],
    expectedTone: "helpful",
    lengthOptions: { minLength: 50 },
    tags: ["account", "escalation"],
  },
];

module.exports = { evalCases };
