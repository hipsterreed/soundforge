import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadSpriteDialog } from "@/components/sprites/UploadSpriteDialog";
import { BatchImportDialog } from "@/components/sprites/BatchImportDialog";
import { getSprites, deleteSprite } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import { Plus, Rows3, Trash2, Music2, Layers, User } from "lucide-react";
import { SpriteCardPreview } from "@/components/sprites/SpriteCardPreview";
import type { Sprite } from "@/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function SpritesPage() {
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getSprites();
    setSprites(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(sprite: Sprite, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteSprite(sprite.id);
    await deleteImage(sprite.imagePath);
    toast.success(`"${sprite.name}" deleted`);
    setSprites((prev) => prev.filter((s) => s.id !== sprite.id));
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.14em] mb-2">
            Asset Library
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Characters</h1>
          {!loading && sprites.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {sprites.length} character{sprites.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 border border-border text-foreground/70 text-sm font-medium transition-all"
          >
            <Rows3 className="h-4 w-4" />
            Batch Import
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Character
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : sprites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6">
            <User className="h-9 w-9 text-muted-foreground/30" />
          </div>
          <h2 className="font-bold text-foreground text-lg mb-2">No characters yet</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
            Upload a sprite sheet to start building your character library. Add voice lines, sound effects, and music themes.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Character
          </button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
          layout
        >
          <AnimatePresence>
            {sprites.map((sprite) => (
              <motion.div
                key={sprite.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Link to={`/sprites/${sprite.id}`} className="group block">
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
                    {/* Preview area */}
                    <div
                      className="aspect-square overflow-hidden relative"
                      style={{
                        background: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 0 0 / 18px 18px",
                      }}
                    >
                      <SpriteCardPreview sprite={sprite} />
                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(sprite, e)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-md bg-background/90 border border-border backdrop-blur-sm flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {/* Audio indicator dots */}
                      {(sprite.voiceLines?.length > 0 || sprite.audioClips?.length > 0 || sprite.music) && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {sprite.voiceLines?.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Has voice lines" />
                          )}
                          {sprite.audioClips?.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Has sound effects" />
                          )}
                          {sprite.music && (
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" title="Has music theme" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3.5 pt-3 pb-3 border-t border-border">
                      <p className="font-semibold text-sm text-foreground truncate leading-tight">{sprite.name}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1 tabular-nums">
                          <Layers className="h-3 w-3" />
                          {sprite.totalFrames}f
                        </span>
                        {sprite.audioClips?.length > 0 && (
                          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                            <Music2 className="h-3 w-3" />
                            {sprite.audioClips.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Add new card */}
            <motion.button
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowUpload(true)}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-2.5 text-muted-foreground/40 hover:text-primary/60 group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-muted group-hover:bg-primary/10 border border-border group-hover:border-primary/20 flex items-center justify-center transition-all">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">New character</span>
            </motion.button>
          </AnimatePresence>
        </motion.div>
      )}

      <UploadSpriteDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onCreated={() => { load(); setShowUpload(false); }}
      />
      <BatchImportDialog
        open={showBatchImport}
        onClose={() => setShowBatchImport(false)}
        onCreated={() => { load(); setShowBatchImport(false); }}
      />
    </div>
  );
}
