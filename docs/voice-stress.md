# Synthetic voice stress test

Date: 2026-10-03. Synthetic audio, zero human participants. These are bounded pipeline checks, not a usability study or general accuracy claim.

StepFun stepaudio-3-tts generated 12 original English clips with emotion, accent and inline delivery instructions using the official vibrant-youth voice. The clips were sent through the running application: WAV → local Whisper base.en → local Qwen3-4B → deterministic action. Accent and emotion fidelity were requested, not independently verified.

**Results:** 12/12 expected intents. 9/12 transcripts matched the requested text after lowercasing and punctuation normalization. This comparison uses synthesis prompts, not independently annotated audio ground truth. The completion case returned a confirmation action; the negative-completion case produced a checklist.

| Case | Requested style | Transcript | Expected / actual intent |
|---|---|---|---|
| neutral-us | Neutral conversational American English. | What should I return first? | triage / triage |
| urgent-uk | Urgent but intelligible British English. | Please tell me which return needs my attention first. | triage / triage |
| frustrated | Frustrated, slightly faster American English. | Why is this the deadline? I am really frustrated. | explain / explain |
| calm-indian | Calm Indian English accent, natural pace. | Help me prepare a return checklist. | prepare / prepare |
| hesitant | Hesitant English, with a short pause after Um. | Could you draft a message to the merchant? | draft / draft |
| excited | Excited English, clear articulation. | Create a calendar reminder for this return. | calendar / calendar |
| relieved | Relieved British English, relaxed pace. | I have already returned this purchase. | complete / complete |
| negation | Serious English. Emphasize not. | I have not returned this purchase yet. Help me prepare a checklist. | prepare / prepare |
| self-correction | Conversational English. Pause before Actually and emphasize instead. | Create a reminder. Actually, no. Draft a message to the merchant instead. | draft / draft |
| soft-voice | Soft spoken English, low but audible volume. | Why is this the deadline? Why is this the deadline? | explain / explain |
| arabic-accent-request | English with a mild Arabic accent, clear and natural. | Please draft a message to the merchant. Please draft a message to the merchant. | draft / draft |
| inline-control | Reassuring English, slow and clear. | Please help me prepare a return checklist. | prepare / prepare |

## Limitations

Two transcripts repeated their sentence; one omitted “Um”. The cause of repetitions has not been isolated between synthesis and recognition. No microphone, room noise, human accent, accessibility or real-user benefit validation was performed. Generated audio remains in local ignored evidence; no provider credentials are saved or published.

## Reproduction

Prepare the local speech and language models and start the app with `npm run dev`. Run `node scripts/eval-stepfun.mjs` to create the manifest without provider calls. After account and spending authorization, supply `STEPFUN_API_KEY` and `STEPFUN_SPENDING_APPROVED=yes` securely in the process environment and run with `--generate --evaluate`. Generation is capped at 12 attempts across runs, with no automatic retries. Existing clips can be evaluated with `--evaluate` without paid synthesis.

The conservative preflight estimate was USD 0.07254 at the documented USD 0.36/10,000 characters. Actual account billing was not verified.

Documentation: [model and pricing](https://platform.stepfun.ai/docs/en/guides/models/stepaudio-3-tts), [speech API](https://platform.stepfun.ai/docs/en/api-reference/audio/create-audio).
