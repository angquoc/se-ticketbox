'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GateConfig {
  /** The gate ID this device is assigned to (e.g. gate name like "GATE-A") */
  gateId: string;
  concertId?: string;
}

interface GateConfigContextValue {
  config: GateConfig | null;
  isConfigured: boolean;
  setGateConfig: (config: GateConfig) => void;
  clearGateConfig: () => void;
}

const GateConfigContext = createContext<GateConfigContextValue>({
  config: null,
  isConfigured: false,
  setGateConfig: () => {},
  clearGateConfig: () => {},
});

const STORAGE_KEY = 'tb_gate_config';

export function GateConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<GateConfig | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfigState(JSON.parse(stored) as GateConfig);
      }
    } catch {
      // ignore
    }
  }, []);

  const setGateConfig = useCallback((newConfig: GateConfig) => {
    setConfigState(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, []);

  const clearGateConfig = useCallback(() => {
    setConfigState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <GateConfigContext.Provider
      value={{
        config,
        isConfigured: config !== null && config.gateId.trim() !== '',
        setGateConfig,
        clearGateConfig,
      }}
    >
      {children}
    </GateConfigContext.Provider>
  );
}

export function useGateConfig(): GateConfigContextValue {
  return useContext(GateConfigContext);
}
