export type StepSummaryResult = {
  steps: string[];
  source: "doubao" | "local_rules";
};

export type GeneratedDish = {
  dishName: string;
  ingredients: Array<{
    name: string;
    amount?: string;
    unit?: string;
    optional?: boolean;
  }>;
  steps: string[];
  cookTimeMinutes?: number;
  difficulty?: number;
  tags?: string[];
  missingIngredients?: string[];
};

export interface LlmProvider {
  summarizeSteps(input: { dishName: string; rawSteps: string[] }): Promise<StepSummaryResult>;
  generateRecommendDishes(input: {
    normalizedIngredients: string[];
    count: number;
  }): Promise<{ dishes: GeneratedDish[]; source: "doubao" }>;
  generateDishByName(input: {
    normalizedDishName: string;
  }): Promise<{ dish: GeneratedDish; source: "doubao" }>;
}
