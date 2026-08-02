'use client';

// Backend diagnostics — probes the Apps Script web app from the visitor's
// browser and shows exactly what came back, so connection problems can be
// diagnosed from a single screenshot.

import { useEffect, useState } from 'react';
import { APPS_SCRIPT_URL } from '@/lib/config';

interface Probe {
  label: string;
  status: string;
  body: string;
}

async function probeGet(): Promise<Probe> {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=data`, { redirect: 'follow' });
    const text = await res.text();
    return {
      label: 'GET ?action=data (read the family data)',
      status: `HTTP ${res.status}`,
      body: text.trim() ? text.replace(/\s+/g, ' ').slice(0, 300) : '(empty body)',
    };
  } catch (e) {
    return {
      label: 'GET ?action=data (read the family data)',
      status: 'request failed before reaching the backend',
      body: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probePost(): Promise<Probe> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping' }),
    });
    const text = await res.text();
    return {
      label: 'POST action=ping (send data to the backend)',
      status: `HTTP ${res.status}`,
      body: text.trim() ? text.replace(/\s+/g, ' ').slice(0, 300) : '(empty body)',
    };
  } catch (e) {
    return {
      label: 'POST action=ping (send data to the backend)',
      status: 'request failed before reaching the backend',
      body: e instanceof Error ? e.message : String(e),
    };
  }
}

export default function Debug() {
  const [probes, setProbes] = useState<Probe[] | null>(null);

  useEffect(() => {
    if (!APPS_SCRIPT_URL) return;
    Promise.all([probeGet(), probePost()]).then(setProbes);
  }, []);

  if (!APPS_SCRIPT_URL) {
    return <main className="p-6">No backend configured — static mode.</main>;
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-1">Backend diagnostics</h1>
      <p className="text-sm text-muted mb-6 break-all">
        Probing {APPS_SCRIPT_URL} from this browser. Screenshot this page if
        you were asked to.
      </p>
      {!probes && <p className="text-muted">Running probes…</p>}
      {probes?.map((p) => (
        <section key={p.label} className="mb-5 bg-card border border-line rounded-xl p-4">
          <h2 className="text-sm font-semibold">{p.label}</h2>
          <p className="font-mono text-xs mt-1">
            Status: <span className="text-brass">{p.status}</span>
          </p>
          <p className="font-mono text-xs mt-2 break-all bg-white border border-line rounded-md p-2">
            {p.body}
          </p>
          <p className="text-xs text-muted mt-2">
            {p.body.startsWith('{')
              ? '✓ This looks healthy — the backend answered with JSON.'
              : p.body === '(empty body)'
              ? '✗ Empty reply — usually a Workspace policy or deployment version issue.'
              : p.body.includes('DOCTYPE') || p.body.includes('<html')
              ? '✗ HTML came back — the deployment is asking visitors to sign in (access must be “Anyone”).'
              : '✗ The request never got a reply — often a network/CORS block.'}
          </p>
        </section>
      ))}
    </main>
  );
}
