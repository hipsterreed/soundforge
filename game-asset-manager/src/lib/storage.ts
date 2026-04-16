import { apiBase } from "@/lib/db";

/** Upload an image to the backend. Returns the public URL and storage path. */
export async function uploadImage(
  file: File,
  _folder: "sprites" | "maps"
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiBase + "/api/game/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }

  return res.json() as Promise<{ url: string; path: string }>;
}

/** Images live in the backend tmp dir and are cleaned up server-side. */
export async function deleteImage(_path: string): Promise<void> {
  // no-op: backend handles cleanup when the record is deleted
}
