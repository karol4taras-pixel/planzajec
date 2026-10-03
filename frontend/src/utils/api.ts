import { ScheduleEvent } from '../types/schedule';

// Same-origin API. In the preview environment /api is routed to the backend;
// on Vercel /api/* are serverless functions. No env var needed.
const API_BASE = '/api';

export interface PlanResponse {
  success: boolean;
  liveConnected: boolean;
  rok: number;
  turnus: string;
  events: ScheduleEvent[];
  lastUpdate: string;
  contentHash: string;
  sourceUrl: string;
  portalUrl: string;
  generatedAt: string;
  checkTimestamp: string;
  changed?: boolean;
  message?: string;
}

export async function fetchPlan(rok: number, force = false): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/plan?rok=${rok}${force ? '&force=true' : ''}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Plan fetch failed: ${res.status}`);
  return res.json();
}

export async function refreshPlan(rok: number): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/sync-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rok }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}
