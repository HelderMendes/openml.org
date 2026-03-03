import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";

/**
 * Shared layout for all (explore) pages — datasets, tasks, flows, runs,
 * collections, benchmarks, measures.
 *
 * Provides the persistent three-panel workspace:
 *   LEFT NAV (global sidebar, from [locale]/layout) | MAIN CONTENT | CONTEXT PANEL
 *
 * The WorkspaceProvider keeps state across page navigations within the
 * route group (recent-entity history, active entity context).
 * Detail pages push their sections/quickLinks via <WorkspaceSetter />.
 * Listing pages don't set anything — the panel gracefully hides or shows
 * only the recent-entity trail.
 */
export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="flex gap-0">
        {/* Main content — takes all remaining space */}
        <div className="min-w-0 flex-1">{children}</div>

        {/* Persistent right context panel */}
        <WorkspacePanel />
      </div>
    </WorkspaceProvider>
  );
}
