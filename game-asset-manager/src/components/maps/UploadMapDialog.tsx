import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/storage";
import { createMap } from "@/lib/db";
import { Upload, Map } from "lucide-react";

interface UploadMapDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function UploadMapDialog({ open, onClose, onCreated }: UploadMapDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave() {
    if (!file) { setError("Please select a map image."); return; }
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const { url, path } = await uploadImage(file, "maps");
      const id = await createMap({ name: name.trim(), description, imageUrl: url, imagePath: path });
      onCreated(id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Map</DialogTitle>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-40 mx-auto object-contain rounded" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Map className="h-8 w-8" />
              <span className="text-sm">Click to upload map image</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input placeholder="e.g. Forest Level" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input placeholder="e.g. A dense forest area with enemies" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !file}>
            {saving ? "Uploading…" : <><Upload className="h-4 w-4 mr-2" />Add Map</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
