import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadMapDialog } from "@/components/maps/UploadMapDialog";
import { getMaps, deleteMap } from "@/lib/db";
import { deleteImage } from "@/lib/storage";
import { Plus, Trash2, Music2, Map } from "lucide-react";
import type { GameMap } from "@/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function MapsPage() {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const data = await getMaps();
    setMaps(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(map: GameMap, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteMap(map.id);
    await deleteImage(map.imagePath);
    toast.success(`"${map.name}" deleted`);
    setMaps((prev) => prev.filter((m) => m.id !== map.id));
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maps</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your game maps and background music</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Map
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : maps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Map className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="font-medium text-lg mb-1">No maps yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Upload your first map image to get started</p>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Map
          </Button>
        </div>
      ) : (
        <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" layout>
          <AnimatePresence>
            {maps.map((map) => (
              <motion.div key={map.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Link to={`/maps/${map.id}`}>
                  <Card className="group overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative">
                      <img
                        src={map.imageUrl}
                        alt={map.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(map, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <div className="font-medium text-sm truncate">{map.name}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {map.tracks?.length > 0 ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Music2 className="h-2.5 w-2.5" />{map.tracks.length} track{map.tracks.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">No music</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <UploadMapDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onCreated={(id) => { navigate(`/maps/${id}`); setShowUpload(false); }}
      />
    </div>
  );
}
