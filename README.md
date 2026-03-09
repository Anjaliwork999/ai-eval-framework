# ai-eval-framework
# AI Response Validation Framework
### QA Engineer Assessment — Swiggy CREW

A production-ready automated testing framework for validating AI-generated chatbot responses in a CI/CD pipeline. Built for non-deterministic LLM outputs using **semantic evaluation** instead of brittle exact-match assertions.

---

## 🏗️ Project Structure

```
ai-eval-framework/
├── config/
│   └── config.js              # Thresholds, model settings, categories
├── evals/
│   ├── eval_cases.js          # All test cases (prompts + validation rules)
│   └── run_evals.js           # Eval runner (calls Claude API + validates)
├── utils/
│   ├── claude_client.js       # Anthropic API wrapper
│   └── validator.js           # Core validation engine (6 validators)
├── tests/
│   └── validator.test.js      # Jest unit tests for validators
├── reports/
│   └── eval_report.json       # Auto-generated after each run
├── .github/
│   └── workflows/ci.yml       # GitHub Actions (daily + PR gate)
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- An Anthropic API key

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/ai-eval-framework.git
cd ai-eval-framework
npm install
```

### 2. Set API Key
```bash
# Mac/Linux
export ANTHROPIC_API_KEY=your_key_here

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your_key_here"
```

### 3. Run Unit Tests (no API key needed)
```bash
npm test
```

### 4. Run Evals (requires API key)
```bash
# Run all eval cases
npm run test:evals

# Run only smoke tests
node evals/run_evals.js --tags=smoke

# Run with flakiness testing
node evals/run_evals.js --flakiness

# Run critical cases only
node evals/run_evals.js --tags=critical
```

---

## 🧠 Validation Approach

Since AI responses are **non-deterministic**, we use a **multi-layer semantic validation** strategy instead of exact string matching:

### The 6 Validators

| Validator | What it checks | Weight |
|-----------|---------------|--------|
| **Keyword Coverage** | Required domain words present (e.g., "refund", "track") | 3 |
| **Forbidden Content** | Banned phrases absent (e.g., "not our problem") | 4 (critical) |
| **Response Length** | Not too short or too long | 1 |
| **Topic Relevance** | Semantic proximity to expected topic | 3 |
| **Tone/Sentiment** | Empathetic/helpful/neutral as required | 2 |
| **Format Rules** | Structural checks (closing offer, no markdown) | 1 |

Each validator returns a `pass: bool` and `score: 0-1`. The **master validator** takes a weighted average to produce an `overallScore`.

### Handling Non-Determinism

**1. Semantic validation (not string matching)**
Instead of checking `response === "Your order is on its way"`, we check:
- Does it contain topic-relevant keywords?
- Is the tone appropriate?
- Are forbidden phrases absent?
This approach tolerates paraphrasing, synonyms, and structural variation.

**2. Flakiness threshold**
For smoke test cases, we run each prompt **3 times** and require **≥67% pass rate**.
A test is "flaky" only if it fails more than 1/3 of the time — occasional wording variation is tolerated.

**3. Configurable thresholds**
All thresholds live in `config/config.js`:
```js
semanticSimilarity: 0.45,   // 45% topic overlap minimum
keywordCoverage: 0.70,      // 70% of required keywords must appear
flakinessPassRate: 0.67,    // 2 out of 3 runs must pass
```

**4. Weighted scoring**
Critical validators (forbidden content) are weighted 4x.
Nice-to-have validators (format) are weighted 1x.
This prevents a formatting quirk from failing a semantically correct response.

---

## 🔄 CI/CD Integration

The GitHub Actions workflow runs:

| Trigger | Job | What runs |
|---------|-----|-----------|
| Daily (6 AM UTC) | Full eval suite | All 8 eval cases |
| Pull Request | Smoke tests | `--tags=smoke` cases only |
| Push to main | Unit tests + evals | Jest + all evals |
| Manual dispatch | Configurable | Choose tags + flakiness |

### Setup CI Secret
In your GitHub repo → Settings → Secrets → Actions:
```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-xxxx
```

---

## 📊 Eval Cases

| ID | Category | Description | Tags |
|----|----------|-------------|------|
| OT-001 | Order Tracking | Empathy for 45min delay | smoke |
| OT-002 | Order Tracking | Shows delivered but not received | critical |
| RF-001 | Refund | Wrong food refund request | smoke |
| RF-002 | Refund | Refund timeline question | faq |
| DI-001 | Delivery Issue | Driver asking for extra money | critical, policy |
| DI-002 | Delivery Issue | 90-minute delay escalation | smoke, critical |
| MQ-001 | Menu Query | Vegan options question | faq |
| GS-001 | General Support | Promo code application | smoke, faq |
| GS-002 | General Support | Account deletion request | escalation |

---

## ✍️ Write-up: Limitations of This Approach

### What Works Well
This framework handles the core challenge of AI testing: **semantic correctness over syntactic exactness**. By validating keywords, tone, topic relevance, and forbidden content separately, the framework tolerates natural language variation while still catching genuinely bad responses.

### Limitations

**1. No true semantic understanding**
The "semantic" validation here is a proxy — it uses keyword overlap rather than true embeddings or vector similarity. A response like "Your request has been escalated to the relevant department" could fail a refund case even though it's semantically correct, because it doesn't contain "refund".

**2. Keyword fragility**
If Claude says "reimburse" instead of "refund", it would miss the keyword check. A better approach would use word embeddings (e.g., `text-embedding-3-small` from OpenAI) to compute cosine similarity between the response and expected concept vectors.

**3. No ground truth dataset**
Without a human-labelled dataset of "good" and "bad" responses, thresholds (0.45, 0.70) are set heuristically. In production, you'd A/B test threshold values against human ratings.

**4. Tone detection is rudimentary**
The sentiment validator counts positive/negative signal words. It can't detect sarcasm, passive-aggressive responses, or culturally inappropriate phrasing.

**5. Eval case maintenance**
Every new feature or prompt change requires manually updating eval cases. This doesn't scale well. A more scalable approach: auto-generate eval cases from production query logs.

**6. Cost at scale**
Running 3 flakiness iterations per case × daily CI = significant API costs at scale. In production, flakiness tests should run weekly, not daily.

### What I'd Add Next
- Embedding-based similarity using OpenAI's `text-embedding-3-small`  
- LLM-as-judge: use a second Claude call to rate response quality 1-5  
- Regression baseline: store "golden responses" and flag drift > X%  
- Dashboard: HTML report with trend charts over time

---

## 🤝 Contributing
Add new eval cases to `evals/eval_cases.js` following the schema. Run `npm test` before opening a PR.