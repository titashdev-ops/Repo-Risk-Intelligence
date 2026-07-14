/**
 * Repository Analysis Service
 * Business logic for repository data aggregation and analysis
 */

import { GitHubClient } from './github-client';
import type {
  Repository,
  Contributor,
  Commit,
  Branch,
  PullRequest,
  RepositoryStatistics,
  APIResponse,
  APIError,
} from '@types/github';

export interface RepositoryAnalysis {
  repository: Repository;
  contributors: Contributor[];
  commits: Commit[];
  branches: Branch[];
  pullRequests: PullRequest[];
  statistics: RepositoryStatistics;
}

export interface RepositoryAnalysisOptions {
  includeCommits?: boolean;
  includePRs?: boolean;
  commitLimit?: number;
  contributorLimit?: number;
}

export class RepositoryService {
  constructor(private client: GitHubClient) {}

  /**
   * Analyze a repository comprehensively
   */
  async analyzeRepository(
    owner: string,
    repo: string,
    options: RepositoryAnalysisOptions = {}
  ): Promise<RepositoryAnalysis> {
    const includeCommits = options.includeCommits !== false;
    const includePRs = options.includePRs !== false;
    const commitLimit = options.commitLimit || 100;
    const contributorLimit = options.contributorLimit || 100;

    try {
      // Fetch repository metadata
      const repoResponse = await this.client.getRepository(owner, repo);
      const repository = repoResponse.data;

      // Fetch contributors
      const contributorsResponse = await this.client.getContributors(owner, repo, {
        per_page: contributorLimit,
      });
      const contributors = contributorsResponse.data;

      // Fetch branches
      const branchesResponse = await this.client.getBranches(owner, repo);
      const branches = branchesResponse.data;

      // Fetch commits if requested
      let commits: Commit[] = [];
      if (includeCommits) {
        const commitsResponse = await this.client.getCommits(owner, repo, {
          per_page: commitLimit,
        });
        commits = commitsResponse.data;
      }

      // Fetch pull requests if requested
      let pullRequests: PullRequest[] = [];
      if (includePRs) {
        const prsResponse = await this.client.getPullRequests(owner, repo, {
          state: 'all',
          per_page: 100,
        });
        pullRequests = prsResponse.data;
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(
        repository,
        contributors,
        commits,
        pullRequests
      );

      return {
        repository,
        contributors,
        commits,
        branches,
        pullRequests,
        statistics,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate repository statistics
   */
  private calculateStatistics(
    repository: Repository,
    contributors: Contributor[],
    commits: Commit[],
    pullRequests: PullRequest[]
  ): RepositoryStatistics {
    const mergedPRs = pullRequests.filter((pr) => pr.merged).length;
    const totalCommits =
      commits.length > 0
        ? commits.length
        : 0; // API returns limited results

    return {
      forks: repository.forks_count,
      stargazers: repository.stargazers_count,
      watchers: repository.watchers_count,
      openIssues: repository.open_issues_count,
      totalCommits,
      totalContributors: contributors.length,
      primaryLanguage: repository.language,
    };
  }

  /**
   * Get repository risk indicators
   */
  getRiskIndicators(analysis: RepositoryAnalysis): {
    busFactor: number;
    concentrationIndex: number;
    healthScore: number;
  } {
    const { contributors, commits, pullRequests } = analysis;

    // Bus factor: minimum contributors to maintain 90% of code
    const busFactor = this.calculateBusFactor(contributors);

    // Knowledge concentration: how concentrated is contribution
    const concentrationIndex = this.calculateConcentrationIndex(contributors, commits);

    // Overall health score (0-100)
    const healthScore = this.calculateHealthScore(
      busFactor,
      concentrationIndex,
      contributors.length,
      pullRequests.length
    );

    return {
      busFactor,
      concentrationIndex,
      healthScore,
    };
  }

  /**
   * Calculate bus factor (minimum number of contributors for 90% code ownership)
   */
  private calculateBusFactor(contributors: Contributor[]): number {
    if (contributors.length === 0) return 0;

    const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
    const totalContributions = sorted.reduce((sum, c) => sum + c.contributions, 0);
    const threshold = totalContributions * 0.9;

    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      sum += sorted[i].contributions;
      if (sum >= threshold) {
        return i + 1;
      }
    }

    return sorted.length;
  }

  /**
   * Calculate knowledge concentration index (0-1, where 1 is highly concentrated)
   */
  private calculateConcentrationIndex(contributors: Contributor[], commits: Commit[]): number {
    if (contributors.length === 0) return 0;

    const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
    const topThreeContributions = sorted.slice(0, 3).reduce((sum, c) => sum + c.contributions, 0);
    const totalContributions = sorted.reduce((sum, c) => sum + c.contributions, 0);

    if (totalContributions === 0) return 0;

    const concentration = topThreeContributions / totalContributions;
    return Math.min(1, concentration);
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    busFactor: number,
    concentrationIndex: number,
    contributorCount: number,
    prCount: number
  ): number {
    let score = 100;

    // Deduct for low bus factor
    if (busFactor <= 1) score -= 50;
    else if (busFactor <= 2) score -= 30;
    else if (busFactor <= 3) score -= 15;

    // Deduct for high concentration
    score -= concentrationIndex * 30;

    // Add bonus for healthy contributor count
    if (contributorCount >= 5) score += 10;
    else if (contributorCount < 2) score -= 15;

    // Add bonus for PR activity
    if (prCount > 50) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private handleError(error: unknown): APIError {
    if (error instanceof Error && 'rateLimit' in error) {
      return error as APIError;
    }
    throw new Error(`Repository analysis failed: ${String(error)}`);
  }
}
