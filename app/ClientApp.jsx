"use client";

import { useState, useTransition, useRef } from "react";
import { setEntryAction, uploadPhotoAction } from "./actions";

export default function ClientApp({ sandwiches, initialState, configured }) {
  const [state, setState] = useState(initialState || {});
  const [openId, setOpenId] = useState(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
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

  const handlePhotoUpload = async (id, file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Resize on client first to keep upload small
      const resizedBlob = await resizeImage(file, 900, 0.8);
      const formData = new FormData();
      formData.append("photo", resizedBlob, "photo.jpg");
      const newState = await uploadPhotoAction(id, formData);
      setState(newState);
    } catch (e) {
      setError("Could not upload photo: " + e.message);
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

      <footer className="text-center mt-12 text-xs text-stone-400">
        Inspired by CNN Travel&apos;s 25 best sandwiches · Made with ❤️ for the family
      </footer>

      {openSandwich && (
        <Modal
          sandwich={openSandwich}
          entry={getEntry(openSandwich.id)}
          onClose={() => setOpenId(null)}
          onToggleDone={(checked) => toggleDone(openSandwich.id, checked)}
          onUpdate={(updates) => update(openSandwich.id, updates)}
          onPhotoUpload={(file) => handlePhotoUpload(openSandwich.id, file)}
          uploading={uploading}
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
  configured,
}) {
  const fileInputRef = useRef(null);
  const [notesLocal, setNotesLocal] = useState(e.notes || "");

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
            {e.photo && (
              <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                Family photo
              </div>
            )}
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
                    onChange={(ev) => setNotesLocal(ev.target.value)}
                    onBlur={() => {
                      if (notesLocal !== (e.notes || "")) {
                        onUpdate({ notes: notesLocal });
                      }
                    }}
                    rows={3}
                    placeholder="What did you think? Tweaks for next time?"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Photo of our version
                  </label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      {uploading
                        ? "Uploading…"
                        : e.photo
                        ? "📷 Replace photo"
                        : "📷 Add photo"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(ev) => onPhotoUpload(ev.target.files[0])}
                      className="hidden"
                    />
                    {e.photo && (
                      <button
                        onClick={() => {
                          if (confirm("Remove photo?")) onUpdate({ photo: null });
                        }}
                        className="text-red-600 hover:text-red-800 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
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
