/**
 * GitHub REST API Types
 * Type-safe interfaces for GitHub API responses
 */

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface GitHubError {
  message: string;
  errors?: Array<{
    message: string;
    resource: string;
    field: string;
  }>;
  documentation_url?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: User;
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  topics: string[];
  license: {
    key: string;
    name: string;
  } | null;
}

export interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Organization';
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string | null;
  bio?: string | null;
  twitter_username?: string | null;
  public_repos?: number;
  followers?: number;
  following?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: 'User' | 'Bot';
}

export interface Commit {
  sha: string;
  nodeId: string;
  url: string;
  html_url: string;
  author: User | null;
  committer: User | null;
  message: string;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
  verification: {
    verified: boolean;
    reason: string;
    signature: string | null;
    payload: string | null;
  };
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
  };
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
    html_url?: string;
  };
  protected: boolean;
}

export interface PullRequest {
  id: number;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string | null;
  user: User;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  merge_commit_sha: string | null;
  merged: boolean;
  mergeable: boolean | null;
  merged_by: User | null;
  head: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository | null;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository;
  };
}

export interface RepositorySearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: Repository[];
}

export interface ContributorSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: Contributor[];
}

export interface RepositoryStatistics {
  forks: number;
  stargazers: number;
  watchers: number;
  openIssues: number;
  totalCommits: number;
  totalContributors: number;
  primaryLanguage: string | null;
}

export interface APIResponse<T> {
  data: T;
  rateLimit: GitHubRateLimitInfo;
}

export interface APIError extends Error {
  status?: number;
  rateLimit?: GitHubRateLimitInfo;
  details?: GitHubError;
}
