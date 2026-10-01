'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PreClearanceRequest } from '@preclear/contracts';
import { api } from '@/lib/api';
import { useActor } from '@/lib/actor';

export default function SubmitPage() {
  const [actor] = useActor();
  const [security, setSecurity] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('100');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<PreClearanceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await api.create(actor, {
          employeeId: actor.id,
          security,
          side,
          quantity: Number(quantity),
          note: note || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (actor.role !== 'employee') {
    return <p>Only employees can submit pre-clearance requests. Switch to an employee above.</p>;
  }

  return (
    <>
      <h2>Submit a pre-clearance request</h2>
      <form onSubmit={onSubmit}>
        <label className="field">
          Security
          <input value={security} onChange={(e) => setSecurity(e.target.value)} required maxLength={100} />
        </label>
        <label className="field">
          Side
          <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="field">
          Quantity
          <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label className="field">
          Note (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
        </label>
        <button type="submit" disabled={busy}>
          Submit request
        </button>
      </form>

      <div role="status" aria-live="polite">
        {error && <p className="error">{error}</p>}
        {result && (
          <div className="result">
            <p>Request {result.id}</p>
            <p className={result.status === 'blocked' ? 'blocked' : ''}>Status: {result.status}</p>
            {result.reason && <p>Reason: {result.reason}</p>}
          </div>
        )}
      </div>
    </>
  );
}
