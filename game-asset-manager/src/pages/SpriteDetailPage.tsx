import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SpriteSheetViewer } from "@/components/sprites/SpriteSheetViewer";
import { VoiceLinesSection } from "@/components/sprites/VoiceLinesSection";
import { SoundEffectsSection } from "@/components/sprites/SoundEffectsSection";
import { TagInput } from "@/components/TagInput";
import { getSprite, updateSprite, deleteSprite, updateTags } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import {
  ArrowLeft, Pencil, Check, X, Sparkles, Loader2,
  Mic2, Zap, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Sprite } from "@/types";
import { cn } from "@/lib/utils";

// ── Shared label ──────────────────────────────────────────────────────────────
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] mb-3">
      {children}
    </p>
  );
}

// ── Inspector row ─────────────────────────────────────────────────────────────
function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground/70 tabular-nums">{value}</span>
    </div>
  );
}

// ── Specs panel ───────────────────────────────────────────────────────────────
function SpecsPanel({ sprite, onSaved, onFormChange }: {
  sprite: Sprite;
  onSaved: () => void;
  onFormChange?: (overrides: Partial<Sprite> | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    columns: sprite.columns,
    rows: sprite.rows,
    totalFrames: sprite.totalFrames,
    scale: sprite.scale,
    animFps: sprite.animFps,
    animStartCol: sprite.animStartCol ?? 0,
    animEndCol: sprite.animEndCol ?? sprite.columns - 1,
    previewCol: sprite.previewCol ?? 0,
    previewRow: sprite.previewRow ?? 0,
  });

  useEffect(() => {
    setForm({
      frameWidth: sprite.frameWidth,
      frameHeight: sprite.frameHeight,
      columns: sprite.columns,
      rows: sprite.rows,
      totalFrames: sprite.totalFrames,
      scale: sprite.scale,
      animFps: sprite.animFps,
      animStartCol: sprite.animStartCol ?? 0,
      animEndCol: sprite.animEndCol ?? sprite.columns - 1,
      previewCol: sprite.previewCol ?? 0,
      previewRow: sprite.previewRow ?? 0,
    });
  }, [sprite]);

  // Propagate live form changes to parent for real-time preview
  useEffect(() => {
    if (editing) onFormChange?.(form);
    else onFormChange?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editing]);

  function setNum(k: keyof typeof form, v: number) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "columns" || k === "rows") {
        next.totalFrames = next.columns * next.rows;
        // clamp anim range to new column count
        next.animStartCol = Math.min(next.animStartCol, next.columns - 1);
        next.animEndCol = Math.min(next.animEndCol, next.columns - 1);
      }
      if (k === "animStartCol") next.animEndCol = Math.max(next.animEndCol, v);
      if (k === "animEndCol") next.animStartCol = Math.min(next.animStartCol, v);
      return next;
    });
  }

  function cancel() {
    setForm({
      frameWidth: sprite.frameWidth,
      frameHeight: sprite.frameHeight,
      columns: sprite.columns,
      rows: sprite.rows,
      totalFrames: sprite.totalFrames,
      scale: sprite.scale,
      animFps: sprite.animFps,
      animStartCol: sprite.animStartCol ?? 0,
      animEndCol: sprite.animEndCol ?? sprite.columns - 1,
      previewCol: sprite.previewCol ?? 0,
      previewRow: sprite.previewRow ?? 0,
    });
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      await updateSprite(sprite.id, form);
      toast.success("Specs updated");
      setEditing(false);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <PanelLabel>Sheet Specs</PanelLabel>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase tracking-wide"
          >
            <Pencil className="h-2.5 w-2.5" />Edit
          </button>
        </div>
        <InspectorRow label="Frame" value={`${sprite.frameWidth} × ${sprite.frameHeight} px`} />
        <InspectorRow label="Grid" value={`${sprite.columns} col × ${sprite.rows} row`} />
        <InspectorRow label="Total frames" value={String(sprite.totalFrames)} />
        <InspectorRow label="Scale" value={`${sprite.scale}×`} />
        <InspectorRow label="FPS" value={`${sprite.animFps} fps`} />
        <InspectorRow
          label="Anim columns"
          value={`${sprite.animStartCol ?? 0} – ${sprite.animEndCol ?? sprite.columns - 1}`}
        />
        <InspectorRow
          label="Preview frame"
          value={`col ${sprite.previewCol ?? 8} · row ${sprite.previewRow ?? 0}`}
        />
        <div className="pt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wide">Full sheet</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {sprite.frameWidth * sprite.columns}×{sprite.frameHeight * sprite.rows}px
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <PanelLabel>Sheet Specs</PanelLabel>
        <div className="flex gap-1">
          <button onClick={cancel} disabled={saving} className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
          <button onClick={save} disabled={saving} className="p-1 text-primary hover:text-primary/80 transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {(["frameWidth", "frameHeight", "columns", "rows", "totalFrames", "scale", "animFps"] as const).map((key) => {
        const labels: Record<string, string> = {
          frameWidth: "Frame width (px)",
          frameHeight: "Frame height (px)",
          columns: "Columns",
          rows: "Rows",
          totalFrames: "Total frames",
          scale: "Display scale",
          animFps: "FPS",
        };
        return (
          <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50">
            <span className="text-xs text-muted-foreground">{labels[key]}</span>
            <Input
              type="number"
              min={1}
              value={form[key]}
              onChange={(e) => setNum(key, Math.max(1, Number(e.target.value)))}
              className="h-6 text-xs text-right w-20"
            />
          </div>
        );
      })}

      {/* Anim column range */}
      <div className="py-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Anim columns</span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">
            {form.animStartCol} – {form.animEndCol}
            <span className="ml-1 text-muted-foreground/30">
              ({form.animEndCol - form.animStartCol + 1} frames)
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={form.columns - 1}
            value={form.animStartCol}
            onChange={(e) => setNum("animStartCol", Math.min(Math.max(0, Number(e.target.value)), form.columns - 1))}
            className="h-6 text-xs text-center w-14"
            title="Start column"
          />
          <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary/40 rounded-full"
              style={{
                left: `${(form.animStartCol / Math.max(form.columns - 1, 1)) * 100}%`,
                right: `${100 - ((form.animEndCol + 1) / Math.max(form.columns, 1)) * 100}%`,
              }}
            />
          </div>
          <Input
            type="number"
            min={0}
            max={form.columns - 1}
            value={form.animEndCol}
            onChange={(e) => setNum("animEndCol", Math.min(Math.max(0, Number(e.target.value)), form.columns - 1))}
            className="h-6 text-xs text-center w-14"
            title="End column"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/30">start</span>
          <span className="text-[10px] text-muted-foreground/30">end</span>
        </div>
      </div>

      {/* Preview frame */}
      <div className="py-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Preview frame</span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">
            col {form.previewCol} · row {form.previewRow}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/50 w-6">col</span>
              <Input
                type="number"
                min={0}
                max={form.columns - 1}
                value={form.previewCol}
                onChange={(e) => setNum("previewCol", Math.min(Math.max(0, Number(e.target.value)), form.columns - 1))}
                className="h-6 text-xs text-center flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/50 w-6">row</span>
              <Input
                type="number"
                min={0}
                max={form.rows - 1}
                value={form.previewRow}
                onChange={(e) => setNum("previewRow", Math.min(Math.max(0, Number(e.target.value)), form.rows - 1))}
                className="h-6 text-xs text-center flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary text-xs font-semibold transition-all"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Character info card (description + tags) ──────────────────────────────────
function CharacterInfoCard({ sprite, onSaved }: { sprite: Sprite; onSaved: () => void }) {
  const [description, setDescription] = useState(sprite.description);
  const [tags, setTags] = useState<string[]>(sprite.tags ?? []);
  const [describing, setDescribing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(sprite.description);
    setTags(sprite.tags ?? []);
  }, [sprite]);

  const isDirty =
    description !== sprite.description ||
    JSON.stringify(tags) !== JSON.stringify(sprite.tags ?? []);

  async function describeWithAI() {
    setDescribing(true);
    try {
      const res = await fetch(`/api/game/sprites/${sprite.id}/describe`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { description: string };
      setDescription(data.description);
      toast.success("Description generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
    } finally {
      setDescribing(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await updateSprite(sprite.id, { description });
      await updateTags(sprite.id, "sprite", tags);
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
          About
        </p>
        <button
          onClick={describeWithAI}
          disabled={describing}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-violet-600 transition-colors uppercase tracking-wide disabled:opacity-40"
        >
          {describing
            ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
            : <Sparkles className="h-2.5 w-2.5" />}
          AI Write
        </button>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe this character — personality, role, abilities…"
        className="w-full resize-none text-xs rounded-lg bg-white border border-border focus:border-primary/40 px-3 py-2.5 min-h-[72px] text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none transition-colors"
      />

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] mb-2">Tags</p>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder="Add tag… (Enter or comma)"
        />
        <p className="text-[10px] text-muted-foreground/40 mt-1.5">Used for semantic similarity search</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-border px-6 flex items-center gap-4">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex flex-1">
        <div className="w-[300px] border-r border-border p-5 space-y-5">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function SpriteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sprite, setSprite] = useState<Sprite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liveSpecs, setLiveSpecs] = useState<Partial<Sprite> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getSprite(id);
    setSprite(data);
    if (data) setNameValue(data.name);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveName() {
    if (!sprite || !nameValue.trim()) return;
    setSavingName(true);
    try {
      await updateSprite(sprite.id, { name: nameValue.trim() });
      setEditingName(false);
      load();
    } catch {
      toast.error("Failed to save name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDelete() {
    if (!sprite) return;
    setDeleting(true);
    try {
      await deleteSprite(sprite.id);
      await deleteImage(sprite.imagePath);
      toast.success(`"${sprite.name}" deleted`);
      navigate("/sprites");
    } catch {
      toast.error("Failed to delete character");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (!sprite) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-semibold text-foreground text-lg mb-3">Character not found</h2>
        <Link
          to="/sprites"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Characters
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Top bar ── */}
      <header className="h-14 flex items-center border-b border-border bg-background sticky top-0 z-20 shrink-0">
        <Link
          to="/sprites"
          className="h-full flex items-center px-4 border-r border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Name edit */}
        <div className="flex-1 flex items-center px-5">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") { setEditingName(false); setNameValue(sprite.name); }
                }}
                className="h-8 text-base font-bold max-w-xs"
                autoFocus
              />
              <button onClick={saveName} disabled={savingName} className="p-1.5 text-primary hover:text-primary/80 transition-colors">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => { setEditingName(false); setNameValue(sprite.name); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="group flex items-center gap-2">
              <span className="text-base font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                {sprite.name}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Meta stats */}
        <div className="flex items-center gap-5 px-5 border-l border-border">
          {[
            { label: "Frames", value: String(sprite.totalFrames) },
            { label: "Grid", value: `${sprite.columns}×${sprite.rows}` },
            { label: "FPS", value: String(sprite.animFps) },
            { label: "Scale", value: `${sprite.scale}×` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-semibold text-muted-foreground tabular-nums mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Delete */}
        <div className="flex items-center gap-2 px-4 border-l border-border">
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete character"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1">
        {/* ── Left panel (inspector) ── */}
        <aside className="w-[300px] shrink-0 border-r border-border bg-muted/20 flex flex-col sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="p-4 border-b border-border">
            <PanelLabel>Preview</PanelLabel>
            <SpriteSheetViewer sprite={liveSpecs ? { ...sprite, ...liveSpecs } : sprite} autoPlay />
          </div>
          <div className="p-4">
            <SpecsPanel sprite={sprite} onSaved={load} onFormChange={setLiveSpecs} />
          </div>
        </aside>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0 p-6 space-y-5">
          {/* Description + Tags */}
          <CharacterInfoCard sprite={sprite} onSaved={load} />

          {/* Sound FX + Voice Lines side by side */}
          <div className="grid grid-cols-2 gap-5">
            {/* Sound FX */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Sound FX</span>
                {(sprite.audioClips?.length ?? 0) > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 tabular-nums">
                    {sprite.audioClips.length}
                  </span>
                )}
              </div>
              <div className="p-5">
                <SoundEffectsSection sprite={sprite} onUpdate={load} />
              </div>
            </div>

            {/* Voice Lines */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
                <Mic2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-sm font-semibold text-foreground">Voice Lines</span>
                {(sprite.voiceLines?.length ?? 0) > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 tabular-nums">
                    {sprite.voiceLines.length}
                  </span>
                )}
              </div>
              <div className="p-5">
                <VoiceLinesSection sprite={sprite} onUpdate={load} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
