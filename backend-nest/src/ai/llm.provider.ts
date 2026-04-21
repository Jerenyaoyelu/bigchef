export type StepSummaryResult = {
  steps: string[];
  source: "doubao" | "local_rules";
};

export interface LlmProvider {
  summarizeSteps(input: { dishName: string; rawSteps: string[] }): Promise<StepSummaryResult>;
}
