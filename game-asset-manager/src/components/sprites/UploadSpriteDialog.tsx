import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/storage";
import { createSprite } from "@/lib/db";
import { Upload, ImageIcon } from "lucide-react";
import type { SpriteFormData } from "@/types";

interface UploadSpriteDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function UploadSpriteDialog({ open, onClose, onCreated }: UploadSpriteDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<SpriteFormData, "file">>({
    name: "", description: "",
    frameWidth: 32, frameHeight: 32,
    columns: 4, rows: 4,
    totalFrames: 16,
    scale: 4, animFps: 8,
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      next.totalFrames = next.columns * next.rows;
      return next;
    });
  }

  async function handleSave() {
    if (!file) { setError("Please select a sprite sheet image."); return; }
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const { url, path } = await uploadImage(file, "sprites");
      const id = await createSprite({ ...form, imageUrl: url, imagePath: path });
      onCreated(id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  const numField = (label: string, key: keyof typeof form, min = 1) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        value={form[key] as number}
        onChange={(e) => set(key, Math.max(min, Number(e.target.value)))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Sprite Sheet</DialogTitle>
        </DialogHeader>

        {/* File drop zone */}
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-32 mx-auto object-contain" style={{ imageRendering: "pixelated" }} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm">Click to upload sprite sheet</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input placeholder="e.g. Hero Character" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Input placeholder="e.g. Main player sprite with walk/run animations" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        {/* Grid settings */}
        <div className="grid grid-cols-2 gap-3">
          {numField("Frame Width (px)", "frameWidth")}
          {numField("Frame Height (px)", "frameHeight")}
          {numField("Columns", "columns")}
          {numField("Rows", "rows")}
          {numField("Total Frames", "totalFrames")}
          {numField("Display Scale", "scale")}
          {numField("Anim FPS", "animFps")}
        </div>

        <p className="text-xs text-muted-foreground">
          Total frames: {form.totalFrames} · Sheet size: {form.frameWidth * form.columns}×{form.frameHeight * form.rows}px
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !file}>
            {saving ? (
              <><span className="animate-spin mr-2">⏳</span> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Add Sprite</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
