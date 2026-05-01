import { Injectable, Logger } from "@nestjs/common";
import { AiGenerationError } from "./ai-generation.error";
import { GeneratedDish, LlmProvider, StepSummaryResult } from "./llm.provider";
import { normalizeRoleFromModel } from "./ingredient-role.util";
import { summarizeStepsWithRules } from "./local-step-rules";

@Injectable()
export class DoubaoProvider implements LlmProvider {
  private readonly logger = new Logger(DoubaoProvider.name);
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

  async generateRecommendDishes(input: {
    normalizedIngredients: string[];
    count: number;
  }): Promise<{ dishes: GeneratedDish[]; source: "doubao" }> {
    this.logger.log(
      `[generateRecommendDishes] input normalizedIngredients=${JSON.stringify(input.normalizedIngredients)} count=${input.count} hasApiKey=${Boolean(this.apiKey)} model=${this.model}`,
    );
    if (!this.apiKey) {
      throw new AiGenerationError("未配置大模型 API Key（ARK_API_KEY），无法生成菜谱。", "AI_CONFIG_MISSING");
    }
    const count = Math.max(1, Math.min(3, input.count));
    const prompt = {
      scene: "recommend_by_ingredients",
      instructions: [
        "用户列出的是「家里已有」的食材。请推荐中餐家常菜，搭配要符合常识，不要为了把每一种食材都塞进同一道菜而硬凑怪菜。",
        "覆盖规则（重要）：输出的多道菜作为一个整体，应让用户给出的每一种食材至少在某一道菜里被使用到（作主辅料均可）；单道菜可以只用其中一部分食材，甚至一道菜只突出一种主料也可以。",
        "若某几种食材更适合拆成不同菜（例如一道偏荤、一道偏素），请这样分配，比强行大乱炖更受欢迎。",
        "dishName 须为真实、常见的具体菜名，2～14 个汉字为宜；严禁「快手菜1/2/3」、方案编号、占位、测试等敷衍命名。",
        "ingredients：写出该道菜实际用到的料；用户已有但未在本道菜使用的不要写进本道菜；用户没有而菜谱需要的料仍写在 ingredients 里。每项必填 role（main|secondary|seasoning）：main=主料蛋白或主体蔬菜；secondary=配菜、葱姜蒜、淀粉蛋清等上浆腌制料；seasoning=盐糖酱油醋料酒蚝油豆瓣酱干辣椒花椒八角等调料与干香料。不要把盐糖酱油写在 secondary 导致 seasoning 为空。optional 仅表示「用户家里可能缺、需采购」，与 role 无关。",
        "missingIngredients：仅填「做这道菜还需要、且不在用户已给食材列表里」的料（用户缺的采购项）；用户已拥有的食材不要出现在 missingIngredients。",
        "steps 写 3～8 条，每条一句，可操作、面向新手；步骤里若写明了加热/焖炖时间（如「炖20分钟」），须与 cookTimeMinutes 一致。",
        "cookTimeMinutes：必填整数（分钟），表示从备料完成到可装盘食用的总耗时，须与步骤描述相符，不要固定写 20。可参考：快炒/小炒类多 12～28 分钟；烧焖炖煲类多 35～75 分钟；简单汤羹 25～50 分钟；凉拌/快手素菜可 15～25 分钟。上限一般不超过 90，除非步骤明确长时间炖煮。",
        `请恰好输出 ${count} 道菜，结构符合 outputSchema，顶层字段为 { \"dishes\": [...] }。`,
      ],
      normalizedIngredients: input.normalizedIngredients,
      count,
      outputSchema: {
        dishes: [
          {
            dishName: "string",
            ingredients: [
              {
                name: "string",
                amount: "string",
                unit: "string",
                role: "main",
                optional: false,
              },
            ],
            steps: ["string"],
            cookTimeMinutes: 20,
            difficulty: 2,
            tags: ["家常", "下饭"],
            missingIngredients: ["string"],
          },
        ],
      },
    };
    const systemRule =
      "仅输出一个 JSON 对象，不要 Markdown、不要代码围栏、不要解释性文字。字段与示例结构一致，内容用简体中文。";
    let content: string;
    try {
      content = await this.chatJson(prompt, systemRule, "generateRecommendDishes");
    } catch (err) {
      this.logger.error(
        `[generateRecommendDishes] 请求失败: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new AiGenerationError(
        err instanceof Error ? `大模型请求失败：${err.message}` : "大模型请求失败。",
        "AI_UPSTREAM_ERROR",
      );
    }
    this.logger.log(
      `[generateRecommendDishes] model raw content length=${content.length} preview=${content.slice(0, 2000)}${content.length > 2000 ? "…" : ""}`,
    );
    let parsed: unknown;
    try {
      parsed = this.parseJsonObject(content);
    } catch (err) {
      this.logger.error(
        `[generateRecommendDishes] JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new AiGenerationError("大模型返回内容不是合法 JSON，无法解析。", "AI_PARSE_ERROR");
    }
    const dishes = this.toGeneratedDishList((parsed as { dishes?: unknown })?.dishes);
    if (!dishes.length) {
      this.logger.warn(
        `[generateRecommendDishes] 解析后无有效菜品，parsed.dishes=${JSON.stringify((parsed as { dishes?: unknown }).dishes)?.slice(0, 500)}`,
      );
      throw new AiGenerationError(
        "大模型返回中没有可用的菜谱（需满足：菜名非空、步骤至少 3 条、至少 1 种食材）。",
        "AI_EMPTY_RESULT",
      );
    }
    this.logger.log(`[generateRecommendDishes] 成功解析 ${dishes.length} 道菜: ${dishes.map((d) => d.dishName).join("；")}`);
    return { dishes: dishes.slice(0, 3), source: "doubao" };
  }

  async generateDishByName(input: {
    normalizedDishName: string;
  }): Promise<{ dish: GeneratedDish; source: "doubao" }> {
    if (!this.apiKey) {
      throw new AiGenerationError("未配置大模型 API Key（ARK_API_KEY），无法生成菜谱。", "AI_CONFIG_MISSING");
    }
    const prompt = {
      scene: "search_dish_by_name",
      instructions: [
        "按中餐习惯拆分食材。ingredients 每一项必填 role，取值 main|secondary|seasoning：",
        "main：菜名对应的主体料（如肉片、鱼块、鸡丁、豆腐主料等）。",
        "secondary：配菜、豆芽白菜等配锅料，以及葱姜片蒜、淀粉、蛋清等加工辅料。",
        "seasoning：盐、糖、生抽老抽、料酒、醋、蚝油、豆瓣酱、干辣椒花椒八角桂皮香叶、鸡精味精等；不要把它们放进 secondary。",
        "optional 只表示家庭是否常备、是否需采购，与分类无关；必备盐酱油也必须 role=seasoning。",
        "调味料通常多条，seasoning 不得为空数组。",
      ],
      normalizedDishName: input.normalizedDishName,
      outputSchema: {
        dish: {
          dishName: "string",
          ingredients: [
            { name: "string", amount: "string", unit: "string", role: "seasoning", optional: false },
          ],
          steps: ["string"],
          cookTimeMinutes: 20,
          difficulty: 2,
          tags: ["家常"],
        },
      },
    };
    let content: string;
    try {
      content = await this.chatJson(
        prompt,
        "仅返回JSON对象，禁止Markdown。ingredients 每项必须含合法 role 字段。",
        "generateDishByName",
      );
    } catch (err) {
      this.logger.error(
        `[generateDishByName] 请求失败: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new AiGenerationError(
        err instanceof Error ? `大模型请求失败：${err.message}` : "大模型请求失败。",
        "AI_UPSTREAM_ERROR",
      );
    }
    let parsed: unknown;
    try {
      parsed = this.parseJsonObject(content);
    } catch (err) {
      throw new AiGenerationError("大模型返回内容不是合法 JSON，无法解析。", "AI_PARSE_ERROR");
    }
    const list = this.toGeneratedDishList((parsed as { dish?: unknown }).dish ? [(parsed as { dish: unknown }).dish] : []);
    if (!list.length) {
      throw new AiGenerationError(
        "大模型未返回可用的菜谱详情（需满足：菜名非空、步骤至少 3 条、至少 1 种食材）。",
        "AI_EMPTY_RESULT",
      );
    }
    return { dish: list[0], source: "doubao" };
  }

  private async chatJson(userPayload: unknown, systemRule: string, logLabel = "chatJson") {
    const body = {
      model: this.model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `你是烹饪结构化生成助手。${systemRule}`,
        },
        {
          role: "user",
          content: JSON.stringify(userPayload),
        },
      ],
    };
    const reqStr = JSON.stringify(body);
    this.logger.log(
      `[${logLabel}] POST ${this.baseUrl}/chat/completions request=${reqStr.length > 8000 ? `${reqStr.slice(0, 8000)}…(len=${reqStr.length})` : reqStr}`,
    );
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      this.logger.warn(`[${logLabel}] HTTP ${response.status} body=${errText.slice(0, 1500)}`);
      throw new Error(`Doubao HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Doubao returned empty content");
    return content;
  }

  private parseJsonObject(content: string): any {
    const trimmed = content.trim();
    const raw = trimmed.startsWith("```") ? trimmed.replace(/^```json\s*/i, "").replace(/```$/, "").trim() : trimmed;
    return JSON.parse(raw);
  }

  private toGeneratedDishList(input: unknown): GeneratedDish[] {
    if (!Array.isArray(input)) return [];
    const list: GeneratedDish[] = [];
    for (const item of input) {
      if (!item || typeof item !== "object") continue;
      const dishName = this.cleanText((item as any).dishName);
      const steps = Array.isArray((item as any).steps)
        ? (item as any).steps.map((s: unknown) => this.cleanText(s)).filter(Boolean)
        : [];
      const ingredients = Array.isArray((item as any).ingredients)
        ? (item as any).ingredients
            .map((v: any) => ({
              name: this.cleanText(v?.name),
              amount: this.cleanText(v?.amount),
              unit: this.cleanText(v?.unit),
              role: normalizeRoleFromModel(v?.role),
              optional: !!v?.optional,
            }))
            .filter((v: { name: string }) => !!v.name)
        : [];
      if (!dishName || steps.length < 3 || ingredients.length < 1) continue;
      const rawCook = this.numCookMinutes((item as any).cookTimeMinutes);
      const rawDifficulty = this.numDifficulty((item as any).difficulty);
      list.push({
        dishName,
        steps: steps.slice(0, 8),
        ingredients,
        cookTimeMinutes: this.reconcileCookTimeMinutes(steps, dishName, rawCook, rawDifficulty),
        difficulty: rawDifficulty,
        tags: Array.isArray((item as any).tags)
          ? (item as any).tags.map((s: unknown) => this.cleanText(s)).filter(Boolean).slice(0, 3)
          : [],
        missingIngredients: Array.isArray((item as any).missingIngredients)
          ? (item as any).missingIngredients.map((s: unknown) => this.cleanText(s)).filter(Boolean).slice(0, 5)
          : [],
      });
    }
    return list;
  }

  private cleanText(input: unknown) {
    return typeof input === "string" ? input.trim() : "";
  }

  /** 模型给出的烹饪分钟数，先做安全裁剪（允许炖菜略长）。 */
  private numCookMinutes(input: unknown) {
    const num = Number(input);
    if (!Number.isFinite(num)) return undefined;
    return Math.max(5, Math.min(180, Math.round(num)));
  }

  /** 难度 1～5。 */
  private numDifficulty(input: unknown) {
    const num = Number(input);
    if (!Number.isFinite(num)) return undefined;
    return Math.max(1, Math.min(5, Math.round(num)));
  }

  /**
   * 结合步骤里写明的「N分钟」、菜名/步骤里的烹饪方式关键词，校准总时长，避免与步骤矛盾或过离谱。
   */
  private reconcileCookTimeMinutes(
    steps: string[],
    dishName: string,
    modelMinutes: number | undefined,
    difficulty: number | undefined,
  ): number {
    const text = `${dishName}\n${steps.join("\n")}`;
    const minuteNums = [...text.matchAll(/(\d+)\s*分钟/g)]
      .map((m) => parseInt(m[1]!, 10))
      .filter((n) => n > 0 && n <= 240);
    const sumFromSteps = minuteNums.reduce((a, b) => a + b, 0);
    const maxFromSteps = minuteNums.length ? Math.max(...minuteNums) : 0;
    // 步骤里多个阶段写了时间时，取「求和」与「单步最大」的较大者，更贴近总灶时；并设上限避免误解析爆炸
    const fromExplicitSteps = minuteNums.length ? Math.min(150, Math.max(sumFromSteps, maxFromSteps)) : 0;

    const longBraise = /炖|焖|煲|砂锅|红烧|卤煮|慢炖|煨|熬制/.test(text);
    const stirFry = /快炒|爆炒|清炒|小炒|滑炒|干煸/.test(text) && !longBraise;
    const soup = /汤|羹|煲粥|煮粥/.test(text);
    const cold = /凉拌|冷吃|即食|腌制\s*\d+\s*小时|腌制过夜/.test(text);
    const steam = /蒸/.test(text);

    let floor = 12;
    if (longBraise) floor = 32;
    else if (soup) floor = 22;
    else if (steam) floor = 16;
    else if (cold) floor = 15;
    else if (stirFry) floor = 12;

    let candidate = modelMinutes ?? 0;
    if (fromExplicitSteps > 0) {
      // 步骤中的「N分钟」之和略上浮，覆盖备料与收汁等未写死分钟的部分
      candidate = Math.max(candidate, Math.round(fromExplicitSteps * 1.15));
    }
    candidate = Math.max(candidate, floor);

    if (difficulty != null && difficulty >= 4) {
      candidate = Math.max(candidate, longBraise ? 40 : 28);
    }

    // 仅对明显快炒类压上限，避免炖菜被误标成难度 1～2 而砍时间
    if (stirFry && !longBraise && !soup) {
      candidate = Math.min(candidate, 42);
      if (difficulty === 1) candidate = Math.min(candidate, 32);
      if (difficulty === 2) candidate = Math.min(candidate, 40);
    }

    if (!candidate || candidate < floor) candidate = floor;

    return Math.round(Math.min(180, Math.max(10, candidate)));
  }
}
