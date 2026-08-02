// Pluggable data layer (§7). The UI only talks to a DataAdapter.
//
// - StaticAdapter (zero-backend fallback): reads /family-data.json, suggestions
//   become downloadable JSON files, the console loads them from disk and lets
//   Kelly download the updated canonical file.
// - AppsScriptAdapter: same interface against the Google Apps Script web app.
//   Drop the deployment URL into lib/config.ts and nothing else changes.

import { APPS_SCRIPT_URL } from './config';
import { normalizeData } from './data';
import type { FamilyData, Suggestion } from './types';

export interface DecideRequest {
  suggestionId: string;
  decision: 'approve' | 'reject';
  editedPayload?: unknown;
  reason?: string;
}

export interface DataAdapter {
  readonly mode: 'static' | 'apps-script';
  loadData(): Promise<FamilyData>;
  // Returns how the suggestion was delivered, for the confirmation screen.
  submitSuggestion(sug: Suggestion): Promise<{ delivery: 'download' | 'queued' }>;
  listPending(secret: string): Promise<Suggestion[]>;
  decide(secret: string, req: DecideRequest): Promise<FamilyData>;
}

function download(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { download };

class StaticAdapter implements DataAdapter {
  readonly mode = 'static' as const;

  async loadData(): Promise<FamilyData> {
    // Works from any depth (/, /console/) and under subpath hosting.
    for (const path of ['family-data.json', '../family-data.json']) {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) return normalizeData(await res.json());
    }
    throw new Error('Could not load family-data.json');
  }

  async submitSuggestion(sug: Suggestion): Promise<{ delivery: 'download' | 'queued' }> {
    download(`suggestion-${sug.suggestionId}.json`, sug);
    return { delivery: 'download' };
  }

  async listPending(): Promise<Suggestion[]> {
    // Static mode has no queue — the console loads suggestion files directly.
    return [];
  }

  async decide(): Promise<FamilyData> {
    throw new Error('Static mode: decisions are applied locally in the console.');
  }
}

// Reads a response body and explains exactly what came back when it isn't
// the JSON we expect — much kinder than "Unexpected end of JSON input".
async function parseBackendJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      `The backend sent an empty reply (status ${res.status}). Please try again — if it keeps happening, tell Kelly.`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    const peek = text.replace(/\s+/g, ' ').slice(0, 140);
    throw new Error(`The backend sent an unexpected reply (status ${res.status}): ${peek}`);
  }
}

class AppsScriptAdapter implements DataAdapter {
  readonly mode = 'apps-script' as const;
  constructor(private url: string) {}

  async loadData(): Promise<FamilyData> {
    // Prefer the live backend (reflects approvals immediately); if it is
    // down or misconfigured, fall back to the data file shipped with the
    // site so the tree always loads.
    try {
      const res = await fetch(`${this.url}?action=data`);
      if (!res.ok) throw new Error(`Backend error ${res.status}`);
      return normalizeData(await res.json());
    } catch {
      for (const path of ['family-data.json', '../family-data.json']) {
        const res = await fetch(path, { cache: 'no-store' });
        if (res.ok) return normalizeData(await res.json());
      }
      throw new Error('Could not load family data');
    }
  }

  async submitSuggestion(sug: Suggestion): Promise<{ delivery: 'download' | 'queued' }> {
    // text/plain avoids a CORS preflight, which Apps Script cannot answer.
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'suggest', suggestion: sug }),
    });
    const out = await parseBackendJson(res);
    if (!out.ok) throw new Error(String(out.error || 'Submission failed'));
    return { delivery: 'queued' };
  }

  async listPending(secret: string): Promise<Suggestion[]> {
    const res = await fetch(`${this.url}?action=pending&key=${encodeURIComponent(secret)}`);
    const out = await parseBackendJson(res);
    if (!out.ok) throw new Error(String(out.error || 'Could not load queue (bad secret?)'));
    return out.suggestions as Suggestion[];
  }

  async decide(secret: string, req: DecideRequest): Promise<FamilyData> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'decide', key: secret, ...req }),
    });
    const out = await parseBackendJson(res);
    if (!out.ok) throw new Error(String(out.error || 'Decision failed'));
    return out.data as FamilyData;
  }
}

export function getAdapter(): DataAdapter {
  return APPS_SCRIPT_URL ? new AppsScriptAdapter(APPS_SCRIPT_URL) : new StaticAdapter();
}
