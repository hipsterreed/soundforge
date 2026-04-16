import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

/** Upload an image or audio file to Firebase Storage. Returns the public URL and storage path. */
export async function uploadImage(
  file: File,
  folder: "sprites" | "maps"
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${folder}/img-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, `game-assets/${filename}`);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  return { url, path: `game-assets/${filename}` };
}

/** Upload an audio file to Firebase Storage. Returns the public URL and storage path. */
export async function uploadAudio(
  file: File,
  folder: string
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() ?? "mp3";
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, `game-assets/${filename}`);

  await uploadBytes(storageRef, file, { contentType: file.type || "audio/mpeg" });
  const url = await getDownloadURL(storageRef);

  return { url, path: `game-assets/${filename}` };
}

/** Delete a file from Firebase Storage by its storage path. */
export async function deleteImage(path: string): Promise<void> {
  if (!path) return;
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch {
    // File may already be gone — ignore
  }
}
