export class GenerationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

// Provider bodies can contain request data and credentials. Never return them.
export function publicGenerationError(error: unknown) {
  if (error instanceof GenerationError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return {
      code: "TIMEOUT",
      message: "생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      status: 504,
    };
  }

  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? error.statusCode
      : undefined;
  if (status === 401 || status === 403) {
    return {
      code: "PROVIDER_AUTH",
      message: "AI 서비스 인증에 실패했습니다. 서버의 API 키 설정을 확인해 주세요.",
      status: 502,
    };
  }
  if (status === 402) {
    return {
      code: "INSUFFICIENT_BALANCE",
      message: "DeepSeek 계정의 API 사용 잔액이 부족합니다. 잔액을 확인한 뒤 다시 시도해 주세요.",
      status: 402,
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMIT",
      message: "AI 서비스의 요청 또는 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
      status: 429,
    };
  }
  if (name.includes("NoObjectGenerated") || name.includes("TypeValidation")) {
    return {
      code: "INVALID_AI_OUTPUT",
      message: "AI가 올바른 학습 데이터를 생성하지 못했습니다. 다시 시도해 주세요.",
      status: 502,
    };
  }
  return {
    code: "GENERATION_FAILED",
    message: "학습 코스를 생성하지 못했습니다. 연결과 서버 설정을 확인한 뒤 다시 시도해 주세요.",
    status: 502,
  };
}
