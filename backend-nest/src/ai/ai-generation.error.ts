export class AiGenerationError extends Error {
  readonly code: string;

  constructor(message: string, code = "AI_GENERATION_FAILED") {
    super(message);
    this.name = "AiGenerationError";
    this.code = code;
  }
}
