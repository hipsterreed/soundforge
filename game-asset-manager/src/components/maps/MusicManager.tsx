import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMapTrack, removeMapTrack, apiBase } from "@/lib/db";
import {
  Music, Play, Pause, Trash2, Loader2, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import type { GameMap, MapTrack } from "@/types";
import { toast } from "sonner";

interface TrackRowProps {
  track: MapTrack;
  onDelete: () => void;
}

function TrackRow({ track, onDelete }: TrackRowProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  async function handleDelete() {
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
    setDeleting(true);
    onDelete();
  }

  const date = new Date(track.createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors group">
      <audio
        ref={audioRef}
        src={track.url}
        loop
        onEnded={() => setPlaying(false)}
      />

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={togglePlay}
      >
        {playing
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5" />}
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.prompt}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface MusicManagerProps {
  map: GameMap;
  onUpdate: () => void;
}

export function MusicManager({ map, onUpdate }: MusicManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState(
    `Background music for a video game map called ${map.name}. ${map.description}`.trim().slice(0, 900)
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) { setError("Enter a music description."); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(apiBase + "/api/game/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(b?.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      await addMapTrack(map.id, { url, prompt });
      toast.success("Track added");
      setShowForm(false);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRemoveTrack(trackId: string) {
    try {
      await removeMapTrack(map.id, trackId);
      toast.success("Track removed");
      onUpdate();
    } catch {
      toast.error("Failed to remove track");
    }
  }

  const tracks = map.tracks ?? [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Music Tracks</h3>
          {tracks.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {tracks.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setShowForm((v) => !v)}
          disabled={generating}
        >
          {showForm
            ? <><ChevronUp className="h-3 w-3" />Hide</>
            : <><Plus className="h-3 w-3" />Generate</>}
        </Button>
      </div>

      {/* Track list */}
      {tracks.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center">
          <Music className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tracks yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Use Generate to create AI music for this map.
          </p>
        </div>
      ) : tracks.length > 0 ? (
        <div className="rounded-lg border divide-y">
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onDelete={() => handleRemoveTrack(track.id)}
            />
          ))}
        </div>
      ) : null}

      {/* Generate form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
          <div className="space-y-1.5">
            <Label>Music description</Label>
            <Input
              placeholder="e.g. Epic orchestral background music for a fantasy battle game map, intense and heroic"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : <><Music className="h-4 w-4 mr-2" />Generate Track</>}
          </Button>
        </div>
      )}
    </div>
  );
}
