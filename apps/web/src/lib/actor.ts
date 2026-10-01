'use client';

import { useCallback, useEffect, useState } from 'react';
import { ACTORS } from './api';
import type { Actor } from './api';

const KEY = 'preclear.actor';
const EVENT = 'preclear:actor';

function read(): Actor {
  try {
    const stored = window.localStorage.getItem(KEY);
    return ACTORS.find((a) => a.id === stored) ?? ACTORS[0]!;
  } catch {
    return ACTORS[0]!;
  }
}

export function useActor(): [Actor, (id: string) => void] {
  const [actor, setActor] = useState<Actor>(ACTORS[0]!);

  useEffect(() => {
    setActor(read());
    const onChange = () => setActor(read());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const choose = useCallback((id: string) => {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // storage unavailable: fall through, the event still updates this tab
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [actor, choose];
}
