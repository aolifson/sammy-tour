"use server";

import { getState, saveState, uploadPhoto, isConfigured } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function setEntryAction(id, updates) {
  if (!isConfigured()) {
    throw new Error("Storage not configured. Add a Vercel Blob store to this project.");
  }
  const state = await getState();
  state[id] = { ...(state[id] || {}), ...updates };
  await saveState(state);
  revalidatePath("/");
  return state;
}

export async function uploadPhotoAction(id, formData) {
  if (!isConfigured()) {
    throw new Error("Storage not configured. Add a Vercel Blob store to this project.");
  }
  const file = formData.get("photo");
  if (!file || typeof file === "string") {
    throw new Error("No file provided");
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const url = await uploadPhoto(id, buffer, file.type || "image/jpeg");
  const state = await getState();
  state[id] = { ...(state[id] || {}), photo: url };
  await saveState(state);
  revalidatePath("/");
  return state;
}
