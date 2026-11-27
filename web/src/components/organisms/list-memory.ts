"use client";

import { useSyncExternalStore } from "react";

const kept = new Map<string, unknown>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The state of a list that comes back when the user returns to its page. It lives in the
 * browser until a reload. The server always renders the initial state.
 */
export function useListMemory<State>(key: string, initial: State): [State, (patch: Partial<State>) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => kept.get(key) as State | undefined,
    () => undefined,
  );
  function change(patch: Partial<State>) {
    kept.set(key, { ...((kept.get(key) as State | undefined) ?? initial), ...patch });
    for (const listener of listeners) listener();
  }
  return [stored ?? initial, change];
}

/** Drops every kept state. */
export function forgetListMemory() {
  kept.clear();
}
