/**
 * Risk Engine Utils
 * Utility functions for risk calculations
 */

import type { Commit, Contributor } from '@types/github';

export class RiskEngineUtils {
  /**
   * Calculate days since last activity
   */
  static daysSinceLastActivity(commits: Commit[]): number {
    if (commits.length === 0) return Infinity;

    const sorted = [...commits].sort(
      (a, b) =>
        new Date(b.commit.author.date).getTime() -
        new Date(a.commit.author.date).getTime()
    );

    const lastCommitDate = new Date(sorted[0].commit.author.date);
    return Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate repository age in days
   */
  static calculateRepositoryAge(firstCommitDate: string): number {
    return Math.floor(
      (Date.now() - new Date(firstCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Identify top contributors by activity
   */
  static getTopContributors(contributors: Contributor[], limit: number = 10): Contributor[] {
    return [...contributors]
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, limit);
  }

  /**
   * Calculate contribution distribution statistics
   */
  static getContributionStats(contributors: Contributor[]): {
    mean: number;
    median: number;
    stdev: number;
    min: number;
    max: number;
  } {
    if (contributors.length === 0) {
      return { mean: 0, median: 0, stdev: 0, min: 0, max: 0 };
    }

    const contributions = contributors.map((c) => c.contributions);
    const sorted = [...contributions].sort((a, b) => a - b);

    const mean = contributions.reduce((a, b) => a + b) / contributions.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const variance =
      contributions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / contributions.length;
    const stdev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  /**
   * Identify at-risk contributors (potential departures)
   */
  static identifyAtRiskContributors(
    commits: Commit[],
    contributors: Contributor[]
  ): Contributor[] {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentCommitAuthors = new Set(
      commits
        .filter((c) => new Date(c.commit.author.date) > threeMonthsAgo)
        .map((c) => c.author?.login)
        .filter((l): l is string => !!l)
    );

    return contributors.filter((c) => !recentCommitAuthors.has(c.login));
  }
}
