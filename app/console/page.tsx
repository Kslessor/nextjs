'use client';

// Kelly's approval queue. In Apps Script mode it talks to the backend with
// her secret (kept in memory only). In zero-backend mode she loads suggestion
// files from disk, reviews the same diffs, and downloads the updated
// family-data.json to re-upload to her host.

import { useEffect, useMemo, useRef, useState } from 'react';
import DiffView from '@/components/DiffView';
import { download, getAdapter } from '@/lib/adapter';
import { ApplyError, applySuggestion, validateSuggestion } from '@/lib/apply';
import { displayName, normalizeData, personById } from '@/lib/data';
import type { AuditEntry, FamilyData, Suggestion } from '@/lib/types';

interface HistoryItem {
  suggestionId: string;
  action: 'approve' | 'reject';
  summary: string;
  at: string;
  // static mode keeps the pre-decision snapshot so any decision can be undone
  snapshot?: FamilyData;
}

const btn = 'rounded-md px-3 py-1.5 text-sm border';

export default function Console() {
  const adapter = useMemo(() => getAdapter(), []);
  const remote = adapter.mode === 'apps-script';

  const [secret, setSecret] = useState('');
  const [unlocked, setUnlocked] = useState(!remote);
  const [data, setData] = useState<FamilyData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // suggestionId
  const [editText, setEditText] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dataFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!remote) {
      adapter.loadData().then(setData).catch((e) => setError(String(e.message ?? e)));
    }
  }, [adapter, remote]);

  const unlock = async () => {
    setError('');
    try {
      const [d, pending] = await Promise.all([
        adapter.loadData(),
        adapter.listPending(secret),
      ]);
      setData(d);
      setSuggestions(pending);
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock');
    }
  };

  const loadSuggestionFiles = async (files: FileList | null) => {
    if (!files || !data) return;
    setError('');
    const loaded: Suggestion[] = [];
    for (const file of Array.from(files)) {
      try {
        const parsed = JSON.parse(await file.text());
        const list: Suggestion[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const sug of list) {
          if (!sug.suggestionId || !sug.type || !sug.targetId) {
            throw new Error(`${file.name}: not a suggestion file`);
          }
          const problem = validateSuggestion(data, sug);
          if (problem) throw new Error(`${file.name}: ${problem}`);
          loaded.push({ ...sug, status: 'pending' });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not read ${file.name}`);
      }
    }
    setSuggestions((prev) => {
      const ids = new Set(prev.map((s) => s.suggestionId));
      return [...prev, ...loaded.filter((s) => !ids.has(s.suggestionId))];
    });
  };

  const loadDataFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    try {
      const parsed = normalizeData(JSON.parse(await files[0].text()));
      setData(parsed);
      setNotice('Loaded canonical data from file.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read data file');
    }
  };

  const markStatus = (id: string, status: Suggestion['status'], why?: string) =>
    setSuggestions((prev) =>
      prev.map((s) =>
        s.suggestionId === id
          ? { ...s, status, decidedAt: new Date().toISOString(), reason: why }
          : s
      )
    );

  const decide = async (
    sug: Suggestion,
    decision: 'approve' | 'reject',
    editedPayload?: unknown,
    why?: string
  ) => {
    setError('');
    setNotice('');
    try {
      if (remote) {
        const newData = await adapter.decide(secret, {
          suggestionId: sug.suggestionId,
          decision,
          editedPayload,
          reason: why,
        });
        setData(newData);
        setHistory((h) => [
          {
            suggestionId: sug.suggestionId,
            action: decision,
            summary: `${decision} — ${sug.type} on ${sug.targetId}`,
            at: new Date().toISOString(),
          },
          ...h,
        ]);
        markStatus(sug.suggestionId, decision === 'approve' ? 'approved' : 'rejected', why);
        return;
      }

      // static mode: apply locally
      if (!data) return;
      const snapshot = data;
      let summary = `rejected — ${sug.type} on ${sug.targetId}`;
      if (decision === 'approve') {
        const toApply = editedPayload ? { ...sug, payload: editedPayload as Suggestion['payload'] } : sug;
        const result = applySuggestion(data, toApply);
        summary = result.summary;
        const audit: AuditEntry = {
          at: new Date().toISOString(),
          action: 'approve',
          suggestionId: sug.suggestionId,
          summary,
          by: 'console',
        };
        result.data.meta.audit = [...(result.data.meta.audit ?? []), audit];
        setData(result.data);
        setDirty(true);
      }
      setHistory((h) => [
        {
          suggestionId: sug.suggestionId,
          action: decision,
          summary,
          at: new Date().toISOString(),
          snapshot,
        },
        ...h,
      ]);
      markStatus(sug.suggestionId, decision === 'approve' ? 'approved' : 'rejected', why);
      if (decision === 'reject' && sug.submitter.email && why) {
        setNotice(
          `Rejected. You can let ${sug.submitter.name} know: ${sug.submitter.email}`
        );
      }
    } catch (e) {
      setError(
        e instanceof ApplyError
          ? `Cannot apply: ${e.message}`
          : e instanceof Error
          ? e.message
          : 'Decision failed'
      );
    }
  };

  const undo = (item: HistoryItem) => {
    if (remote) {
      setError('Undo in Apps Script mode: restore from the audit sheet (see README).');
      return;
    }
    if (item.snapshot) {
      setData(item.snapshot);
      setDirty(true);
    }
    markStatus(item.suggestionId, 'pending', undefined);
    setHistory((h) => h.filter((x) => x !== item));
    setNotice(`Undid ${item.action} of ${item.suggestionId}.`);
  };

  const pending = suggestions.filter((s) => s.status === 'pending');
  const decided = suggestions.filter((s) => s.status !== 'pending');

  if (remote && !unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-line rounded-lg p-6 w-full max-w-sm">
          <h1 className="font-display text-2xl mb-1">Family console</h1>
          <p className="text-sm text-muted mb-4">
            Enter the console secret. It is kept in memory only.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && unlock()}
            aria-label="Console secret"
            className="w-full bg-marriedin border border-line rounded-md px-3 py-2 text-sm mb-3"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 mb-3">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={unlock}
            className={`${btn} border-brass bg-brass text-ground w-full font-medium`}
          >
            Unlock
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="font-display text-2xl mr-auto">
          Family console{' '}
          <span className="text-muted text-sm font-sans">
            {pending.length} pending
          </span>
        </h1>
        <a href="../" className="text-sm text-muted hover:text-brass">
          ← back to the tree
        </a>
      </header>

      {!remote && (
        <section className="bg-card border border-line rounded-lg p-4 mb-4 text-sm">
          <p className="text-muted mb-3">
            Zero-backend mode: load the suggestion files relatives sent you, review
            them below, then download the updated <code>family-data.json</code> and
            re-upload it to your host.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`${btn} border-brass text-brass`}
            >
              Load suggestions…
            </button>
            <button
              type="button"
              onClick={() => dataFileRef.current?.click()}
              className={`${btn} border-line`}
            >
              Load family-data.json…
            </button>
            <button
              type="button"
              onClick={() => data && download('family-data.json', data)}
              disabled={!data}
              className={`${btn} ${
                dirty ? 'border-brass bg-brass text-ground font-medium' : 'border-line'
              } disabled:opacity-50`}
            >
              Download updated family-data.json
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            onChange={(e) => loadSuggestionFiles(e.target.files)}
          />
          <input
            ref={dataFileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => loadDataFile(e.target.files)}
          />
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 mb-3">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-brass mb-3">{notice}</p>}

      {data && !pending.length && (
        <p className="text-muted text-sm mb-6">
          The queue is empty.{' '}
          {remote ? 'New suggestions appear here as relatives send them.' : ''}
        </p>
      )}

      <ul className="space-y-4">
        {pending
          .slice()
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .map((sug) => {
            const target = data ? personById(data, sug.targetId) : undefined;
            const isEditing = editing === sug.suggestionId;
            const isRejecting = rejecting === sug.suggestionId;
            return (
              <li
                key={sug.suggestionId}
                className="bg-card border border-line rounded-lg p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                  <span className="font-mono text-[11px] text-muted">
                    {sug.suggestionId}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-brass">
                    {sug.type}
                  </span>
                  <span className="font-display">
                    {target ? displayName(target) : sug.targetId}
                  </span>
                  <span className="text-xs text-muted ml-auto">
                    {sug.createdAt?.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted mb-3">
                  From <span className="text-ink">{sug.submitter?.name || 'anonymous'}</span>
                  {sug.submitter?.relationship && ` (${sug.submitter.relationship})`}
                  {sug.submitter?.email && ` · ${sug.submitter.email}`}
                  {sug.message && (
                    <span className="block mt-1 italic">“{sug.message}”</span>
                  )}
                </p>

                {data && <DiffView data={data} sug={sug} />}

                {isEditing && (
                  <div className="mt-3">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      Edit the payload before approving
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="mt-1 w-full min-h-[140px] bg-marriedin border border-line rounded-md p-2 font-mono text-xs"
                      />
                    </label>
                  </div>
                )}
                {isRejecting && (
                  <div className="mt-3">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      Reason for the submitter (optional)
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 w-full bg-marriedin border border-line rounded-md px-2.5 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className={`${btn} border-brass bg-brass text-ground font-medium`}
                        onClick={() => {
                          try {
                            const payload = JSON.parse(editText);
                            setEditing(null);
                            decide(sug, 'approve', payload);
                          } catch {
                            setError('Edited payload is not valid JSON.');
                          }
                        }}
                      >
                        Approve edited
                      </button>
                      <button
                        type="button"
                        className={`${btn} border-line`}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : isRejecting ? (
                    <>
                      <button
                        type="button"
                        className={`${btn} border-red-600 text-red-600`}
                        onClick={() => {
                          setRejecting(null);
                          decide(sug, 'reject', undefined, reason || undefined);
                          setReason('');
                        }}
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        className={`${btn} border-line`}
                        onClick={() => setRejecting(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`${btn} border-brass bg-brass text-ground font-medium`}
                        onClick={() => decide(sug, 'approve')}
                        disabled={sug.type === 'reportError' ? false : !target}
                      >
                        Approve
                      </button>
                      {sug.type !== 'reportError' && (
                        <button
                          type="button"
                          className={`${btn} border-brass text-brass`}
                          onClick={() => {
                            setEditing(sug.suggestionId);
                            setEditText(JSON.stringify(sug.payload, null, 2));
                          }}
                        >
                          Edit &amp; approve
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${btn} border-line text-muted hover:border-red-600 hover:text-red-600`}
                        onClick={() => setRejecting(sug.suggestionId)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
      </ul>

      {(history.length > 0 || decided.length > 0) && (
        <section className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            History
          </h2>
          <ul className="space-y-1 text-sm">
            {history.map((item, i) => (
              <li
                key={`${item.suggestionId}-${i}`}
                className="flex items-center gap-3 border-b border-line/40 py-1.5"
              >
                <span className="font-mono text-[11px] text-muted">
                  {item.at.slice(0, 16).replace('T', ' ')}
                </span>
                <span className={item.action === 'approve' ? 'text-brass' : 'text-red-600'}>
                  {item.action}
                </span>
                <span className="text-muted truncate">{item.summary}</span>
                <button
                  type="button"
                  onClick={() => undo(item)}
                  className="ml-auto text-xs text-muted hover:text-brass underline underline-offset-2"
                >
                  undo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
