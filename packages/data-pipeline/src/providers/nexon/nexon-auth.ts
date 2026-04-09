import { HttpClient } from "../../core/utils/http.client.js";
import type { IApiClientConfig } from "../../core/interfaces/client.interface.js";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const NEXON_OPEN_API_HOST = "https://open.api.nexon.com";

/** Rate Limiter 설정 */
interface RateLimitConfig {
  /** 최대 재시도 횟수 (기본 3) */
  maxRetries: number;
  /** 초기 대기 시간 ms (기본 1000) */
  baseDelayMs: number;
  /** 최대 대기 시간 ms (기본 30000) */
  maxDelayMs: number;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

/**
 * 넥슨 OpenAPI 전용 HTTP 클라이언트
 *
 * ## Rate Limit 정책
 * 넥슨 OpenAPI는 429(Too Many Requests) 응답 시 아래 헤더를 포함합니다:
 * - `x-ratelimit-limit`: 윈도우 당 최대 요청 수
 * - `x-ratelimit-remaining`: 남은 요청 수
 * - `x-ratelimit-reset`: 윈도우 리셋까지 남은 초(epoch seconds)
 *
 * 이 클라이언트는 429 응답 시 **지수 백오프(Exponential backoff) + jitter** 전략으로
 * 자동 재시도하며, 서버가 `x-ratelimit-reset` 헤더를 보내면 해당 시간만큼 대기합니다.
 */
export class NexonHttpClient extends HttpClient {
  private readonly rateLimitConfig: RateLimitConfig;

  constructor(config: IApiClientConfig, rateLimitOpts?: Partial<RateLimitConfig>) {
    super({
      baseURL: NEXON_OPEN_API_HOST,
      headers: {
        // 넥슨 API 전용 인증 헤더
        "x-nxopen-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
    });

    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimitOpts };

    // ── 429 Rate Limit 자동 재시도 인터셉터 ──────────────────
    this.http.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        return this.handleRateLimitRetry(error);
      }
    );
  }

  /**
   * 429 응답에 대한 지수 백오프 재시도 핸들러
   *
   * 재시도 카운트는 request config에 `__retryCount` 키로 저장하여 추적합니다.
   * 서버가 `x-ratelimit-reset` 헤더를 제공하면 해당 값 기반으로 대기하고,
   * 없으면 지수 백오프 + 랜덤 jitter를 적용합니다.
   */
  private async handleRateLimitRetry(error: AxiosError): Promise<unknown> {
    const { response, config } = error;

    // 429가 아니거나 config가 없으면 바로 reject
    if (!response || response.status !== 429 || !config) {
      return Promise.reject(error);
    }

    // 재시도 카운트 추적 (config에 커스텀 프로퍼티로 저장)
    const requestConfig = config as InternalAxiosRequestConfig & { __retryCount?: number };
    const retryCount = (requestConfig.__retryCount ?? 0) + 1;

    if (retryCount > this.rateLimitConfig.maxRetries) {
      console.error(
        `[NexonHttpClient] Rate limit 재시도 ${this.rateLimitConfig.maxRetries}회 초과. 요청 포기: ${config.url}`
      );
      return Promise.reject(error);
    }

    requestConfig.__retryCount = retryCount;

    // ── 대기 시간 계산 ─────────────────────────────────────────
    let delayMs: number;

    // 서버가 x-ratelimit-reset 헤더를 보낸 경우 (epoch seconds)
    const resetHeader = response.headers?.["x-ratelimit-reset"];
    if (resetHeader) {
      const resetEpochSec = Number(resetHeader);
      const nowSec = Math.floor(Date.now() / 1000);
      // 리셋 시간까지 대기 + 500ms 여유
      delayMs = Math.max((resetEpochSec - nowSec) * 1000 + 500, this.rateLimitConfig.baseDelayMs);
    } else {
      // 지수 백오프: base * 2^(retry-1) + jitter
      const exponentialDelay = this.rateLimitConfig.baseDelayMs * Math.pow(2, retryCount - 1);
      const jitter = Math.random() * this.rateLimitConfig.baseDelayMs * 0.5;
      delayMs = exponentialDelay + jitter;
    }

    // 최대 대기 시간 클램핑
    delayMs = Math.min(delayMs, this.rateLimitConfig.maxDelayMs);

    const remaining = response.headers?.["x-ratelimit-remaining"] ?? "?";
    const limit = response.headers?.["x-ratelimit-limit"] ?? "?";
    console.warn(
      `[NexonHttpClient] 429 Rate Limited ` +
        `(${remaining}/${limit} remaining). ` +
        `재시도 ${retryCount}/${this.rateLimitConfig.maxRetries} — ` +
        `${(delayMs / 1000).toFixed(1)}초 후 재시도...`
    );

    // 대기
    await this.sleep(delayMs);

    // 동일 요청 재시도
    return this.http.request(requestConfig);
  }

  /** Promise 기반 sleep 유틸리티 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
