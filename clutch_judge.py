"""
CLUTCH Hackathon Judge - Browser Use Script
"""
import asyncio
from browser_use.llm import ChatOpenAI
from browser_use import Agent

OPENROUTER_API_KEY = "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"

llm = ChatOpenAI(
    model="openai/gpt-4o",
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    temperature=0.1,
)

JUDGE_PROMPT = """
You are a hackathon judge evaluating CLUTCH at https://clutch-529610052804.us-central1.run.app/

Complete these steps IN ORDER and stop after step 7:

1. Take a screenshot of the landing page. Note first impression.
2. Click "See the demo flow" button.
3. Take a screenshot of the dashboard. Note what's shown.
4. Click the highest-risk task card (the one that says "Most likely to blow up").
5. Take a screenshot of the engage/intervention screen.
6. Answer any scope questions you see, then click the action button.
7. On the timer screen, click "I'm done", type "done with it" in the proof box, submit, and take a screenshot of the verdict.

After completing all steps, write a short report covering:
- First impression of landing page
- Dashboard clarity
- AI interaction quality
- Proof rejection experience
- Overall polish rating 1-10
"""

async def main():
    print("Starting CLUTCH Judge evaluation...")
    print("=" * 60)
    agent = Agent(
        task=JUDGE_PROMPT,
        llm=llm,
        max_actions_per_step=1,
    )
    result = await agent.run(max_steps=20)
    print("\n" + "=" * 60)
    print("JUDGE EVALUATION REPORT")
    print("=" * 60)
    print(result)
    with open("clutch_judge_report.txt", "w", encoding="utf-8") as f:
        f.write("CLUTCH HACKATHON JUDGE REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write(str(result))
    print("\nReport saved to clutch_judge_report.txt")

if __name__ == "__main__":
    asyncio.run(main())
