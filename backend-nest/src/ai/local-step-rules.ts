export function summarizeStepsWithRules(dishName: string, rawSteps: string[]): string[] {
  const normalized = rawSteps
    .map((step) => normalizeStep(step))
    .filter(Boolean)
    .filter((step, index, arr) => arr.indexOf(step) === index);

  if (!normalized.length) {
    return [`${dishName} 暂无结构化步骤，建议先查看视频教程。`];
  }

  return normalized.slice(0, 8);
}

function normalizeStep(step: string): string {
  const trimmed = step.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}

