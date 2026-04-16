import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/storage";
import { createSprite } from "@/lib/db";
import { Upload, ImageIcon, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchImportDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface DirectionConfig {
  name: string;
  startCol: number;
  frames: number;
  color: string;
}

const DEFAULT_DIRECTIONS: DirectionConfig[] = [
  { name: "Up",    startCol: 0,  frames: 3, color: "#6366f1" },
  { name: "Right", startCol: 3,  frames: 3, color: "#22c55e" },
  { name: "Down",  startCol: 6,  frames: 3, color: "#f59e0b" },
  { name: "Left",  startCol: 9,  frames: 3, color: "#ec4899" },
];

export function BatchImportDialog({ open, onClose, onCreated }: BatchImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Config
  const [frameWidth, setFrameWidth]   = useState(48);
  const [frameHeight, setFrameHeight] = useState(48);
  const [scale, setScale]             = useState(3);
  const [animFps, setAnimFps]         = useState(8);
  const [namePrefix, setNamePrefix]   = useState("Character");
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections]   = useState<DirectionConfig[]>(DEFAULT_DIRECTIONS);
  const [defaultDir, setDefaultDir]   = useState(2); // "Down"

  // Derived sheet geometry
  const detectedCols = imgEl ? Math.max(1, Math.floor(imgEl.naturalWidth  / frameWidth))  : 0;
  const detectedRows = imgEl ? Math.max(1, Math.floor(imgEl.naturalHeight / frameHeight)) : 0;

  // Import progress
  type Stage = "config" | "importing" | "done";
  const [stage, setStage] = useState<Stage>("config");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // ── Load image from file ──────────────────────────────────────────────────
  function handleFile(f: File) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(f);
    setObjectUrl(url);
    setFile(f);
    setImgEl(null);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
  }

  // ── Draw canvas preview with grid overlay ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;

    const MAX_W = 500;
    const ds = Math.min(1, MAX_W / imgEl.naturalWidth); // display scale
    canvas.width  = Math.round(imgEl.naturalWidth  * ds);
    canvas.height = Math.round(imgEl.naturalHeight * ds);

    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

    const fw = frameWidth  * ds;
    const fh = frameHeight * ds;

    // Grid lines
    ctx.strokeStyle = "rgba(99,102,241,0.35)";
    ctx.lineWidth = 0.5;
    for (let c = 1; c < detectedCols; c++) {
      ctx.beginPath(); ctx.moveTo(c * fw, 0); ctx.lineTo(c * fw, canvas.height); ctx.stroke();
    }
    for (let r = 1; r < detectedRows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * fh); ctx.lineTo(canvas.width, r * fh); ctx.stroke();
    }

    // Direction column bands (when expanded)
    if (showDirections) {
      directions.forEach((dir) => {
        const x = dir.startCol * fw;
        const w = dir.frames * fw;
        ctx.fillStyle = dir.color + "22";
        ctx.fillRect(x, 0, w, canvas.height);
        // label
        ctx.fillStyle = dir.color + "cc";
        ctx.font = `bold ${Math.max(8, fh * 0.28)}px monospace`;
        ctx.fillText(dir.name, x + 2, fh * 0.55);
      });
    }

    // Row labels
    ctx.fillStyle = "rgba(99,102,241,0.65)";
    ctx.font = `${Math.max(7, fh * 0.25)}px monospace`;
    for (let r = 0; r < detectedRows; r++) {
      ctx.fillText(String(r + 1), 2, r * fh + fh * 0.55);
    }
  }, [imgEl, frameWidth, frameHeight, detectedCols, detectedRows, showDirections, directions]);

  // ── Crop a single row to a PNG blob ───────────────────────────────────────
  function cropRow(rowIndex: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const c = document.createElement("canvas");
      c.width  = frameWidth * detectedCols;
      c.height = frameHeight;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        imgEl!,
        0, rowIndex * frameHeight, frameWidth * detectedCols, frameHeight,
        0, 0, frameWidth * detectedCols, frameHeight,
      );
      c.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/png");
    });
  }

  // ── Run the import ────────────────────────────────────────────────────────
  async function handleImport() {
    if (!imgEl || !file || detectedRows === 0) return;
    setStage("importing");
    setProgress({ current: 0, total: detectedRows });
    setError(null);

    const previewCol = directions[defaultDir]?.startCol ?? 8;

    try {
      for (let r = 0; r < detectedRows; r++) {
        setProgress({ current: r + 1, total: detectedRows });
        const blob       = await cropRow(r);
        const cropped    = new File([blob], `${namePrefix}_${r + 1}.png`, { type: "image/png" });
        const { url, path } = await uploadImage(cropped, "sprites");
        await createSprite({
          name:        `${namePrefix} ${r + 1}`,
          description: "",
          frameWidth,
          frameHeight,
          columns:     detectedCols,
          rows:        1,
          totalFrames: detectedCols,
          scale,
          animFps,
          animStartCol: 0,
          animEndCol:   detectedCols - 1,
          previewCol,
          previewRow:   0,
          imageUrl: url,
          imagePath: path,
        } as Parameters<typeof createSprite>[0]);
      }
      setStage("done");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStage("config");
    }
  }

  // ── Close / reset ─────────────────────────────────────────────────────────
  function handleClose() {
    if (stage === "importing") return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(null);
    setImgEl(null);
    setObjectUrl(null);
    setStage("config");
    setError(null);
    setDirections(DEFAULT_DIRECTIONS);
    setDefaultDir(2);
    setShowDirections(false);
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Import — Multi-Character Sheet</DialogTitle>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Upload a sheet where each row is a separate character. Each row will be cropped and saved as an individual sprite.
          </p>
        </DialogHeader>

        {/* ── Done ── */}
        {stage === "done" && (
          <div className="flex flex-col items-center py-14 gap-4">
            <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-base font-semibold">{detectedRows} characters imported</p>
            <p className="text-sm text-muted-foreground">They're now in your character library.</p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}

        {/* ── Importing ── */}
        {stage === "importing" && (
          <div className="flex flex-col items-center py-14 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">
              Creating character {progress.current} of {progress.total}…
            </p>
            <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Config ── */}
        {stage === "config" && (
          <div className="space-y-5 mt-1">
            {/* File drop zone */}
            <div
              className="border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              {!imgEl ? (
                <div className="flex flex-col items-center gap-2.5 text-muted-foreground py-10">
                  <ImageIcon className="h-9 w-9 opacity-30" />
                  <p className="text-sm font-medium">Drop sprite sheet here or click to upload</p>
                  <p className="text-xs text-muted-foreground/50">One image · all characters stacked row by row</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded border border-border/50"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <p className="text-[11px] text-muted-foreground/60 text-center">
                    {imgEl.naturalWidth}×{imgEl.naturalHeight}px ·{" "}
                    <strong className="text-foreground/70">{detectedCols}</strong> cols ·{" "}
                    <strong className="text-foreground/70">{detectedRows}</strong> rows detected
                    <span className="ml-2 opacity-50">(click to swap)</span>
                  </p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {imgEl && (
              <>
                {/* Frame + anim config */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frame width (px)</Label>
                    <Input type="number" min={1} value={frameWidth}
                      onChange={(e) => setFrameWidth(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frame height (px)</Label>
                    <Input type="number" min={1} value={frameHeight}
                      onChange={(e) => setFrameHeight(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display scale</Label>
                    <Input type="number" min={1} value={scale}
                      onChange={(e) => setScale(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Anim FPS</Label>
                    <Input type="number" min={1} value={animFps}
                      onChange={(e) => setAnimFps(Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Name prefix</Label>
                    <Input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)}
                      placeholder="Character" className="h-8 text-xs" />
                    <p className="text-[11px] text-muted-foreground/50">
                      Creates: <em>{namePrefix} 1</em>, <em>{namePrefix} 2</em>… ({detectedRows} total)
                    </p>
                  </div>
                </div>

                {/* Direction layout (collapsible) */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDirections((s) => !s)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
                  >
                    <span>Direction layout</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground/50">
                        {directions.map((d) => `${d.name}@${d.startCol}`).join(" · ")}
                      </span>
                      {showDirections
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </div>
                  </button>

                  {showDirections && (
                    <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
                      <p className="text-xs text-muted-foreground/60">
                        Set the starting column and frame count for each walk direction. The default direction sets the idle preview frame for each created character.
                      </p>
                      {directions.map((dir, i) => (
                        <div key={dir.name} className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dir.color }} />
                          <span className="text-xs font-medium w-10 text-foreground/80">{dir.name}</span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/50">col</span>
                            <Input type="number" min={0} max={detectedCols - 1}
                              value={dir.startCol}
                              onChange={(e) => setDirections((prev) => prev.map((d, j) =>
                                j === i ? { ...d, startCol: Math.max(0, Number(e.target.value)) } : d
                              ))}
                              className="h-6 text-xs text-center w-14" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/50">frames</span>
                            <Input type="number" min={1}
                              value={dir.frames}
                              onChange={(e) => setDirections((prev) => prev.map((d, j) =>
                                j === i ? { ...d, frames: Math.max(1, Number(e.target.value)) } : d
                              ))}
                              className="h-6 text-xs text-center w-14" />
                          </div>

                          <button
                            type="button"
                            onClick={() => setDefaultDir(i)}
                            className={cn(
                              "ml-auto text-[10px] px-2 py-0.5 rounded-full border transition-all",
                              defaultDir === i
                                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                                : "border-border text-muted-foreground/40 hover:text-muted-foreground hover:border-muted-foreground/30"
                            )}
                          >
                            {defaultDir === i ? "Default ✓" : "Set default"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={handleImport} disabled={detectedRows === 0}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {detectedRows} Character{detectedRows !== 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
