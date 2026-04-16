import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SpritesPage } from "@/pages/SpritesPage";
import { SpriteDetailPage } from "@/pages/SpriteDetailPage";
import { MapsPage } from "@/pages/MapsPage";
import { MapDetailPage } from "@/pages/MapDetailPage";
import { GraphPage } from "@/pages/GraphPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/sprites" replace />} />
          <Route path="/sprites" element={<SpritesPage />} />
          <Route path="/sprites/:id" element={<SpriteDetailPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/maps/:id" element={<MapDetailPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
