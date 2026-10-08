import "server-only";

export function isAiAvailable() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim() && process.env.TAVILY_API_KEY?.trim());
}

export function getAiConfiguration() {
  return {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? "",
    tavilyApiKey: process.env.TAVILY_API_KEY?.trim() ?? "",
    model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
  };
}
