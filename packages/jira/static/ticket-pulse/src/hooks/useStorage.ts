import { useState, useEffect, useCallback } from "react";

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const stored = localStorage.getItem(`ticket-pulse:${key}`);
      if (stored !== null) {
        try { setValue(JSON.parse(stored)); } catch { setValue(stored as T); }
      }
      setLoading(false);
      return;
    }

    import("@forge/bridge").then(({ invoke }) => {
      invoke("getStorageValue", { key })
        .then((val: any) => {
          if (val !== null && val !== undefined) setValue(val as T);
        })
        .catch((err: any) => {
          console.error(`useStorage: failed to load "${key}"`, err);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [key]);

  const save = useCallback(async (newVal: T | null) => {
    if (import.meta.env.DEV) {
      if (newVal === null) {
        localStorage.removeItem(`ticket-pulse:${key}`);
        setValue(defaultValue);
      } else {
        localStorage.setItem(`ticket-pulse:${key}`, JSON.stringify(newVal));
        setValue(newVal);
      }
      return;
    }

    if (newVal === null) {
      setValue(defaultValue);
    } else {
      setValue(newVal);
    }
    const { invoke } = await import("@forge/bridge");
    await invoke("setStorageValue", { key, value: newVal });
  }, [key, defaultValue]);

  return { value, save, loading };
}
