import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { MusicManager } from "@/components/maps/MusicManager";
import { TagInput } from "@/components/TagInput";
import { getMap, updateMap, deleteMap, updateTags, getRelated } from "@/lib/db";
import type { RelatedAsset } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GameMap } from "@/types";

// ── Info panel ────────────────────────────────────────────────────────────────
function MapInfoPanel({ map, onSaved }: { map: GameMap; onSaved: () => void }) {
  const [name, setName] = useState(map.name);
  const [description, setDescription] = useState(map.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(map.name);
    setDescription(map.description);
  }, [map]);

  const dirty = name.trim() !== map.name || description !== map.description;

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateMap(map.id, { name: name.trim(), description });
      toast.success("Saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="map-name">Name</Label>
        <Input
          id="map-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Map name"
        />
      </div>

      <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
        <Label htmlFor="map-desc">Description</Label>
        <textarea
          id="map-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this map — biome, atmosphere, events… used for AI music generation."
          className={cn(
            "flex-1 w-full resize-none text-sm rounded-md border border-input bg-background px-3 py-2",
            "focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 min-h-0"
          )}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !dirty}
        size="sm"
        className="w-full"
      >
        {saving
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          : "Save Changes"}
      </Button>
    </div>
  );
}

// ── Tags panel ────────────────────────────────────────────────────────────────
function MapTagsPanel({ map, onSaved }: { map: GameMap; onSaved: () => void }) {
  const [tags, setTags] = useState<string[]>(map.tags ?? []);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(map.tags ?? []);
  }, [map.tags]);

  function handleChange(newTags: string[]) {
    setTags(newTags);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateTags(map.id, "map", newTags);
        toast.success("Tags saved");
        onSaved();
      } catch {
        toast.error("Failed to save tags");
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Tags</h3>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />}
      </div>
      <TagInput
        value={tags}
        onChange={handleChange}
        placeholder="Add tag… (Enter or comma)"
      />
      <p className="text-[11px] text-muted-foreground/50">
        Used for semantic similarity search and graph view
      </p>
    </div>
  );
}

// ── Related assets section ────────────────────────────────────────────────────
function RelatedAssetsSection({ map }: { map: GameMap }) {
  const navigate = useNavigate();
  const [related, setRelated] = useState<RelatedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRelated(map.id, "map")
      .then((r) => { if (!cancelled) setRelated(r); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [map.id]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Related Assets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (related.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-2">Related Assets</h3>
        <p className="text-xs text-muted-foreground/60">
          No related assets found. Add tags and index assets to see semantic matches here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="text-sm font-medium text-foreground">Related Assets</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {related.map((asset) => (
          <button
            key={asset.id}
            onClick={() => navigate(`/${asset.type}s/${asset.id}`)}
            className={cn(
              "flex flex-col gap-1.5 p-3 rounded-lg border text-left transition-all",
              "border-border bg-muted/30 hover:bg-muted/60 hover:border-border/80"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  asset.type === "sprite" ? "bg-cyan-400" : "bg-amber-400"
                )}
              />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                {asset.type}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">
                {Math.round(asset.score * 100)}%
              </span>
            </div>
            <p className="text-xs font-medium text-foreground/80 truncate">{asset.name}</p>
            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {asset.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/40 border border-white/[0.06]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getMap(id);
    setMap(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!map) return;
    setDeleting(true);
    try {
      await deleteMap(map.id);
      await deleteImage(map.imagePath);
      toast.success(`"${map.name}" deleted`);
      navigate("/maps");
    } catch {
      toast.error("Failed to delete map");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="aspect-video rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!map) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-medium text-lg mb-2">Map not found</h2>
        <Button asChild variant="outline">
          <Link to="/maps"><ArrowLeft className="h-4 w-4 mr-2" />Back to Maps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Top bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button asChild variant="ghost" size="icon" className="shrink-0 h-8 w-8 -ml-1 text-muted-foreground hover:text-foreground">
          <Link to="/maps"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="w-px h-4 bg-border" />
        <span className="text-sm font-medium text-muted-foreground">Maps</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium truncate">{map.name}</span>

        <div className="ml-auto flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Delete "{map.name}"?</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Two-column header — equal height */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left: map image */}
          <div className="rounded-xl overflow-hidden border bg-muted flex items-center justify-center">
            <img
              src={map.imageUrl}
              alt={map.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right: name + description form */}
          <div className="rounded-xl border bg-card p-5 flex flex-col">
            <MapInfoPanel map={map} onSaved={load} />
          </div>
        </div>

        {/* Tags */}
        <MapTagsPanel map={map} onSaved={load} />

        {/* Related assets */}
        <RelatedAssetsSection map={map} />

        <Separator />

        {/* Music tracks */}
        <div className="rounded-xl border bg-card p-5">
          <MusicManager map={map} onUpdate={load} />
        </div>
      </div>
    </div>
  );
}
