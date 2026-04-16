import { useRef, useEffect, useState, useCallback } from "react";
import type { Sprite } from "@/types";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface SpriteSheetViewerProps {
  sprite: Sprite;
  autoPlay?: boolean;
}

export function SpriteSheetViewer({ sprite, autoPlay = false }: SpriteSheetViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  const [animStep, setAnimStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [loaded, setLoaded] = useState(false);

  const { frameWidth, frameHeight, columns, scale, animFps, imageUrl } = sprite;

  // Resolved range — default to full sheet if not set
  const startCol = sprite.animStartCol ?? 0;
  const endCol = sprite.animEndCol ?? columns - 1;
  const animCols = endCol - startCol + 1;
  const animFrameCount = animCols * sprite.rows;

  // Preview frame — default idle frame when not animating
  const previewCol = sprite.previewCol ?? 8;
  const previewRow = sprite.previewRow ?? 0;
  // Convert previewCol/previewRow to an animStep (best effort: clamp to anim range)
  const previewStep = Math.min(
    (previewRow * animCols) + Math.max(0, previewCol - startCol),
    animFrameCount - 1
  );

  const displayW = frameWidth * scale;
  const displayH = frameHeight * scale;

  useEffect(() => {
    setLoaded(false);
    setAnimStep(previewStep);
    setPlaying(autoPlay);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => { imgRef.current = img; setLoaded(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // Convert animStep → sheet col/row
  const stepToColRow = useCallback((step: number) => {
    const col = startCol + (step % animCols);
    const row = Math.floor(step / animCols);
    return { col, row };
  }, [startCol, animCols]);

  const drawStep = useCallback((step: number) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = displayW;
    canvas.height = displayH;
    ctx.imageSmoothingEnabled = false;

    const { col, row } = stepToColRow(step);
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, col * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, displayW, displayH);
  }, [loaded, frameWidth, frameHeight, displayW, displayH, stepToColRow]);

  // Sync to previewStep when not playing (covers live-edit changes to previewCol/Row)
  useEffect(() => {
    if (!playing) setAnimStep(previewStep);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStep]);

  // Clamp animStep when frame count changes (live-edit columns / anim range)
  useEffect(() => {
    setAnimStep((s) => Math.min(s, Math.max(0, animFrameCount - 1)));
  }, [animFrameCount]);

  useEffect(() => { drawStep(animStep); }, [animStep, drawStep]);

  // Animation loop
  useEffect(() => {
    if (!playing || !loaded) return;
    const interval = 1000 / animFps;
    function loop(ts: number) {
      if (ts - lastFrameTime.current >= interval) {
        lastFrameTime.current = ts;
        setAnimStep((s) => (s + 1) % animFrameCount);
      }
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, loaded, animFps, animFrameCount]);

  const prev = () => { setPlaying(false); setAnimStep((s) => (s - 1 + animFrameCount) % animFrameCount); };
  const next = () => { setPlaying(false); setAnimStep((s) => (s + 1) % animFrameCount); };

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      setAnimStep(previewStep);
    } else {
      setPlaying(true);
    }
  }

  const { col: currentCol, row: currentRow } = stepToColRow(animStep);

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div
        className="w-full rounded-xl overflow-hidden flex items-center justify-center border border-border"
        style={{
          minHeight: Math.max(displayH, 100),
          background: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 0 0 / 18px 18px",
        }}
      >
        {!loaded ? (
          <div className="text-muted-foreground/40 text-xs animate-pulse py-8">Loading…</div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ imageRendering: "pixelated", width: displayW, height: displayH }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          disabled={!loaded}
          className="h-7 w-7 rounded-md bg-muted hover:bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={togglePlay}
          disabled={!loaded}
          className="h-7 w-7 rounded-md bg-muted hover:bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={next}
          disabled={!loaded}
          className="h-7 w-7 rounded-md bg-muted hover:bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] text-muted-foreground tabular-nums ml-1 font-mono">
          col {currentCol} · row {currentRow}
        </span>
      </div>

      {/* Scrubber */}
      {loaded && animFrameCount > 1 && (
        <input
          type="range"
          min={0}
          max={animFrameCount - 1}
          step={1}
          value={animStep}
          onChange={(e) => { setPlaying(false); setAnimStep(Number(e.target.value)); }}
          className="w-full h-1 accent-primary rounded-full"
        />
      )}
    </div>
  );
}
