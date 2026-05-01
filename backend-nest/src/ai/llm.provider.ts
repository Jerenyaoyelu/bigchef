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
    /** main=主料；secondary=配菜葱姜蒜淀粉蛋清等；seasoning=盐糖酱油料酒醋蚝油香料酱 */
    role?: "main" | "secondary" | "seasoning";
    /** 用户可能缺货需采购，与 role 无关 */
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
