---
name: plan-build-review
description: Lightweight plan-build-review workflow for significant changes to the hackathon app (e.g. data contract changes, prompt restructuring, or new endpoints). Skip for small UI tweaks.
---

# When to Use
- **Use when:** Modifying data contracts (`lib/types.ts` / `responseSchema`), major prompt redesigns (`lib/prompt.ts`), adding new endpoints/services, or changes touching 3+ files.
- **Skip when:** Styling adjustments, copy updates, typo fixes, or isolated single-component edits.

# Steps
1. **PLAN**: 
   - State the objective in 1–2 sentences.
   - List the files to change and any contract implications.
   - Only pause for user approval if introducing breaking schema changes.

2. **BUILD**: 
   - Implement the minimal viable change. 
   - Avoid adding external dependencies or out-of-scope features.

3. **REVIEW**: 
   - **Contract Match**: Does `lib/types.ts` strictly match `responseSchema` in `app/api/analyze/route.ts` and the frontend in `app/page.tsx`?
   - **Security**: Is `GEMINI_API_KEY` kept server-side only and never leaked to the client or git?
   - **Robustness**: Are empty inputs, bad payloads, and Gemini API errors handled gracefully?

4. **VERIFY**: 
   - Quick check (run test request or verify build/types) to confirm it works with valid and edge-case input.
   - Report concise outcome.
