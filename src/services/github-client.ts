/**
 * GitHub REST API Client
 * Type-safe HTTP client for GitHub API integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  GitHubRateLimitInfo,
  APIResponse,
  APIError,
  Repository,
  User,
  Contributor,
  Commit,
  Branch,
  PullRequest,
  RepositorySearchResult,
} from '@types/github';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const DEFAULT_TIMEOUT = 10000;

export class GitHubClient {
  private client: AxiosInstance;
  private token?: string;
  private rateLimitInfo: GitHubRateLimitInfo = {
    limit: 60,
    remaining: 60,
    reset: 0,
  };

  constructor(token?: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: GITHUB_API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: this.getHeaders(),
    });

    // Add response interceptor to track rate limits
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimit(response.headers);
        return response;
      },
      (error) => {
        if (error.response?.headers) {
          this.updateRateLimit(error.response.headers);
        }
        throw error;
      }
    );
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Repo-Risk-Intelligence',
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  private updateRateLimit(headers: Record<string, string>): void {
    const limit = parseInt(headers['x-ratelimit-limit'] || '60', 10);
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '60', 10);
    const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10);

    this.rateLimitInfo = {
      limit,
      remaining,
      reset,
    };
  }

  private getRateLimitInfo(): GitHubRateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  private handleError(error: unknown): APIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const apiError = new Error(error.message) as APIError;
      apiError.status = axiosError.response?.status;
      apiError.rateLimit = this.getRateLimitInfo();

      if (axiosError.response?.data) {
        apiError.details = axiosError.response.data as any;
      }

      // Handle rate limit errors
      if (apiError.status === 403 && apiError.rateLimit) {
        const resetTime = new Date(apiError.rateLimit.reset * 1000);
        const now = new Date();
        const retryAfterMs = Math.max(0, resetTime.getTime() - now.getTime());
        apiError.rateLimit.retryAfter = Math.ceil(retryAfterMs / 1000);
      }

      return apiError;
    }

    const apiError = new Error(String(error)) as APIError;
    apiError.rateLimit = this.getRateLimitInfo();
    return apiError;
  }

  /**
   * Search for repositories
   */
  async searchRepositories(
    query: string,
    options?: { per_page?: number; page?: number; sort?: string; order?: string }
  ): Promise<APIResponse<RepositorySearchResult>> {
    try {
      const params = {
        q: query,
        per_page: options?.per_page || 30,
        page: options?.page || 1,
        sort: options?.sort || 'stars',
        order: options?.order || 'desc',
      };

      const response = await this.client.get('/search/repositories', { params });
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<APIResponse<Repository>> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get repository contributors
   */
  async getContributors(
    owner: string,
    repo: string,
    options?: { per_page?: number; page?: number }
  ): Promise<APIResponse<Contributor[]>> {
    try {
      const params = {
        per_page: options?.per_page || 100,
        page: options?.page || 1,
        anon: 'false',
      };

      const response = await this.client.get(`/repos/${owner}/${repo}/contributors`, {
        params,
      });
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get commit history
   */
  async getCommits(
    owner: string,
    repo: string,
    options?: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      per_page?: number;
      page?: number;
    }
  ): Promise<APIResponse<Commit[]>> {
    try {
      const params = {
        sha: options?.sha,
        path: options?.path,
        author: options?.author,
        since: options?.since,
        until: options?.until,
        per_page: options?.per_page || 30,
        page: options?.page || 1,
      };

      const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined)
        ),
      });
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get repository branches
   */
  async getBranches(
    owner: string,
    repo: string,
    options?: { per_page?: number; page?: number }
  ): Promise<APIResponse<Branch[]>> {
    try {
      const params = {
        per_page: options?.per_page || 30,
        page: options?.page || 1,
      };

      const response = await this.client.get(`/repos/${owner}/${repo}/branches`, {
        params,
      });
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get pull requests
   */
  async getPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      per_page?: number;
      page?: number;
      sort?: string;
      direction?: string;
    }
  ): Promise<APIResponse<PullRequest[]>> {
    try {
      const params = {
        state: options?.state || 'open',
        per_page: options?.per_page || 30,
        page: options?.page || 1,
        sort: options?.sort || 'updated',
        direction: options?.direction || 'desc',
      };

      const response = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
        params,
      });
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user information
   */
  async getUser(username: string): Promise<APIResponse<User>> {
    try {
      const response = await this.client.get(`/users/${username}`);
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get authenticated user
   */
  async getAuthenticatedUser(): Promise<APIResponse<User>> {
    try {
      const response = await this.client.get('/user');
      return {
        data: response.data,
        rateLimit: this.getRateLimitInfo(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimit(): GitHubRateLimitInfo {
    return this.getRateLimitInfo();
  }

  /**
   * Check if rate limited
   */
  isRateLimited(): boolean {
    return this.rateLimitInfo.remaining === 0;
  }
}

// Export singleton instance
export const createGitHubClient = (token?: string): GitHubClient => {
  return new GitHubClient(token);
};
