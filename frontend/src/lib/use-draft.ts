import { useEffect, useRef } from "react";

const PREFIX = "form-draft:";

/**
 * Keeps what is being typed in a form so it survives the page going away:
 * a browser discarding a background tab, an accidental reload, a crash.
 *
 * sessionStorage is the right home for this. It outlives a reload of the same
 * tab, which is exactly the failure being guarded against, and the browser
 * clears it when the tab closes, so nothing is left behind on a shared machine.
 *
 * `key` doubles as the on/off switch: pass null while the form is closed and a
 * stable identifier while it is open, distinct per record so editing one
 * supplier never restores another's draft.
 */
export function useDraft<T>(key: string | null, value: T, restore: (draft: T) => void) {
  const restoredFor = useRef<string | null>(null);
  const writeArmedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!key) {
      restoredFor.current = null;
      writeArmedFor.current = null;
      return;
    }
    if (restoredFor.current === key) return;
    restoredFor.current = key;

    try {
      const saved = sessionStorage.getItem(PREFIX + key);
      if (saved) restore(JSON.parse(saved) as T);
    } catch {
      // A draft that cannot be read is not worth breaking the form over.
    }
    // The effects below run in the same commit and still hold the values from
    // before the restore, so the first write for this key is skipped rather
    // than overwriting the draft with an empty form.
  }, [key, restore]);

  useEffect(() => {
    if (!key) return;
    if (writeArmedFor.current !== key) {
      writeArmedFor.current = key;
      return;
    }
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage may be full or blocked. Losing the draft is better than
      // interrupting someone mid-sentence.
    }
  }, [key, value]);
}

/** Call once the entry has been saved or deliberately abandoned. */
export function discardDraft(key: string) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to do: the draft simply expires with the tab.
  }
}
