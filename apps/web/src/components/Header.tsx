'use client';

import Link from 'next/link';
import { ACTORS } from '@/lib/api';
import { useActor } from '@/lib/actor';

export function Header() {
  const [actor, choose] = useActor();
  return (
    <header className="header">
      <h1>PreClear</h1>
      <nav aria-label="Main">
        <Link href="/">Submit request</Link>
        <Link href="/officer">Officer review</Link>
      </nav>
      <label className="actor">
        Acting as
        <select value={actor.id} onChange={(e) => choose(e.target.value)}>
          {ACTORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
