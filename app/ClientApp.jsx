"use client";

import { useState, useTransition, useRef } from "react";
import { setEntryAction, uploadPhotoAction, setVoteAction, clearAllVotesAction } from "./actions";

const MEMBERS = ["Big Al", "Jess", "Eli", "Emily"];

export default function ClientApp({ sandwiches, initialState, configured }) {
  const [state, setState] = useState(initialState || {});
  const [openId, setOpenId] = useState(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [error, setError] = useState(null);

  const getEntry = (id) => state[id] || {};

  const update = (id, updates) => {
    // Optimistic update
    const optimistic = { ...state, [id]: { ...(state[id] || {}), ...updates } };
    setState(optimistic);
    setError(null);
    startTransition(async () => {
      try {
        const newState = await setEntryAction(id, updates);
        setState(newState);
      } catch (e) {
        setState(state); // revert
        setError(e.message);
      }
    });
  };

  const toggleDone = (id, checked) => {
    const e = getEntry(id);
    const updates = { done: checked };
    if (checked && !e.doneDate) {
      updates.doneDate = new Date().toISOString().slice(0, 10);
    }
    update(id, updates);
  };

  const votes = state._votes || {};

  const updateVote = (member, picks) => {
    const optimistic = {
      ...state,
      _votes: { ...(state._votes || {}), [member]: picks },
    };
    setState(optimistic);
    startTransition(async () => {
      try {
        const newState = await setVoteAction(member, picks);
        setState(newState);
      } catch (e) {
        setState(state);
        setError(e.message);
      }
    });
  };

  const clearAllVotes = () => {
    if (!confirm("Clear all family votes? This cannot be undone.")) return;
    setState((prev) => ({ ...prev, _votes: {} }));
    startTransition(async () => {
      try {
        const newState = await clearAllVotesAction();
        setState(newState);
      } catch (e) {
        setState(state);
        setError(e.message);
      }
    });
  };

  const handlePhotoUpload = async (id, file) => {
    if (!file) return;
    setUploading(true);
    setPhotoError(null);
    setPhotoSaved(false);
    try {
      // Resize on client first to keep upload small
      const resizedBlob = await resizeImage(file, 900, 0.8);
      const formData = new FormData();
      formData.append("photo", resizedBlob, "photo.jpg");
      const newState = await uploadPhotoAction(id, formData);
      // Surgical merge: only apply the photo URL rather than replacing the entire
      // state, so a concurrent setEntryAction transition can't wipe the photo.
      const photoUrl = newState[id]?.photo;
      setState((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), photo: photoUrl },
      }));
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);
    } catch (e) {
      setPhotoError("Could not upload photo: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const doneCount = sandwiches.filter((s) => getEntry(s.id).done).length;
  const openSandwich = openId ? sandwiches.find((s) => s.id === openId) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      {!configured && (
        <div className="mb-6 bg-amber-100 border-2 border-amber-400 rounded-xl p-4 text-amber-900 text-sm">
          <strong>⚠ Setup needed:</strong> This site is read-only until you add a Vercel
          Blob store. In your Vercel project dashboard, go to{" "}
          <strong>Storage → Create Database → Blob</strong>, link it to this project, and
          redeploy. After that, all family members will share the same checklist and
          photos.
        </div>
      )}

      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold text-stone-800 tracking-tight">
          Our Family Sandwich Tour
        </h1>
        <p className="text-base md:text-lg text-stone-600 mt-2 italic">
          25 of the world&apos;s best — one a week
        </p>

        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <div className="bg-white shadow-sm rounded-full px-5 py-2 border border-amber-200">
            <span className="font-semibold text-amber-700">
              {doneCount} of 25 made
            </span>
          </div>
          <div className="bg-white shadow-sm rounded-full h-3 w-48 overflow-hidden border border-amber-200">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(doneCount / 25) * 100}%` }}
            />
          </div>
        </div>
        {pending && (
          <p className="mt-2 text-xs text-stone-500">Saving…</p>
        )}
      </header>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-800 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {sandwiches.map((s) => {
          const e = getEntry(s.id);
          return (
            <div
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden border ${
                e.done
                  ? "border-amber-400 ring-2 ring-amber-300"
                  : "border-stone-200"
              }`}
            >
              <div className="aspect-[3/2] bg-stone-100 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.photo || `/thumbs/${s.file}`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {e.done ? (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-md">
                    ✓
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 bg-white/80 text-stone-400 rounded-full w-7 h-7 flex items-center justify-center text-xs border border-stone-300 font-semibold">
                    {s.id}
                  </div>
                )}
              </div>
              <div className="p-2 md:p-3">
                <h3 className="font-bold text-stone-800 text-sm md:text-base leading-tight">
                  {s.name}
                </h3>
                <p className="text-xs text-stone-500 italic mt-0.5">{s.country}</p>
                {e.rating ? (
                  <div className="text-amber-500 text-xs mt-1">
                    {"★".repeat(e.rating)}
                    <span className="text-stone-300">{"★".repeat(5 - e.rating)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <VotingSection
        sandwiches={sandwiches}
        votes={votes}
        onVote={updateVote}
        onClearAll={clearAllVotes}
        configured={configured}
      />

      <footer className="text-center mt-12 text-xs text-stone-400">
        Inspired by CNN Travel&apos;s 25 best sandwiches · Made with ❤️ for the family
      </footer>

      {openSandwich && (
        <Modal
          sandwich={openSandwich}
          entry={getEntry(openSandwich.id)}
          onClose={() => { setOpenId(null); setPhotoError(null); setPhotoSaved(false); }}
          onToggleDone={(checked) => toggleDone(openSandwich.id, checked)}
          onUpdate={(updates) => update(openSandwich.id, updates)}
          onPhotoUpload={(file) => handlePhotoUpload(openSandwich.id, file)}
          uploading={uploading}
          photoSaved={photoSaved}
          photoError={photoError}
          configured={configured}
        />
      )}
    </div>
  );
}

function Modal({
  sandwich: s,
  entry: e,
  onClose,
  onToggleDone,
  onUpdate,
  onPhotoUpload,
  uploading,
  photoSaved,
  photoError,
  configured,
}) {
  const fileInputRef = useRef(null);
  const [notesLocal, setNotesLocal] = useState(e.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const saveNotes = () => {
    if (notesLocal !== (e.notes || "")) {
      onUpdate({ notes: notesLocal });
    }
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 overflow-y-auto"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="min-h-screen flex items-start sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-4 sm:my-8 overflow-hidden">
          <div className="aspect-[3/2] bg-stone-100 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={e.photo || `/thumbs/${s.file}`}
              alt={s.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md text-stone-700 text-xl font-bold"
            >
              ×
            </button>
            {photoSaved && (
              <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                Photo saved!
              </div>
            )}
            {!photoSaved && e.photo && (
              <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                Family photo
              </div>
            )}
            {configured && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 bg-white/90 hover:bg-white disabled:opacity-50 rounded-full px-3 py-1.5 text-sm font-semibold shadow-md text-stone-700 flex items-center gap-1.5"
              >
                📷 {uploading ? "Uploading…" : e.photo ? "Replace photo" : "Add photo"}
              </button>
            )}
            {photoError && (
              <div className="absolute inset-x-3 bottom-12 bg-red-600 text-white text-xs px-3 py-2 rounded-lg text-center">
                {photoError}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(ev) => {
                onPhotoUpload(ev.target.files[0]);
                ev.target.value = "";
              }}
              className="hidden"
            />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-2xl font-bold text-stone-800 leading-tight">
                  {s.name}
                </h2>
                <p className="text-stone-500 italic">{s.country}</p>
              </div>
              <div className="text-3xl font-bold text-amber-300">{s.id}</div>
            </div>

            <p className="text-stone-700 mt-3 mb-4">{s.desc}</p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="font-semibold text-sm mb-2 text-amber-900">
                Key ingredients
              </div>
              <ul className="text-sm space-y-1 text-stone-700">
                {s.key.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>

            <label
              className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${
                configured
                  ? "bg-stone-50 hover:bg-stone-100 cursor-pointer"
                  : "bg-stone-100 cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={!!e.done}
                disabled={!configured}
                onChange={(ev) => onToggleDone(ev.target.checked)}
                className="w-5 h-5 accent-amber-500"
              />
              <span className="font-semibold text-stone-800">
                {e.done ? "We made this!" : "Mark as made"}
              </span>
            </label>

            {e.done && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Date made
                  </label>
                  <input
                    type="date"
                    value={e.doneDate || ""}
                    onChange={(ev) => onUpdate({ doneDate: ev.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Family rating
                  </label>
                  <div className="flex gap-1 items-end">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => onUpdate({ rating: n })}
                        className={`star-btn text-3xl ${
                          (e.rating || 0) >= n
                            ? "text-amber-500"
                            : "text-stone-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {e.rating && (
                      <button
                        onClick={() => onUpdate({ rating: null })}
                        className="text-xs text-stone-400 hover:text-stone-600 ml-2 pb-2"
                      >
                        clear
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={notesLocal}
                    onChange={(ev) => {
                      setNotesLocal(ev.target.value);
                      setNotesSaved(false);
                    }}
                    rows={3}
                    placeholder="What did you think? Tweaks for next time?"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex justify-end items-center gap-3 mt-2">
                    {notesSaved && (
                      <span className="text-sm text-green-600 font-medium">Saved!</span>
                    )}
                    <button
                      onClick={saveNotes}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      Save notes
                    </button>
                  </div>
                </div>

                {e.photo && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-500">Photo added</span>
                    <button
                      onClick={() => {
                        if (confirm("Remove photo?")) onUpdate({ photo: null });
                      }}
                      className="text-red-600 hover:text-red-800 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Voting ────────────────────────────────────────────────────────────────

// Scoring: rank 1 = 5 pts, rank 2 = 4 pts, rank 3 = 3 pts, rank 4 = 2 pts, rank 5+ = 1 pt
function scoreForRank(rank) {
  return Math.max(1, 6 - rank);
}

function VotingSection({ sandwiches, votes, onVote, onClearAll, configured }) {
  const [votingFor, setVotingFor] = useState(null);
  const someVoted = MEMBERS.some((m) => (votes[m]?.length || 0) > 0);

  const clearVotes = (member) => {
    if (confirm(`Clear ${member}'s votes?`)) onVote(member, []);
  };

  return (
    <section className="mt-14 border-t-2 border-amber-200 pt-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-800">Family Vote</h2>
        <p className="text-stone-500 mt-1 text-sm">
          Rank your picks — your #1 counts most. We&apos;ll make them in order of total points.
        </p>
        {someVoted && configured && (
          <button
            onClick={onClearAll}
            className="mt-3 text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
          >
            Clear all votes
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {MEMBERS.map((member) => {
          const picks = votes[member] || [];
          const hasVoted = picks.length > 0;
          return (
            <div key={member} className="relative">
              <button
                onClick={() => setVotingFor(member)}
                disabled={!configured}
                className={`w-full rounded-xl p-4 text-left transition-all border-2 ${
                  hasVoted
                    ? "bg-amber-50 border-amber-400"
                    : configured
                    ? "bg-white border-stone-200 hover:border-amber-300 hover:shadow-md"
                    : "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="font-bold text-stone-800 mb-1 text-sm pr-5">{member}</div>
                {hasVoted ? (
                  <>
                    <div className="text-xs text-amber-700 font-semibold mb-2">
                      {picks.length} ranked · tap to edit
                    </div>
                    <div className="space-y-0.5">
                      {picks.slice(0, 4).map((id, i) => {
                        const s = sandwiches.find((s) => s.id === id);
                        return s ? (
                          <div key={id} className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-bold text-xs w-4">#{i + 1}</span>
                            <span className="text-xs text-stone-700 truncate">
                              {s.name}
                            </span>
                          </div>
                        ) : null;
                      })}
                      {picks.length > 4 && (
                        <div className="text-xs text-stone-400 pl-5">
                          +{picks.length - 4} more
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-stone-400 mt-1">
                    {configured ? "Tap to rank →" : "Setup required"}
                  </div>
                )}
              </button>
              {hasVoted && configured && (
                <button
                  onClick={() => clearVotes(member)}
                  title="Clear votes"
                  className="absolute top-2 right-2 text-stone-300 hover:text-red-400 text-xl leading-none font-bold transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {someVoted && <Leaderboard sandwiches={sandwiches} votes={votes} />}

      {votingFor && (
        <VoteModal
          member={votingFor}
          sandwiches={sandwiches}
          currentPicks={votes[votingFor] || []}
          onSubmit={(picks) => {
            onVote(votingFor, picks);
            setVotingFor(null);
          }}
          onClose={() => setVotingFor(null)}
        />
      )}
    </section>
  );
}

function Leaderboard({ sandwiches, votes }) {
  const votersWhoVoted = MEMBERS.filter((m) => (votes[m]?.length || 0) > 0);

  // Build score map: { sandwichId → total points } and details map
  const scoreMap = {};
  const detailsMap = {}; // { sandwichId → [{ member, rank }] }
  votersWhoVoted.forEach((m) => {
    (votes[m] || []).forEach((id, i) => {
      const rank = i + 1;
      const pts = scoreForRank(rank);
      scoreMap[id] = (scoreMap[id] || 0) + pts;
      if (!detailsMap[id]) detailsMap[id] = [];
      detailsMap[id].push({ member: m, rank });
    });
  });

  const sorted = sandwiches
    .map((s) => ({ ...s, score: scoreMap[s.id] || 0, details: detailsMap[s.id] || [] }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Assign display ranks — ties share the same number
  let displayRank = 1;
  const withRanks = sorted.map((s, i) => {
    if (i > 0 && s.score < sorted[i - 1].score) displayRank = i + 1;
    return { ...s, rank: displayRank };
  });

  const allVoted = votersWhoVoted.length === MEMBERS.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-800">Rankings</h3>
        <span className="text-sm text-stone-500">
          {votersWhoVoted.length}/{MEMBERS.length} voted
          {allVoted && (
            <span className="ml-2 text-amber-600 font-semibold">— final order!</span>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {withRanks.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-stone-200 shadow-sm"
          >
            <span className="text-base font-bold text-amber-400 w-8 shrink-0 text-center">
              #{s.rank}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-stone-800 text-sm">{s.name}</span>
              <span className="text-stone-400 text-xs ml-2 hidden sm:inline">{s.country}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {s.details
                .sort((a, b) => a.rank - b.rank)
                .map(({ member, rank }) => (
                  <span
                    key={member}
                    className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 font-medium"
                  >
                    {member.split(" ")[0]} #{rank}
                  </span>
                ))}
            </div>
            <span className="text-amber-500 font-bold text-sm w-10 text-right shrink-0">
              {s.score}pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoteModal({ member, sandwiches, currentPicks, onSubmit, onClose }) {
  const [picks, setPicks] = useState([...currentPicks]);

  const toggle = (id) => {
    if (picks.includes(id)) {
      setPicks(picks.filter((p) => p !== id));
    } else {
      setPicks([...picks, id]);
    }
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...picks];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setPicks(next);
  };

  const moveDown = (i) => {
    if (i === picks.length - 1) return;
    const next = [...picks];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setPicks(next);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 overflow-y-auto"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="min-h-screen flex items-start justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-4 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-stone-800">
                {member}&apos;s ranking
              </h2>
              <p className="text-stone-500 text-sm mt-0.5">
                Tap to add/remove · use ↑↓ to reorder · #1 earns the most points
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-stone-400">
                {picks.length} ranked
              </span>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-stone-600 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Sandwich grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[42vh] overflow-y-auto">
            {sandwiches.map((s) => {
              const rank = picks.indexOf(s.id); // -1 = not selected
              const selected = rank !== -1;
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`rounded-xl overflow-hidden border-2 text-left transition-all ${
                    selected
                      ? "border-amber-500 ring-2 ring-amber-200"
                      : "border-stone-200 hover:border-amber-300"
                  }`}
                >
                  <div className="aspect-[3/2] bg-stone-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/thumbs/${s.file}`}
                      alt={s.name}
                      className="w-full h-full object-cover"
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <div className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-base shadow">
                          #{rank + 1}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="font-semibold text-xs text-stone-800 leading-tight">
                      {s.name}
                    </div>
                    <div className="text-xs text-stone-400">{s.country}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ranking list */}
          {picks.length > 0 && (
            <div className="border-t border-stone-100 bg-amber-50/50 px-4 py-3">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Your ranking
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {picks.map((id, i) => {
                  const s = sandwiches.find((s) => s.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-amber-100"
                    >
                      <span className="text-amber-500 font-bold text-xs w-6 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-sm text-stone-800 flex-1 truncate">
                        {s?.name}
                      </span>
                      <span className="text-xs text-stone-400 shrink-0">
                        {scoreForRank(i + 1)}pt
                      </span>
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="text-stone-400 hover:text-stone-700 disabled:opacity-20 px-0.5 text-sm leading-none"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === picks.length - 1}
                        className="text-stone-400 hover:text-stone-700 disabled:opacity-20 px-0.5 text-sm leading-none"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggle(id)}
                        className="text-stone-300 hover:text-red-400 text-base font-bold leading-none px-0.5"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-5 border-t border-stone-100 flex justify-between items-center gap-3">
            <button
              onClick={() => setPicks([])}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-stone-500 hover:text-stone-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => onSubmit(picks)}
                disabled={picks.length === 0}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
              >
                {picks.length === 0 ? "Pick at least one" : `Save ${picks.length} vote${picks.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Resize image on the client before uploading
async function resizeImage(file, maxSize, quality) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}
