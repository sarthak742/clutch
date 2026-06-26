# Vibe2Ship Submission Checklist

Based on the mentor session transcript, the final submission needs three links:

1. Deployed application link
   - Must be a functional application.
   - Must be deployed on Google Cloud.
   - Google AI Studio is recommended, but not mandatory.

2. GitHub repository link
   - Must contain the source code for this solution.
   - Must include documentation and credits for open-source libraries, models, APIs, and inspirations used.

3. Google Doc project description link
   - Must be accessible to anyone with the link.
   - Should include the selected problem statement, solution overview, key features, technologies used, Google technologies used, and credits.
   - Optional supporting materials such as screenshots or demo video links can be included.
   - After submission, do not modify the Google Doc because organizers may inspect version history.

## CLUTCH Positioning

Problem Statement 1: "The Last-Minute Life Saver"

CLUTCH solves the problem as a proactive AI accountability companion. It does not stop at reminders. It parses a user's messy workload, identifies what is most likely to fail, asks task-specific scope questions, generates the first useful artifact with Gemini, starts a timed commitment, and verifies proof before logging completion.

The agentic depth comes from the observe -> diagnose -> generate -> commit -> verify pipeline, behavioral memory, and a visible audit trail. The core loop remains deterministic so the live demo is reliable. The optional "Plan my day" action is the narrow place where the project uses Gemini SDK function-calling.

## Google Usage

- Gemini 2.5 Flash via `@google/genai`
- Multimodal proof review with text and image evidence
- Gemini functionDeclarations in the optional day-planning action
- Google Cloud Run deployment target
- Google Doc project description for submission
