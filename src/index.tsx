import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createGitHubClient, RepositoryService, EngineeringRiskEngine, RiskEngineUtils } from '@services';
import type { RiskEngineOutput } from '@services';

const App = () => {
  const [riskData, setRiskData] = useState<RiskEngineOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeRepo = async (owner: string, repo: string) => {
    setLoading(true);
    setError(null);

    try {
      const client = createGitHubClient();
      const service = new RepositoryService(client);

      const analysis = await service.analyzeRepository(owner, repo, {
        includeCommits: true,
        includePRs: true,
      });

      const repositoryAge = RiskEngineUtils.calculateRepositoryAge(
        analysis.repository.created_at
      );

      const context = {
        contributors: analysis.contributors,
        commits: analysis.commits,
        pullRequests: analysis.pullRequests,
        repositoryAge,
      };

      const riskOutput = EngineeringRiskEngine.analyzeRepository(context);
      setRiskData(riskOutput);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Repo Risk Intelligence</h1>
      <p>Engineering Risk Analysis Engine</p>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => analyzeRepo('facebook', 'react')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#0366d6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze React'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {riskData && (
        <div>
          <h2>Risk Assessment Results</h2>
          <div style={{ backgroundColor: '#f6f8fa', padding: '1rem', borderRadius: '4px' }}>
            <p>
              <strong>Overall Risk Score:</strong> {riskData.overallRisk.score}/100 ({riskData.overallRisk.level})
            </p>
            <p>{riskData.overallRisk.recommendation}</p>
          </div>

          <h3>Detailed Metrics</h3>
          {Object.entries(riskData).map(([key, metric]) => {
            if (key === 'overallRisk' || key === 'timestamp') return null;

            return (
              <div key={key} style={{ marginBottom: '1.5rem', borderLeft: '4px solid #0366d6', paddingLeft: '1rem' }}>
                <h4>{key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                <p>
                  <strong>Score:</strong> {(metric as any).score}/100 <strong>(({(metric as any).level})</strong>
                </p>
                <p>
                  <strong>Explanation:</strong> {(metric as any).explanation}
                </p>
                <p>
                  <strong>Recommendation:</strong> {(metric as any).recommendation}
                </p>
              </div>
            );
          })}

          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '2rem' }}>
            Analysis timestamp: {new Date(riskData.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
