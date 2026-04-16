import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { addVoiceLine, deleteVoiceLine, getExistingTags, suggestTags } from "@/lib/db";
import {
  Mic2, Play, Pause, Trash2, Sparkles, Loader2, Plus, X,
} from "lucide-react";
import type { Sprite, VoiceLine } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AISuggestion {
  label: string;
  text: string;
}

// ── Voice line row ────────────────────────────────────────────────────────────
function VoiceLineRow({ line, onDelete }: { line: VoiceLine; onDelete: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border hover:border-border/80 transition-all group">
      <div className="flex items-start gap-3">
        <audio ref={audioRef} src={line.url} onEnded={() => setPlaying(false)} />
        <button
          onClick={toggle}
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
            playing
              ? "bg-emerald-500 text-white"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
          )}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-px" />}
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          <span className="text-[10px] font-semibold text-emerald-600/70 uppercase tracking-wider">{line.label}</span>
          <p className="text-sm text-foreground/70 mt-0.5 leading-snug">&ldquo;{line.text}&rdquo;</p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 mt-0.5 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Tags — read-only chips */}
      {(line.tags ?? []).length > 0 && (
        <div className="pl-11 flex flex-wrap gap-1">
          {(line.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI suggestion card ────────────────────────────────────────────────────────
function SuggestionCard({
  suggestion,
  onGenerate,
  generating,
}: {
  suggestion: AISuggestion;
  onGenerate: (s: AISuggestion) => void;
  generating: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-muted/20 p-4 space-y-3 transition-all hover:border-border/80",
      generating && "opacity-50"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{suggestion.label}</span>
        {generating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
      </div>
      <p className="text-sm text-foreground/60 leading-snug italic">&ldquo;{suggestion.text}&rdquo;</p>
      <button
        onClick={() => onGenerate(suggestion)}
        disabled={generating}
        className="w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
      >
        <Mic2 className="h-3 w-3" />
        {generating ? "Generating…" : "Generate Voice"}
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function VoiceLinesSection({ sprite, onUpdate }: { sprite: Sprite; onUpdate: () => void }) {
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    getExistingTags().then(setExistingTags).catch(() => {});
  }, []);

  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    setSuggestions(null);
    setSuggestionError(null);
    try {
      const res = await fetch(`/api/game/sprites/${sprite.id}/suggest-voice-lines`, {
        method: "POST",
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { voiceLines } = await res.json() as { voiceLines: AISuggestion[] };
      setSuggestions(voiceLines);
    } catch (err: unknown) {
      setSuggestionError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function generateFromSuggestion(s: AISuggestion) {
    setGeneratingLabel(s.label);
    try {
      const res = await fetch("/api/game/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: s.text }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };

      // Auto-tag
      const tags = await suggestTags(s.label, s.text, sprite.name, sprite.description).catch(() => []);

      await addVoiceLine(sprite.id, { text: s.text, label: s.label, url, tags });
      toast.success(`"${s.label}" generated`);
      getExistingTags().then(setExistingTags).catch(() => {});
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingLabel(null);
    }
  }

  async function handleManualGenerate() {
    if (!manualLabel.trim()) { toast.error("Label is required"); return; }
    if (!manualText.trim()) { toast.error("Text is required"); return; }
    setManualBusy(true);
    try {
      const res = await fetch("/api/game/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: manualText.trim() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };

      // Auto-tag
      const tags = await suggestTags(manualLabel.trim(), manualText.trim(), sprite.name, sprite.description).catch(() => []);

      await addVoiceLine(sprite.id, { text: manualText.trim(), label: manualLabel.trim(), url, tags });
      toast.success(`"${manualLabel}" generated`);
      setManualLabel(""); setManualText(""); setShowManual(false);
      getExistingTags().then(setExistingTags).catch(() => {});
      onUpdate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setManualBusy(false);
    }
  }

  async function handleDelete(lineId: string, label: string) {
    await deleteVoiceLine(sprite.id, lineId);
    toast.success(`"${label}" removed`);
    onUpdate();
  }

  const hasDescription = !!sprite.description;
  const hasLines = sprite.voiceLines.length > 0;

  // Suppress unused warning — existingTags loaded for future use / consistency
  void existingTags;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={fetchSuggestions}
          disabled={loadingSuggestions || !hasDescription}
          title={!hasDescription ? "Add a description first" : "Generate AI voice line ideas"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loadingSuggestions ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" />AI Suggest</>
          )}
        </button>
        <button
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-all"
        >
          <Plus className="h-3.5 w-3.5" />Write custom
        </button>
      </div>

      {/* Manual input */}
      {showManual && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Custom Voice Line</p>
            <button onClick={() => { setShowManual(false); setManualLabel(""); setManualText(""); }} className="text-muted-foreground/40 hover:text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              placeholder="Label (e.g. Battle Cry)"
              className="h-8 text-sm col-span-1"
            />
            <Input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={`"For glory!"`}
              className="h-8 text-sm col-span-2"
              onKeyDown={(e) => e.key === "Enter" && handleManualGenerate()}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowManual(false); setManualLabel(""); setManualText(""); }}
              disabled={manualBusy}
              className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleManualGenerate}
              disabled={manualBusy}
              className="flex-1 py-1.5 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              {manualBusy ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
              ) : (
                <><Mic2 className="h-3.5 w-3.5" />Generate Voice</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {suggestionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {suggestionError}
        </div>
      )}

      {/* AI suggestions */}
      {suggestions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-500" />AI Suggestions
            </p>
            <button onClick={() => setSuggestions(null)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.label}
                suggestion={s}
                onGenerate={generateFromSuggestion}
                generating={generatingLabel === s.label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Voice lines list */}
      {hasLines && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
            {sprite.voiceLines.length} Voice Line{sprite.voiceLines.length !== 1 ? "s" : ""}
          </p>
          {sprite.voiceLines.map((line) => (
            <VoiceLineRow
              key={line.id}
              line={line}
              onDelete={() => handleDelete(line.id, line.label)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasLines && !suggestions && !showManual && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <Mic2 className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-foreground/50 mb-1">No voice lines yet</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {hasDescription
              ? "Use AI Suggest to generate ideas, or write a custom line above."
              : "Add a description in the inspector to unlock AI suggestions."}
          </p>
        </div>
      )}
    </div>
  );
}
