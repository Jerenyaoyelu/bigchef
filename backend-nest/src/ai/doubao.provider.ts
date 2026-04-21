import { Injectable } from "@nestjs/common";
import { LlmProvider, StepSummaryResult } from "./llm.provider";
import { summarizeStepsWithRules } from "./local-step-rules";

@Injectable()
export class DoubaoProvider implements LlmProvider {
  private readonly apiKey = process.env.ARK_API_KEY?.trim() || "";
  private readonly model = process.env.ARK_MODEL?.trim() || "doubao-seed-1-6-250615";
  private readonly baseUrl = (process.env.ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");

  async summarizeSteps(input: { dishName: string; rawSteps: string[] }): Promise<StepSummaryResult> {
    const fallback = { steps: summarizeStepsWithRules(input.dishName, input.rawSteps), source: "local_rules" as const };

    // If no key is configured, fall back to deterministic local summary.
    if (!this.apiKey) {
      return fallback;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "你是做饭助手，请把输入步骤压缩成5到8条、适合新手执行的简短步骤。每条不超过30字，只返回JSON数组。",
            },
            {
              role: "user",
              content: JSON.stringify({
                dishName: input.dishName,
                rawSteps: input.rawSteps,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Doubao HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Doubao returned empty content");
      }

      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) {
        const steps = parsed.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean);
        if (steps.length) return { steps: steps.slice(0, 8), source: "doubao" };
      }
      throw new Error("Doubao response is not string array JSON");
    } catch {
      // Keep service available even if AI provider fails.
      return fallback;
    }
  }
}
