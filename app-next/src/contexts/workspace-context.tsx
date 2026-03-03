"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────
export type EntityType =
  | "run"
  | "dataset"
  | "task"
  | "flow"
  | "collection"
  | "benchmark"
  | "measure";

export interface WorkspaceEntity {
  type: EntityType;
  id: string | number;
  title: string;
  subtitle?: string;
  url: string;
  color: string;
}

export interface WorkspaceSection {
  id: string;
  label: string;
  /** Lucide icon name — rendered by the panel component */
  iconName: string;
  count?: number;
}

export interface WorkspaceQuickLink {
  label: string;
  href: string;
  iconName: string;
  color?: string;
}

export interface WorkspaceAction {
  label: string;
  href: string;
  iconName: string;
}

export interface WorkspaceData {
  entity: WorkspaceEntity | null;
  sections: WorkspaceSection[];
  quickLinks: WorkspaceQuickLink[];
  actions: WorkspaceAction[];
}

interface WorkspaceContextType extends WorkspaceData {
  /** History of recently viewed entities (most recent first, max 20) */
  recentEntities: WorkspaceEntity[];
  /** Push workspace data from a page */
  setWorkspace: (data: Partial<WorkspaceData>) => void;
  /** Clear all workspace data (e.g. on listing pages) */
  clearWorkspace: () => void;
}

const EMPTY: WorkspaceData = {
  entity: null,
  sections: [],
  quickLinks: [],
  actions: [],
};

const MAX_RECENT = 20;

const WorkspaceContext = createContext<WorkspaceContextType>({
  ...EMPTY,
  recentEntities: [],
  setWorkspace: () => {},
  clearWorkspace: () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [recentEntities, setRecentEntities] = useState<WorkspaceEntity[]>([]);
  const lastEntityKey = useRef<string>("");

  const setWorkspace = useCallback((partial: Partial<WorkspaceData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearWorkspace = useCallback(() => {
    setData(EMPTY);
    lastEntityKey.current = "";
  }, []);

  // Track entity changes → build history
  useEffect(() => {
    if (!data.entity) return;
    const key = `${data.entity.type}:${data.entity.id}`;
    if (key === lastEntityKey.current) return;
    lastEntityKey.current = key;

    setRecentEntities((prev) => {
      const filtered = prev.filter(
        (e) => !(e.type === data.entity!.type && e.id === data.entity!.id),
      );
      return [data.entity!, ...filtered].slice(0, MAX_RECENT);
    });
  }, [data.entity]);

  return (
    <WorkspaceContext.Provider
      value={{
        ...data,
        recentEntities,
        setWorkspace,
        clearWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────
export function useWorkspace() {
  return useContext(WorkspaceContext);
}
