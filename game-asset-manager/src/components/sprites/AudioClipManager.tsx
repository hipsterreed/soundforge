import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAudioClip, deleteAudioClip, apiBase } from "@/lib/db";
import { Plus, Trash2, Play, Pause, Loader2, Music2 } from "lucide-react";
import type { Sprite, AudioClip } from "@/types";
import { toast } from "sonner";

const PRESET_ACTIONS = [
  { label: "Walking", prompt: "footsteps walking on ground, rhythmic" },
  { label: "Running", prompt: "fast footsteps running, rapid impact" },
  { label: "Jump", prompt: "short jump whoosh and landing thud" },
  { label: "Attack", prompt: "sword slash attack whoosh impact" },
  { label: "Hurt", prompt: "character pain impact grunt hit sound" },
  { label: "Death", prompt: "dramatic death fall thud collapse" },
  { label: "Idle", prompt: "subtle ambient idle breathing presence" },
  { label: "Custom", prompt: "" },
];

interface AudioClipManagerProps {
  sprite: Sprite;
  onUpdate: () => void;
}

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
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <audio ref={audioRef} src={clip.url} onEnded={() => setPlaying(false)} />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggle}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{clip.label}</div>
        <div className="text-xs text-muted-foreground truncate">{clip.prompt}</div>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">{clip.duration}s</Badge>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function AudioClipManager({ sprite, onUpdate }: AudioClipManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(PRESET_ACTIONS[0].label);
  const [customLabel, setCustomLabel] = useState("");
  const [prompt, setPrompt] = useState(PRESET_ACTIONS[0].prompt);
  const [duration, setDuration] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function handlePresetChange(label: string) {
    setSelected(label);
    const p = PRESET_ACTIONS.find((a) => a.label === label);
    if (p) setPrompt(p.prompt);
  }

  async function handleGenerate() {
    const label = selected === "Custom" ? customLabel.trim() : selected;
    if (!label) { setGenError("Enter a label."); return; }
    if (!prompt.trim()) { setGenError("Enter a prompt."); return; }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(apiBase + "/api/game/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(b?.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      await addAudioClip(sprite.id, { label, prompt, url, duration, tags: [] });
      toast.success(`"${label}" clip added`);
      onUpdate();
      setShowAdd(false);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(clipId: string, label: string) {
    await deleteAudioClip(sprite.id, clipId);
    toast.success(`"${label}" removed`);
    onUpdate();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Audio Clips</h3>
          {sprite.audioClips.length > 0 && (
            <Badge variant="secondary">{sprite.audioClips.length}</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Generate Clip
        </Button>
      </div>

      {sprite.audioClips.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-muted/20">
          No audio clips yet. Generate sounds for walking, jumping, attacks and more.
        </div>
      ) : (
        <div className="space-y-2">
          {sprite.audioClips.map((clip) => (
            <ClipRow key={clip.id} clip={clip} onDelete={() => handleDelete(clip.id, clip.label)} />
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Audio Clip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Action type</Label>
              <Select value={selected} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_ACTIONS.map((a) => (
                    <SelectItem key={a.label} value={a.label}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected === "Custom" && (
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input placeholder="e.g. Dash" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Sound description</Label>
              <Input
                placeholder="Describe the sound…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Duration: {duration}s</Label>
              <input
                type="range" min={1} max={10} step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {genError && <p className="text-sm text-destructive">{genError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={generating}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
