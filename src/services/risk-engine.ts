/**
 * Engineering Risk Engine
 * Comprehensive metrics for repository health analysis
 */

import type { Contributor, Commit, PullRequest } from '@types/github';

export interface RiskMetric {
  score: number; // 0-100
  level: 'critical' | 'high' | 'medium' | 'low';
  explanation: string;
  recommendation: string;
}

export interface BusFactorMetric extends RiskMetric {
  minimumContributors: number;
  contributionThreshold: number;
}

export interface OwnershipConcentrationMetric extends RiskMetric {
  topThreePercentage: number;
  topTenPercentage: number;
  gini: number; // Gini coefficient (0-1)
}

export interface ContributorDependencyMetric extends RiskMetric {
  activeContributors: number;
  inactiveContributors: number;
  turnoverRisk: number;
}

export interface RepositoryHealthMetric extends RiskMetric {
  maintenanceStatus: 'active' | 'maintained' | 'stale';
  lastCommitDays: number;
  avgCommitFrequency: number;
}

export interface CollaborationIndexMetric extends RiskMetric {
  reviewCulture: number;
  peerReviewRate: number;
  collaborationScore: number;
}

export interface KnowledgeConcentrationMetric extends RiskMetric {
  fileOwnershipDistribution: number;
  knowledgeHotspots: number;
  busFactor: number;
}

export interface RiskEngineOutput {
  busFactor: BusFactorMetric;
  ownership: OwnershipConcentrationMetric;
  dependency: ContributorDependencyMetric;
  health: RepositoryHealthMetric;
  collaboration: CollaborationIndexMetric;
  knowledge: KnowledgeConcentrationMetric;
  overallRisk: RiskMetric;
  timestamp: string;
}

export interface AnalysisContext {
  contributors: Contributor[];
  commits: Commit[];
  pullRequests: PullRequest[];
  repositoryAge: number; // days
}

export class EngineeringRiskEngine {
  /**
   * Analyze repository and generate comprehensive risk metrics
   */
  static analyzeRepository(context: AnalysisContext): RiskEngineOutput {
    const busFactor = this.calculateBusFactor(context.contributors);
    const ownership = this.calculateOwnershipConcentration(context.contributors);
    const dependency = this.calculateContributorDependency(context.contributors, context.commits);
    const health = this.calculateRepositoryHealth(context.commits, context.repositoryAge);
    const collaboration = this.calculateCollaborationIndex(context.pullRequests, context.contributors);
    const knowledge = this.calculateKnowledgeConcentration(context.contributors, context.commits);
    const overallRisk = this.calculateOverallRisk(busFactor, ownership, dependency, health, collaboration, knowledge);

    return {
      busFactor,
      ownership,
      dependency,
      health,
      collaboration,
      knowledge,
      overallRisk,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate Bus Factor
   * Minimum number of contributors needed to maintain 90% of code
   */
  private static calculateBusFactor(contributors: Contributor[]): BusFactorMetric {
    if (contributors.length === 0) {
      return {
        score: 0,
        level: 'critical',
        minimumContributors: 0,
        contributionThreshold: 90,
        explanation: 'No contributors found. Repository appears abandoned.',
        recommendation: 'Verify repository is active or archive if deprecated.',
      };
    }

    const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
    const totalContributions = sorted.reduce((sum, c) => sum + c.contributions, 0);
    const threshold = totalContributions * 0.9;

    let minimumContributors = 0;
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      sum += sorted[i].contributions;
      minimumContributors = i + 1;
      if (sum >= threshold) break;
    }

    const score = Math.max(0, 100 - minimumContributors * 20);
    const level = this.determineLevel(score);

    return {
      score,
      level,
      minimumContributors,
      contributionThreshold: 90,
      explanation: `${minimumContributors} contributor(s) responsible for 90% of codebase. ${minimumContributors === 1 ? 'Critical single point of failure.' : minimumContributors <= 2 ? 'High dependency risk.' : 'Moderate risk level.'}`,
      recommendation: this.getBufferRecommendation(minimumContributors),
    };
  }

  /**
   * Calculate Ownership Concentration
   * Measures how distributed or concentrated code ownership is
   */
  private static calculateOwnershipConcentration(contributors: Contributor[]): OwnershipConcentrationMetric {
    if (contributors.length === 0) {
      return {
        score: 0,
        level: 'critical',
        topThreePercentage: 0,
        topTenPercentage: 0,
        gini: 0,
        explanation: 'No ownership data available.',
        recommendation: 'Ensure repository has active contributors.',
      };
    }

    const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
    const totalContributions = sorted.reduce((sum, c) => sum + c.contributions, 0);

    const topThreeContributions = sorted.slice(0, 3).reduce((sum, c) => sum + c.contributions, 0);
    const topTenContributions = sorted.slice(0, 10).reduce((sum, c) => sum + c.contributions, 0);

    const topThreePercentage = (topThreeContributions / totalContributions) * 100;
    const topTenPercentage = (topTenContributions / totalContributions) * 100;

    const gini = this.calculateGiniCoefficient(sorted.map(c => c.contributions));

    // Score calculation: lower concentration = higher score
    let score = 100;
    score -= topThreePercentage * 0.3; // Top 3 impact
    score -= gini * 50; // Gini coefficient impact
    score = Math.max(0, Math.min(100, score));

    const level = this.determineLevel(score);

    return {
      score,
      level,
      topThreePercentage,
      topTenPercentage,
      gini,
      explanation: `Top 3 contributors own ${topThreePercentage.toFixed(1)}% of contributions. Gini coefficient: ${gini.toFixed(3)}. ${topThreePercentage > 60 ? 'Highly concentrated ownership.' : topThreePercentage > 40 ? 'Moderately concentrated.' : 'Well distributed ownership.'}`,
      recommendation: this.getOwnershipRecommendation(topThreePercentage, topTenPercentage),
    };
  }

  /**
   * Calculate Contributor Dependency
   * Measures risk from key person dependencies
   */
  private static calculateContributorDependency(
    contributors: Contributor[],
    commits: Commit[]
  ): ContributorDependencyMetric {
    if (contributors.length === 0) {
      return {
        score: 0,
        level: 'critical',
        activeContributors: 0,
        inactiveContributors: 0,
        turnoverRisk: 100,
        explanation: 'No contributors detected.',
        recommendation: 'Activate repository or archive if deprecated.',
      };
    }

    // Identify active vs inactive contributors (activity in last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentCommits = commits.filter(
      (c) => new Date(c.commit.author.date) > threeMonthsAgo
    );

    const activeLogins = new Set(
      recentCommits
        .map((c) => c.author?.login)
        .filter((l): l is string => !!l)
    );

    const activeContributors = activeLogins.size;
    const inactiveContributors = contributors.length - activeContributors;
    const turnoverRisk = (inactiveContributors / contributors.length) * 100;

    const score = Math.max(0, 100 - turnoverRisk * 0.5);
    const level = this.determineLevel(score);

    return {
      score,
      level,
      activeContributors,
      inactiveContributors,
      turnoverRisk,
      explanation: `${activeContributors} active contributors (last 3 months), ${inactiveContributors} inactive. ${turnoverRisk > 50 ? 'High churn risk.' : 'Stable team.'}`,
      recommendation: this.getDependencyRecommendation(activeContributors, inactiveContributors),
    };
  }

  /**
   * Calculate Repository Health
   * Measures maintenance activity and vitality
   */
  private static calculateRepositoryHealth(
    commits: Commit[],
    repositoryAge: number
  ): RepositoryHealthMetric {
    if (commits.length === 0) {
      return {
        score: 0,
        level: 'critical',
        maintenanceStatus: 'stale',
        lastCommitDays: repositoryAge,
        avgCommitFrequency: 0,
        explanation: 'No commits detected. Repository appears abandoned.',
        recommendation: 'Archive repository or resume active development.',
      };
    }

    const sorted = [...commits].sort(
      (a, b) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
    );

    const lastCommitDate = new Date(sorted[0].commit.author.date);
    const lastCommitDays = Math.floor(
      (Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const avgCommitFrequency =
      repositoryAge > 0 ? commits.length / (repositoryAge / 30) : commits.length;

    let maintenanceStatus: 'active' | 'maintained' | 'stale';
    if (lastCommitDays <= 30) {
      maintenanceStatus = 'active';
    } else if (lastCommitDays <= 180) {
      maintenanceStatus = 'maintained';
    } else {
      maintenanceStatus = 'stale';
    }

    let score = 100;
    score -= Math.min(50, lastCommitDays / 3);
    score -= Math.max(0, 30 - avgCommitFrequency * 2);
    score = Math.max(0, Math.min(100, score));

    const level = this.determineLevel(score);

    return {
      score,
      level,
      maintenanceStatus,
      lastCommitDays,
      avgCommitFrequency,
      explanation: `${maintenanceStatus} repository. Last commit ${lastCommitDays} days ago. Average ${avgCommitFrequency.toFixed(1)} commits/month.`,
      recommendation: this.getHealthRecommendation(maintenanceStatus, lastCommitDays),
    };
  }

  /**
   * Calculate Collaboration Index
   * Measures code review culture and collaboration patterns
   */
  private static calculateCollaborationIndex(
    pullRequests: PullRequest[],
    contributors: Contributor[]
  ): CollaborationIndexMetric {
    if (pullRequests.length === 0 || contributors.length === 0) {
      return {
        score: 30,
        level: 'high',
        reviewCulture: 0,
        peerReviewRate: 0,
        collaborationScore: 30,
        explanation: 'No pull requests found. Code review culture may be weak.',
        recommendation: 'Establish mandatory code review process via pull requests.',
      };
    }

    const mergedPRs = pullRequests.filter((pr) => pr.merged).length;
    const closedPRs = pullRequests.filter((pr) => pr.state === 'closed' && !pr.merged).length;
    const mergingContributors = new Set(
      pullRequests
        .filter((pr) => pr.merged_by)
        .map((pr) => pr.merged_by?.login)
        .filter((l): l is string => !!l)
    );

    const reviewCulture = (mergedPRs / pullRequests.length) * 100;
    const peerReviewRate = (mergingContributors.size / contributors.length) * 100;
    const collaborationScore = (reviewCulture * 0.6 + peerReviewRate * 0.4);

    const score = Math.min(100, collaborationScore);
    const level = this.determineLevel(score);

    return {
      score,
      level,
      reviewCulture,
      peerReviewRate,
      collaborationScore,
      explanation: `${reviewCulture.toFixed(1)}% PR merge rate, ${peerReviewRate.toFixed(1)}% contributors merge code. ${peerReviewRate > 50 ? 'Good collaboration.' : 'Limited peer review participation.'}`,
      recommendation: this.getCollaborationRecommendation(reviewCulture, peerReviewRate),
    };
  }

  /**
   * Calculate Knowledge Concentration
   * Measures how knowledge is distributed across codebase
   */
  private static calculateKnowledgeConcentration(
    contributors: Contributor[],
    commits: Commit[]
  ): KnowledgeConcentrationMetric {
    if (contributors.length === 0 || commits.length === 0) {
      return {
        score: 0,
        level: 'critical',
        fileOwnershipDistribution: 0,
        knowledgeHotspots: 0,
        busFactor: 0,
        explanation: 'Insufficient data for knowledge concentration analysis.',
        recommendation: 'Build repository with diverse contributor base.',
      };
    }

    // Analyze commit distribution by file patterns
    const filePatterns = new Map<string, Set<string>>();

    commits.forEach((commit) => {
      if (commit.author?.login) {
        // Extract common file patterns (simplified)
        const pattern = 'general'; // Simplified for demo
        if (!filePatterns.has(pattern)) {
          filePatterns.set(pattern, new Set());
        }
        filePatterns.get(pattern)!.add(commit.author.login);
      }
    });

    const knowledgeHotspots = Array.from(filePatterns.values()).filter((owners) => owners.size <= 2).length;
    const totalPatterns = filePatterns.size;
    const fileOwnershipDistribution = totalPatterns > 0 ? (totalPatterns - knowledgeHotspots) / totalPatterns * 100 : 0;

    // Calculate bus factor component
    const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);
    const busFactor = sorted[0].contributions / sorted.reduce((sum, c) => sum + c.contributions, 0);

    let score = 100;
    score -= knowledgeHotspots * 5;
    score -= busFactor * 50;
    score = Math.max(0, Math.min(100, score));

    const level = this.determineLevel(score);

    return {
      score,
      level,
      fileOwnershipDistribution,
      knowledgeHotspots,
      busFactor: sorted[0].contributions,
      explanation: `${knowledgeHotspots} knowledge hotspots detected. ${fileOwnershipDistribution.toFixed(1)}% of code areas have distributed ownership.`,
      recommendation: this.getKnowledgeRecommendation(knowledgeHotspots, fileOwnershipDistribution),
    };
  }

  /**
   * Calculate Overall Risk Score
   */
  private static calculateOverallRisk(
    busFactor: BusFactorMetric,
    ownership: OwnershipConcentrationMetric,
    dependency: ContributorDependencyMetric,
    health: RepositoryHealthMetric,
    collaboration: CollaborationIndexMetric,
    knowledge: KnowledgeConcentrationMetric
  ): RiskMetric {
    const weights = {
      busFactor: 0.25,
      ownership: 0.20,
      dependency: 0.20,
      health: 0.15,
      collaboration: 0.10,
      knowledge: 0.10,
    };

    const weightedScore =
      busFactor.score * weights.busFactor +
      ownership.score * weights.ownership +
      dependency.score * weights.dependency +
      health.score * weights.health +
      collaboration.score * weights.collaboration +
      knowledge.score * weights.knowledge;

    const level = this.determineLevel(weightedScore);

    return {
      score: Math.round(weightedScore),
      level,
      explanation: `Overall engineering risk assessment. Weighted composite of all metrics.`,
      recommendation: this.getOverallRecommendation(level, weightedScore),
    };
  }

  /**
   * Helper: Calculate Gini Coefficient
   * Measures inequality in distribution (0 = perfect equality, 1 = perfect inequality)
   */
  private static calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b) / n;

    if (mean === 0) return 0;

    const sumAbsDeviation = sorted.reduce((sum, v, i) => {
      return sum + (2 * (i + 1) - n - 1) * v;
    }, 0);

    return sumAbsDeviation / (2 * n * n * mean);
  }

  /**
   * Helper: Determine Risk Level
   */
  private static determineLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score <= 25) return 'critical';
    if (score <= 50) return 'high';
    if (score <= 75) return 'medium';
    return 'low';
  }

  /**
   * Helper: Get Bus Factor Recommendation
   */
  private static getBufferRecommendation(minimumContributors: number): string {
    if (minimumContributors === 0) {
      return 'Add contributors to the project.';
    }
    if (minimumContributors === 1) {
      return 'CRITICAL: Establish knowledge transfer and onboarding for second contributor immediately.';
    }
    if (minimumContributors === 2) {
      return 'HIGH PRIORITY: Recruit third active contributor and document critical systems.';
    }
    return 'Continue growing contributor base and documenting processes.';
  }

  /**
   * Helper: Get Ownership Recommendation
   */
  private static getOwnershipRecommendation(topThree: number, topTen: number): string {
    if (topThree > 70) {
      return 'URGENT: Redistribute code ownership. Top 3 dominance creates severe risk. Implement pair programming and code review rotation.';
    }
    if (topThree > 50) {
      return 'HIGH PRIORITY: Actively distribute codebase ownership. Encourage knowledge sharing and cross-functional contributions.';
    }
    if (topThree > 30) {
      return 'MEDIUM: Continue broadening contributor base. Maintain current knowledge distribution practices.';
    }
    return 'EXCELLENT: Ownership is well distributed. Maintain current collaboration patterns.';
  }

  /**
   * Helper: Get Dependency Recommendation
   */
  private static getDependencyRecommendation(
    activeContributors: number,
    inactiveContributors: number
  ): string {
    if (activeContributors <= 1) {
      return 'CRITICAL: Single active contributor. Implement immediate knowledge transfer and recruit backup.';
    }
    if (activeContributors <= 2) {
      return 'HIGH: Only 2 active contributors. Recruit third and establish rotation schedule.';
    }
    if (inactiveContributors > activeContributors) {
      return 'MEDIUM: More inactive than active contributors. Onboard or archive dormant accounts.';
    }
    return 'GOOD: Healthy active contributor ratio. Continue monitoring.';
  }

  /**
   * Helper: Get Health Recommendation
   */
  private static getHealthRecommendation(status: string, lastCommitDays: number): string {
    if (status === 'stale') {
      return `CRITICAL: No commits in ${lastCommitDays} days. Reactivate project or archive.`;
    }
    if (status === 'maintained') {
      return `MEDIUM: Last commit ${lastCommitDays} days ago. Increase development pace or evaluate project status.`;
    }
    return 'GOOD: Active development. Maintain current pace.';
  }

  /**
   * Helper: Get Collaboration Recommendation
   */
  private static getCollaborationRecommendation(reviewCulture: number, peerReview: number): string {
    if (reviewCulture < 30 || peerReview < 20) {
      return 'CRITICAL: Establish code review culture. Make pull requests mandatory and distribute review responsibilities.';
    }
    if (reviewCulture < 60 || peerReview < 40) {
      return 'HIGH: Strengthen peer review process. Increase reviewer participation and establish review standards.';
    }
    return 'GOOD: Strong collaboration culture. Continue current practices.';
  }

  /**
   * Helper: Get Knowledge Recommendation
   */
  private static getKnowledgeRecommendation(hotspots: number, distribution: number): string {
    if (hotspots > 5 || distribution < 20) {
      return 'CRITICAL: Significant knowledge silos detected. Implement pair programming and documentation initiatives.';
    }
    if (hotspots > 2 || distribution < 50) {
      return 'HIGH: Some knowledge concentration. Broaden contributor involvement in critical areas.';
    }
    return 'GOOD: Knowledge well distributed. Maintain current development practices.';
  }

  /**
   * Helper: Get Overall Recommendation
   */
  private static getOverallRecommendation(level: string, score: number): string {
    if (level === 'critical') {
      return 'CRITICAL RISK: Immediate action required. Address bus factor, ownership concentration, and team composition. Schedule emergency risk mitigation meeting.';
    }
    if (level === 'high') {
      return 'HIGH RISK: Address key person dependencies and knowledge concentration. Implement team development and documentation plan.';
    }
    if (level === 'medium') {
      return 'MEDIUM RISK: Continue monitoring metrics. Implement incremental improvements in collaboration and knowledge distribution.';
    }
    return 'LOW RISK: Repository health is strong. Maintain current practices and continue monitoring.';
  }
}
