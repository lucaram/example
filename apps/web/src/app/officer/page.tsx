'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PreClearanceRequest, RiskSummary } from '@preclear/contracts';
import { api } from '@/lib/api';
import { useActor } from '@/lib/actor';

export default function OfficerPage() {
  const [actor] = useActor();
  const [items, setItems] = useState<PreClearanceRequest[]>([]);
  const [summaries, setSummaries] = useState<Record<string, RiskSummary | string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.list(actor));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests');
    }
  }, [actor]);

  useEffect(() => {
    if (actor.role === 'compliance_officer') void refresh();
  }, [actor, refresh]);

  async function decide(id: string, decision: 'approve' | 'reject') {
    try {
      await api.decide(actor, id, decision);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
    }
  }

  async function summarise(id: string) {
    try {
      const s = await api.riskSummary(actor, id);
      setSummaries((prev) => ({ ...prev, [id]: s }));
    } catch (err) {
      setSummaries((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Summary failed' }));
    }
  }

  async function flag(id: string) {
    await api.flagSummary(actor, id);
    setFlagged((prev) => ({ ...prev, [id]: true }));
  }

  if (actor.role !== 'compliance_officer') {
    return (
      <>
        <h2>Access denied</h2>
        <p>Only compliance officers can review requests (BR-012).</p>
      </>
    );
  }

  return (
    <>
      <h2>Requests for review</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Employee</th>
            <th>Request</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const summary = summaries[r.id];
            return (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.employeeId}</td>
                <td>
                  {r.side} {r.quantity} {r.security}
                  {r.note && <div className="summary">Note: {r.note}</div>}
                </td>
                <td className={r.status}>
                  {r.status}
                  {r.reason && <div className="summary">{r.reason}</div>}
                </td>
                <td>
                  <div className="actions">
                    <button disabled={r.status !== 'pending'} onClick={() => void decide(r.id, 'approve')} aria-label={`Approve ${r.id}`}>
                      Approve
                    </button>
                    <button className="secondary" disabled={r.status !== 'pending'} onClick={() => void decide(r.id, 'reject')} aria-label={`Reject ${r.id}`}>
                      Reject
                    </button>
                    <button className="secondary" onClick={() => void summarise(r.id)} aria-label={`Risk summary ${r.id}`}>
                      AI risk summary
                    </button>
                  </div>
                  {summary && (
                    <div className="summary" role="region" aria-label={`Summary for ${r.id}`}>
                      {typeof summary === 'string' ? (
                        summary
                      ) : (
                        <>
                          <p>
                            AI advice (not a decision): risk <strong>{summary.risk}</strong>
                            {summary.citedRules.length > 0 && <> · rules {summary.citedRules.join(', ')}</>}
                          </p>
                          <ul>
                            {summary.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          <button className="secondary" disabled={flagged[r.id]} onClick={() => void flag(r.id)} aria-label={`Flag summary ${r.id}`}>
                            {flagged[r.id] ? 'Flagged, thanks' : 'Flag as wrong'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && <p>No requests yet.</p>}
    </>
  );
}
