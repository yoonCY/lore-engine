import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

/**
 * 공통 HTTP 래퍼 클래스
 * 모든 Provider 모듈들이 공통으로 사용하는 HTTP 통신 로직 및 기초적인 예외 처리
 */
export class HttpClient {
  protected readonly http: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.http = axios.create({
      timeout: 10_000,
      ...config,
    });

    // 기본 인터셉터 설정 (Rate Limit이나 인증 재시도 등은 하위 클래스에서 오버라이드)
    this.http.interceptors.response.use(
      (res) => res,
      (error) => {
        // 공통 에러 로깅 (향후 Winston 등 로거 연동 가능)
        const status = error.response?.status;
        const url = error.config?.url;
        console.error(`[HttpClient] Error ${status} fetching ${url}: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  // HTTP 메서드 래퍼
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.http.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.http.post<T>(url, data, config);
    return response.data;
  }
}
