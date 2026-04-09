import { HttpClient } from "../../core/utils/http.client";
import type { IApiClientConfig } from "../../core/interfaces/client.interface";

const REGIONAL_HOSTS: Record<string, string> = {
  kr: "https://kr.api.riotgames.com",
  na1: "https://na1.api.riotgames.com",
  euw1: "https://euw1.api.riotgames.com",
  jp1: "https://jp1.api.riotgames.com",
};

export class RiotHttpClient extends HttpClient {
  constructor(config: IApiClientConfig) {
    const region = config.region ?? "kr";
    const baseURL = REGIONAL_HOSTS[region] ?? REGIONAL_HOSTS.kr;

    super({
      baseURL,
      headers: {
        "X-Riot-Token": config.apiKey,
        "Content-Type": "application/json",
      },
    });

    // Riot API 특화 Rate limit (429) 재시도 로직
    this.http.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = Number(error.response.headers["retry-after"] ?? 1) * 1000;
          console.warn(`[RiotHttpClient] Rate limited. Retrying after ${retryAfter}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return this.http.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
}
