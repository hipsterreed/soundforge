import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAudioClip, deleteAudioClip, updateAudioClipTags, getExistingTags, suggestTags, apiBase } from "@/lib/db";
import { Play, Pause, Trash2, Loader2, Plus, Zap, Lock } from "lucide-react";
import type { Sprite, AudioClip } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/TagInput";
import { GENERATION_DISABLED, GENERATION_DISABLED_MESSAGE } from "@/lib/featureFlags";

const PRESETS = [
  {
    label: "Jump",
    emoji: "↑",
    buildPrompt: (name: string, desc: string) =>
      `${name}${desc ? ` — ${desc.slice(0, 60)}` : ""} jumping sound: quick light whoosh, soft landing thud, 1 second`,
    duration: 1,
  },
  {
    label: "Attack",
    emoji: "⚔",
    buildPrompt: (name: string, desc: string) =>
      `${name}${desc ? ` — ${desc.slice(0, 60)}` : ""} attack: sharp melee strike, weapon impact, aggressive crack`,
    duration: 1,
  },
  {
    label: "Hurt",
    emoji: "✦",
    buildPrompt: (name: string, desc: string) =>
      `${name}${desc ? ` — ${desc.slice(0, 60)}` : ""} hurt: damage impact hit, short pain grunt or yelp`,
    duration: 1,
  },
  {
    label: "Death",
    emoji: "☆",
    buildPrompt: (name: string, desc: string) =>
      `${name}${desc ? ` — ${desc.slice(0, 60)}` : ""} death: heavy collapse thud, dramatic final sound, 2 seconds`,
    duration: 2,
  },
] as const;

// ── Clip row ──────────────────────────────────────────────────────────────────
function ClipRow({
  clip,
  spriteId,
  existingTags,
  onDelete,
  onTagsChange,
}: {
  clip: AudioClip;
  spriteId: string;
  existingTags: string[];
  onDelete: () => void;
  onTagsChange: (tags: string[]) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(clip.tags ?? []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function handleTagsChange(tags: string[]) {
    setLocalTags(tags);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateAudioClipTags(spriteId, clip.id, tags);
        onTagsChange(tags);
      } catch {
        // silently fail
      }
    }, 600);
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border hover:border-border/80 transition-all group">
      <div className="flex items-center gap-3">
        <audio ref={audioRef} src={clip.url} onEnded={() => setPlaying(false)} />
        <button
          onClick={toggle}
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
            playing
              ? "bg-primary text-primary-foreground"
              : "bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-px" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground/80">{clip.label}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{clip.prompt}</p>
        </div>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono shrink-0">{clip.duration}s</span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Tags */}
      <div className="pl-11">
        <TagInput
          value={localTags}
          onChange={handleTagsChange}
          placeholder="Add tag…"
          suggestions={existingTags}
          className="min-h-0 py-1 px-1.5 gap-1 border-transparent bg-transparent focus-within:border-violet-300/40 focus-within:bg-white/5"
        />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function SoundEffectsSection({ sprite, onUpdate }: { sprite: Sprite; onUpdate: () => void }) {
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customDuration, setCustomDuration] = useState(2);
  const [customBusy, setCustomBusy] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    getExistingTags().then(setExistingTags).catch(() => {});
  }, []);

  const refreshTags = useCallback(() => {
    getExistingTags().then(setExistingTags).catch(() => {});
  }, []);

  async function generatePreset(preset: typeof PRESETS[number]) {
    setGeneratingLabel(preset.label);
    const prompt = preset.buildPrompt(sprite.name, sprite.description);
    try {
      const res = await fetch(apiBase + "/api/game/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration: preset.duration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };

      // Auto-tag in parallel with save
      const tags = await suggestTags(preset.label, prompt, sprite.name, sprite.description).catch(() => []);

      await addAudioClip(sprite.id, { label: preset.label, prompt, url, duration: preset.duration, tags });
      toast.success(`"${preset.label}" generated`);
      refreshTags();
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingLabel(null);
    }
  }

  async function handleCustomGenerate() {
    if (!customLabel.trim()) { toast.error("Label is required"); return; }
    if (!customPrompt.trim()) { toast.error("Description is required"); return; }
    setCustomBusy(true);
    try {
      const context = [sprite.name, sprite.description ? sprite.description.slice(0, 100) : null]
        .filter(Boolean).join(" — ");
      const enrichedPrompt = `${context}: ${customPrompt.trim()}`;
      const res = await fetch(apiBase + "/api/game/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: enrichedPrompt, duration: customDuration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };

      // Auto-tag
      const tags = await suggestTags(customLabel.trim(), customPrompt.trim(), sprite.name, sprite.description).catch(() => []);

      await addAudioClip(sprite.id, { label: customLabel.trim(), prompt: customPrompt.trim(), url, duration: customDuration, tags });
      toast.success(`"${customLabel}" generated`);
      setCustomLabel(""); setCustomPrompt(""); setCustomDuration(2); setShowCustom(false);
      refreshTags();
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setCustomBusy(false);
    }
  }

  async function handleDelete(clipId: string, label: string) {
    await deleteAudioClip(sprite.id, clipId);
    toast.success(`"${label}" removed`);
    onUpdate();
  }

  const isGenerating = generatingLabel !== null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Quick generate presets */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] mb-3">Quick Generate</p>
        <div className="grid grid-cols-4 gap-3">
          {PRESETS.map((preset) => {
            const busy = generatingLabel === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() => generatePreset(preset)}
                disabled={isGenerating || GENERATION_DISABLED}
                title={GENERATION_DISABLED ? GENERATION_DISABLED_MESSAGE : undefined}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
                  "bg-emerald-50/50 border-emerald-200 text-emerald-700",
                  "hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800",
                  busy && "bg-emerald-100 border-emerald-300 text-emerald-800",
                  isGenerating && !busy && "opacity-30",
                  GENERATION_DISABLED && "opacity-40 cursor-not-allowed hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700",
                  "disabled:cursor-not-allowed"
                )}
              >
                {GENERATION_DISABLED
                  ? <Lock className="h-4 w-4" />
                  : busy
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Zap className="h-4 w-4" />}
                <span className="text-xs font-semibold">{busy ? "…" : preset.label}</span>
              </button>
            );
          })}
        </div>
        {GENERATION_DISABLED && (
          <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            {GENERATION_DISABLED_MESSAGE}
          </p>
        )}
      </div>

      {/* Existing clips */}
      {sprite.audioClips.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] mb-3">
            {sprite.audioClips.length} Clip{sprite.audioClips.length !== 1 ? "s" : ""}
          </p>
          {sprite.audioClips.map((clip) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              spriteId={sprite.id}
              existingTags={existingTags}
              onDelete={() => handleDelete(clip.id, clip.label)}
              onTagsChange={refreshTags}
            />
          ))}
        </div>
      )}

      {/* Custom SFX */}
      <div>
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            disabled={isGenerating || GENERATION_DISABLED}
            title={GENERATION_DISABLED ? GENERATION_DISABLED_MESSAGE : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {GENERATION_DISABLED ? <Lock className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            Custom sound effect
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Custom Sound Effect</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Label</Label>
                <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. Slide" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Sound description</Label>
                <Input value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Describe the sound…" className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                Duration — {customDuration}s
              </Label>
              <input
                type="range" min={1} max={10} step={1} value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full accent-primary h-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCustom(false)}
                disabled={customBusy}
                className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomGenerate}
                disabled={customBusy}
                className="flex-1 py-1.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              >
                {customBusy ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                ) : (
                  <><Zap className="h-3.5 w-3.5" />Generate</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {sprite.audioClips.length === 0 && !showCustom && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
            <Zap className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground/50 mb-1">No sound effects yet</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Use Quick Generate to create common game sounds, or add a custom effect.
          </p>
        </div>
      )}
    </div>
  );
}
