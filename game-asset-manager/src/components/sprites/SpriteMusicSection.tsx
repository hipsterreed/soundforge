import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSpriteMusic, apiBase } from "@/lib/db";
import { Music2, Play, Pause, RefreshCw, Trash2, Loader2, Sparkles } from "lucide-react";
import type { Sprite } from "@/types";
import { toast } from "sonner";

export function SpriteMusicSection({ sprite, onUpdate }: { sprite: Sprite; onUpdate: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showForm, setShowForm] = useState(!sprite.music);
  const [prompt, setPrompt] = useState(
    sprite.music?.prompt ??
      (sprite.description
        ? `Background music theme for ${sprite.name}: ${sprite.description}`
        : `Background music theme for ${sprite.name}`)
  );
  const [duration, setDuration] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setError("Enter a music description."); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(apiBase + "/api/game/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, durationSeconds: duration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      await setSpriteMusic(sprite.id, { url, prompt });
      toast.success("Music generated!");
      setPlaying(false);
      setShowForm(false);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRemove() {
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
    await setSpriteMusic(sprite.id, null);
    toast.success("Music removed");
    setShowForm(true);
    onUpdate();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Active music player */}
      {sprite.music && !showForm && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <audio ref={audioRef} src={sprite.music.url} loop onEnded={() => setPlaying(false)} />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-all shadow-sm shadow-violet-200 shrink-0"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">Character Theme</p>
                {playing && (
                  <div className="flex items-end gap-0.5 h-4">
                    {[3, 5, 4, 6, 3, 5, 4, 3].map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-violet-400 rounded-full animate-pulse"
                        style={{ height: `${h * 2.5}px`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{sprite.music.prompt}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-violet-100">
            <button
              onClick={() => { setShowForm(true); if (audioRef.current) { audioRef.current.pause(); setPlaying(false); } }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-background hover:bg-muted/50 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />Regenerate
            </button>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600/70 hover:text-red-600 border border-red-100 bg-background hover:bg-red-50 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />Remove
            </button>
          </div>
        </div>
      )}

      {/* Generate form */}
      {showForm && (
        <div className="space-y-5">
          {!sprite.music && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] mb-1">About</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate a unique music theme for this character. The theme will reflect their personality and role.
                {sprite.description ? "" : " Add a description for better results."}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
                Music Description
              </Label>
              <Input
                placeholder="e.g. Heroic orchestral theme with flutes and light percussion…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="text-sm h-10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
                  Duration
                </Label>
                <span className="text-xs font-semibold text-violet-600 tabular-nums">{duration}s</span>
              </div>
              <input
                type="range" min={15} max={120} step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-violet-600 h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/40">
                <span>15s</span>
                <span>30s</span>
                <span>60s</span>
                <span>90s</span>
                <span>120s</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {sprite.music && (
                <button
                  onClick={() => setShowForm(false)}
                  disabled={generating}
                  className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 flex items-center justify-center gap-2 transition-all shadow-sm shadow-violet-200 disabled:opacity-40"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating {duration}s…</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Generate Music</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!sprite.music && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
            <Music2 className="h-7 w-7 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-foreground/50 mb-1">No music theme</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-violet-600 hover:text-violet-500 transition-colors">
            Generate a theme →
          </button>
        </div>
      )}
    </div>
  );
}
