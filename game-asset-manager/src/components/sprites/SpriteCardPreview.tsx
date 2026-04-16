import { useRef, useEffect, useState, useCallback } from "react";
import type { Sprite } from "@/types";

interface Props {
  sprite: Sprite;
}

export function SpriteCardPreview({ sprite }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);
  const animStepRef = useRef(0);

  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);

  const { frameWidth, frameHeight, columns, animFps, imageUrl } = sprite;

  // Resolved animation range
  const startCol = sprite.animStartCol ?? 0;
  const endCol = sprite.animEndCol ?? columns - 1;
  const animCols = endCol - startCol + 1;
  const animFrameCount = animCols * sprite.rows;

  // Preview (idle) frame
  const previewCol = sprite.previewCol ?? 8;
  const previewRow = sprite.previewRow ?? 0;
  const previewStep = Math.min(
    (previewRow * animCols) + Math.max(0, previewCol - startCol),
    animFrameCount - 1
  );

  // Fit frame into a 160×160 display box, integer scale for pixel crispness
  const maxDisplay = 160;
  const rawScale = Math.min(maxDisplay / frameWidth, maxDisplay / frameHeight);
  const pixelScale = Math.max(1, Math.floor(rawScale));
  const displayW = frameWidth * pixelScale;
  const displayH = frameHeight * pixelScale;

  useEffect(() => {
    setLoaded(false);
    animStepRef.current = previewStep;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => { imgRef.current = img; setLoaded(true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const drawStep = useCallback((step: number) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = displayW;
    canvas.height = displayH;
    ctx.imageSmoothingEnabled = false;

    const col = startCol + (step % animCols);
    const row = Math.floor(step / animCols);
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, col * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, displayW, displayH);
  }, [loaded, startCol, animCols, frameWidth, frameHeight, displayW, displayH]);

  // Draw preview frame on load
  useEffect(() => { drawStep(previewStep); }, [drawStep, previewStep]);

  // Animate on hover
  useEffect(() => {
    if (!hovering || !loaded || animFrameCount <= 1) return;
    const interval = 1000 / animFps;

    function loop(ts: number) {
      if (ts - lastFrameTime.current >= interval) {
        lastFrameTime.current = ts;
        animStepRef.current = (animStepRef.current + 1) % animFrameCount;
        drawStep(animStepRef.current);
      }
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animStepRef.current = previewStep;
      drawStep(previewStep);
    };
  }, [hovering, loaded, animFps, animFrameCount, drawStep]);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!loaded ? (
        <div className="text-muted-foreground/30 text-xs animate-pulse">Loading…</div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ imageRendering: "pixelated", width: displayW, height: displayH }}
        />
      )}
    </div>
  );
}
