/**
 * Service Exports (Updated)
 */

export { GitHubClient, createGitHubClient } from './github-client';
export { RepositoryService } from './repository.service';
export { EngineeringRiskEngine } from './risk-engine';
export { RiskEngineUtils } from './risk-engine-utils';

export type { RepositoryAnalysis, RepositoryAnalysisOptions } from './repository.service';
export type {
  RiskMetric,
  BusFactorMetric,
  OwnershipConcentrationMetric,
  ContributorDependencyMetric,
  RepositoryHealthMetric,
  CollaborationIndexMetric,
  KnowledgeConcentrationMetric,
  RiskEngineOutput,
  AnalysisContext,
} from './risk-engine';
