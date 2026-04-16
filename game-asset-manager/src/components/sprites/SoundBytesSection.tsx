import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addAudioClip, deleteAudioClip } from "@/lib/db";
import {
  Play, Pause, Trash2, Sparkles, Loader2, Plus, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import type { Sprite, AudioClip } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Suggestion {
  label: string;
  prompt: string;
  duration: number;
}

// ── Single clip row ──────────────────────────────────────────────────────────
function ClipRow({ clip, onDelete }: { clip: AudioClip; onDelete: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
      <audio ref={audioRef} src={clip.url} onEnded={() => setPlaying(false)} />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors shrink-0"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{clip.label}</span>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{clip.prompt}</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0 font-mono">{clip.duration}s</Badge>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── AI suggestion card ───────────────────────────────────────────────────────
function SuggestionCard({
  suggestion,
  onGenerate,
  generating,
}: {
  suggestion: Suggestion;
  onGenerate: (s: Suggestion) => void;
  generating: boolean;
}) {
  return (
    <div className={cn(
      "relative rounded-xl border bg-card p-4 flex flex-col gap-3 transition-all",
      generating && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">{suggestion.label}</div>
          <Badge variant="outline" className="text-xs font-mono mt-1">{suggestion.duration}s</Badge>
        </div>
        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {suggestion.prompt}
      </p>
      <Button
        size="sm"
        className="w-full mt-auto"
        onClick={() => onGenerate(suggestion)}
        disabled={generating}
      >
        {generating ? (
          <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Generating…</>
        ) : (
          "Generate"
        )}
      </Button>
    </div>
  );
}

// ── Manual add form ──────────────────────────────────────────────────────────
function ManualAddForm({ spriteId, onAdded }: { spriteId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!label.trim()) { setError("Label is required"); return; }
    if (!prompt.trim()) { setError("Description is required"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/game/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      await addAudioClip(spriteId, { label: label.trim(), prompt, url, duration });
      toast.success(`"${label}" added`);
      setLabel(""); setPrompt(""); setDuration(3); setOpen(false);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t pt-3 mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        Add manually
        {open && <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Walk" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration: {duration}s</Label>
              <input
                type="range" min={1} max={10} step={1} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full mt-2 accent-primary"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sound description</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the sound…" className="h-8 text-sm" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={handleGenerate} disabled={busy} className="flex-1">
              {busy ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Generating…</> : "Generate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function SoundBytesSection({ sprite, onUpdate }: { sprite: Sprite; onUpdate: () => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    setSuggestions(null);
    setSuggestionError(null);
    try {
      const res = await fetch(`/api/game/sprites/${sprite.id}/suggest-sounds`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { suggestions: s } = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(s);
    } catch (err: unknown) {
      setSuggestionError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function generateSuggestion(s: Suggestion) {
    setGeneratingLabel(s.label);
    try {
      const res = await fetch("/api/game/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: s.prompt, duration: s.duration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      await addAudioClip(sprite.id, { label: s.label, prompt: s.prompt, url, duration: s.duration });
      toast.success(`"${s.label}" generated`);
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingLabel(null);
    }
  }

  async function handleDelete(clipId: string, label: string) {
    await deleteAudioClip(sprite.id, clipId);
    toast.success(`"${label}" removed`);
    onUpdate();
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <h3 className="font-semibold">Sound Bytes</h3>
          {sprite.audioClips.length > 0 && (
            <Badge variant="secondary" className="text-xs">{sprite.audioClips.length}</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loadingSuggestions || !sprite.description}
          title={!sprite.description ? "Add a description to get AI suggestions" : "Get AI sound suggestions"}
          className="gap-1.5"
        >
          {loadingSuggestions ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5 text-violet-500" />AI Suggest</>
          )}
        </Button>
      </div>

      <div className="p-4 space-y-1">
        {/* Existing clips */}
        {sprite.audioClips.length === 0 && !suggestions && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No sound bytes yet.{" "}
            {sprite.description
              ? "Click AI Suggest to generate ideas."
              : "Add a description to unlock AI suggestions, or add manually."}
          </p>
        )}
        {sprite.audioClips.map((clip) => (
          <ClipRow key={clip.id} clip={clip} onDelete={() => handleDelete(clip.id, clip.label)} />
        ))}

        {/* AI suggestions */}
        {suggestionError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-2">
            {suggestionError}
          </div>
        )}
        {suggestions && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-violet-400" /> AI Suggestions
              </p>
              <button
                onClick={() => setSuggestions(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.label}
                  suggestion={s}
                  onGenerate={generateSuggestion}
                  generating={generatingLabel === s.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Manual add */}
        <ManualAddForm spriteId={sprite.id} onAdded={onUpdate} />
      </div>
    </div>
  );
}
