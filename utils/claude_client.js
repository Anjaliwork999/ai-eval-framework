// utils/claude_client.js
// Wrapper around Anthropic Claude API

const Anthropic = require("@anthropic-ai/sdk");
const config = require("../config/config");

const client = new Anthropic();

/**
 * Send a prompt to Claude and return the text response
 * @param {string} userMessage - The user query
 * @param {string} systemPrompt - The chatbot system persona
 * @returns {Promise<string>} - Claude's response text
 */
async function getAIResponse(userMessage, systemPrompt = null) {
  const defaultSystem = `You are a helpful customer support agent for Swiggy, a food delivery platform. 
You help users with order tracking, refunds, delivery issues, and general queries. 
Be empathetic, concise, and always offer to help further.`;

  const response = await client.messages.create({
    model: config.model.name,
    max_tokens: config.model.max_tokens,
    system: systemPrompt || defaultSystem,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content[0].text;
}

/**
 * Run a prompt multiple times to test for flakiness
 * @param {string} userMessage
 * @param {string} systemPrompt
 * @param {number} runs - Number of times to run
 * @returns {Promise<string[]>} - Array of responses
 */
async function getMultipleResponses(
  userMessage,
  systemPrompt = null,
  runs = 3,
) {
  const responses = [];
  for (let i = 0; i < runs; i++) {
    const resp = await getAIResponse(userMessage, systemPrompt);
    responses.push(resp);
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }
  return responses;
}

module.exports = { getAIResponse, getMultipleResponses };
