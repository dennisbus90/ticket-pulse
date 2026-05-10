import { useState, useEffect, useCallback } from "react";
import * as SDK from "azure-devops-extension-sdk";
import type { IExtensionDataService } from "azure-devops-extension-api";

async function getDataManager() {
  const service = await SDK.getService<IExtensionDataService>(
    "ms.vss-features.extension-data-service"
  );
  const token = await SDK.getAccessToken();
  return service.getExtensionDataManager(SDK.getExtensionContext().id, token);
}

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const stored = localStorage.getItem(`zigge:${key}`);
      if (stored !== null) {
        try { setValue(JSON.parse(stored)); } catch { setValue(stored as T); }
      }
      setLoading(false);
      return;
    }

    getDataManager()
      .then((manager) => manager.getValue<T>(`tp_${key}`, { scopeType: "Default" as never }))
      .then((val) => {
        if (val !== undefined && val !== null) setValue(val);
      })
      .catch((err) => {
        console.error(`useStorage: failed to load "${key}"`, err);
      })
      .finally(() => setLoading(false));
  }, [key]);

  const save = useCallback(async (newVal: T | null) => {
    if (import.meta.env.DEV) {
      if (newVal === null) {
        localStorage.removeItem(`zigge:${key}`);
        setValue(defaultValue);
      } else {
        localStorage.setItem(`zigge:${key}`, JSON.stringify(newVal));
        setValue(newVal);
      }
      return;
    }

    if (newVal === null) {
      setValue(defaultValue);
    } else {
      setValue(newVal);
    }

    const manager = await getDataManager();

    if (newVal === null) {
      await manager.setValue(`tp_${key}`, undefined, { scopeType: "Default" as never });
    } else {
      await manager.setValue(`tp_${key}`, newVal, { scopeType: "Default" as never });
    }
  }, [key, defaultValue]);

  return { value, save, loading };
}
