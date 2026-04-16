import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getGraph } from "@/lib/db";
import type { GraphNode, GraphEdge, SpriteFrameData } from "@/lib/db";
import { RefreshCw, Loader2 } from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────────────────
const REPULSION = 22000;
const SPRING_K = 0.03;
const REST_LEN = 240;
const DAMPING = 0.82;
const GRAVITY = 0.01;
const MAX_TICKS = 400;
const MIN_DIST = 30;

interface PhysicsNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  imageUrl?: string;
  parentId?: string;
  spriteFrame?: SpriteFrameData;
}

function buildPhysicsNodes(nodes: GraphNode[], w: number, h: number): PhysicsNode[] {
  return nodes.map((n) => ({
    ...n,
    x: w / 2 + (Math.random() - 0.5) * w * 0.25,
    y: h / 2 + (Math.random() - 0.5) * h * 0.25,
    vx: 0,
    vy: 0,
    r: n.type === "clip" ? 16 : 28 + Math.min(n.tags.length * 2, 8),
  }));
}

function tick(
  nodes: PhysicsNode[],
  edges: GraphEdge[],
  w: number,
  h: number
) {
  const cx = w / 2;
  const cy = h / 2;

  // Reset forces
  const fx = new Float32Array(nodes.length);
  const fy = new Float32Array(nodes.length);

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      const force = REPULSION / (dist * dist);
      const ux = dx / dist;
      const uy = dy / dist;
      fx[i] += ux * force;
      fy[i] += uy * force;
      fx[j] -= ux * force;
      fy[j] -= uy * force;
    }
  }

  // Spring (edges)
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));
  for (const edge of edges) {
    const i = nodeIndex.get(edge.from);
    const j = nodeIndex.get(edge.to);
    if (i === undefined || j === undefined) continue;
    const dx = nodes[j].x - nodes[i].x;
    const dy = nodes[j].y - nodes[i].y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = SPRING_K * (dist - REST_LEN);
    const ux = dx / dist;
    const uy = dy / dist;
    fx[i] += ux * force;
    fy[i] += uy * force;
    fx[j] -= ux * force;
    fy[j] -= uy * force;
  }

  // Center gravity + integrate
  for (let i = 0; i < nodes.length; i++) {
    fx[i] += GRAVITY * (cx - nodes[i].x);
    fy[i] += GRAVITY * (cy - nodes[i].y);

    nodes[i].vx = (nodes[i].vx + fx[i]) * DAMPING;
    nodes[i].vy = (nodes[i].vy + fy[i]) * DAMPING;
    nodes[i].x += nodes[i].vx;
    nodes[i].y += nodes[i].vy;

    // Clamp to canvas
    nodes[i].x = Math.max(nodes[i].r + 4, Math.min(w - nodes[i].r - 4, nodes[i].x));
    nodes[i].y = Math.max(nodes[i].r + 4, Math.min(h - nodes[i].r - 4, nodes[i].y));
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function GraphPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipNode, setTooltipNode] = useState<PhysicsNode | null>(null);

  const rafRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const nodesRef = useRef<PhysicsNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const dragNodeRef = useRef<string | null>(null);
  // 208 = sidebar width (w-52), 56 = graph header (h-14)
  const [dims, setDims] = useState({
    w: Math.max(600, window.innerWidth - 208),
    h: Math.max(400, window.innerHeight - 56),
  });

  // Track dims
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDims({ w: width, h: height });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load data
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { nodes: gn, edges: ge } = await getGraph();
      const pn = buildPhysicsNodes(gn, dims.w, dims.h);
      nodesRef.current = pn;
      edgesRef.current = ge;
      setNodes([...pn]);
      setEdges(ge);
      tickRef.current = 0;
      setLastRefresh(new Date());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dims.w, dims.h]);

  useEffect(() => {
    load();
  }, [load]);

  // Physics loop
  useEffect(() => {
    if (loading) return;

    function loop() {
      if (tickRef.current >= MAX_TICKS || dragNodeRef.current !== null) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      tick(nodesRef.current, edgesRef.current, dims.w, dims.h);
      tickRef.current++;
      setNodes([...nodesRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, dims.w, dims.h]);

  // Connected edge ids for highlighting
  const connectedEdgeSet = hoveredId
    ? new Set(
        edgesRef.current
          .filter((e) => e.from === hoveredId || e.to === hoveredId)
          .map((e) => `${e.from}-${e.to}`)
      )
    : new Set<string>();

  // Drag
  function onMouseDownNode(e: React.MouseEvent, nodeId: string) {
    e.preventDefault();
    dragNodeRef.current = nodeId;

    function onMove(ev: MouseEvent) {
      const svg = svgRef.current;
      if (!svg || dragNodeRef.current === null) return;
      const rect = svg.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const idx = nodesRef.current.findIndex((n) => n.id === dragNodeRef.current);
      if (idx !== -1) {
        nodesRef.current[idx].x = x;
        nodesRef.current[idx].y = y;
        nodesRef.current[idx].vx = 0;
        nodesRef.current[idx].vy = 0;
        setNodes([...nodesRef.current]);
        setTooltipNode({ ...nodesRef.current[idx] });
      }
    }

    function onUp() {
      dragNodeRef.current = null;
      tickRef.current = 0; // resume simulation briefly
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="w-full rounded-xl" style={{ height: "calc(100vh - 8rem)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <header className="h-14 flex items-center gap-4 px-6 border-b border-slate-200 bg-white sticky top-0 z-20 shrink-0">
        <h1 className="text-sm font-semibold text-slate-800">Asset Graph</h1>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 ml-2">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
          {lastRefresh && (
            <span>
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={refreshing}
            className="h-8 text-xs"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-50">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-slate-400 text-sm">No assets to display</p>
            <p className="text-slate-300 text-xs max-w-xs">
              Add sprites and maps, then tag them to see semantic relationships here.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="absolute inset-0"
            style={{ cursor: "default" }}
          >
            {/* Clip paths — one per node, updated every tick */}
            <defs>
              {nodes.map((node) => (
                <clipPath key={node.id} id={`clip-${node.id}`}>
                  <circle cx={node.x} cy={node.y} r={node.r - 1} />
                </clipPath>
              ))}
            </defs>

            {/* Edges */}
            <g>
              {edges.map((edge) => {
                const from = nodesRef.current.find((n) => n.id === edge.from);
                const to = nodesRef.current.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                const key = `${edge.from}-${edge.to}`;
                const isHighlighted = hoveredId && connectedEdgeSet.has(key);
                const isParentEdge = edge.isParent === true;

                if (isParentEdge) {
                  const opacity = isHighlighted ? 0.6 : hoveredId ? 0.08 : 0.35;
                  return (
                    <line
                      key={key}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#8b5cf6"
                      strokeWidth={0.8}
                      strokeDasharray="4 3"
                      opacity={opacity}
                    />
                  );
                }

                const opacity = isHighlighted
                  ? 0.7
                  : hoveredId
                  ? 0.04
                  : 0.12 + edge.score * 0.35;
                return (
                  <line
                    key={key}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlighted ? "#0891b2" : "#94a3b8"}
                    strokeWidth={isHighlighted ? 2 : 1}
                    opacity={opacity}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {nodes.map((node) => {
                const isHovered = hoveredId === node.id;
                const isConnected =
                  hoveredId && !isHovered
                    ? edgesRef.current.some(
                        (e) =>
                          (e.from === hoveredId && e.to === node.id) ||
                          (e.to === hoveredId && e.from === node.id)
                      )
                    : false;
                const dimmed = hoveredId && !isHovered && !isConnected;
                const isClip = node.type === "clip";
                const isSprite = node.type === "sprite";

                const strokeColor = isClip ? "#8b5cf6" : isSprite ? "#0891b2" : "#f59e0b";
                const hoverStroke = isClip ? "#7c3aed" : isSprite ? "#0e7490" : "#d97706";
                const bgFill = isClip ? "rgba(139,92,246,0.15)" : isSprite ? "#f0f9ff" : "#fffbeb";

                return (
                  <g
                    key={node.id}
                    style={{ cursor: isClip ? "default" : "pointer" }}
                    onMouseEnter={() => { setHoveredId(node.id); setTooltipNode(node); }}
                    onMouseLeave={() => { setHoveredId(null); setTooltipNode(null); }}
                    onMouseDown={(e) => onMouseDownNode(e, node.id)}
                    onClick={() => {
                      if (!isClip) navigate(`/${node.type}s/${node.id}`);
                    }}
                    opacity={dimmed ? 0.2 : 1}
                  >
                    {/* Hover ring */}
                    {isHovered && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r + 7}
                        fill="none"
                        stroke={hoverStroke}
                        strokeWidth={2}
                        opacity={0.25}
                      />
                    )}

                    {/* Background fill */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={bgFill}
                      stroke={isHovered ? hoverStroke : strokeColor}
                      strokeWidth={isHovered ? 2 : 1.5}
                    />

                    {/* Asset image clipped to circle — skip for clip nodes */}
                    {!isClip && node.imageUrl && (() => {
                      const diameter = (node.r - 1) * 2;
                      if (isSprite && node.spriteFrame) {
                        const { frameWidth, frameHeight, columns, rows, previewCol, previewRow } = node.spriteFrame;
                        // Scale so one frame fills the node diameter
                        const scaleX = diameter / frameWidth;
                        const scaleY = diameter / frameHeight;
                        const scale = Math.min(scaleX, scaleY);
                        const totalW = columns * frameWidth * scale;
                        const totalH = rows * frameHeight * scale;
                        // Offset so the preview frame is centered in the node
                        const imgX = node.x - node.r + 1 - previewCol * frameWidth * scale;
                        const imgY = node.y - node.r + 1 - previewRow * frameHeight * scale;
                        return (
                          <image
                            href={node.imageUrl}
                            x={imgX}
                            y={imgY}
                            width={totalW}
                            height={totalH}
                            clipPath={`url(#clip-${node.id})`}
                            style={{ imageRendering: "pixelated" }}
                          />
                        );
                      }
                      return (
                        <image
                          href={node.imageUrl}
                          x={node.x - node.r + 1}
                          y={node.y - node.r + 1}
                          width={diameter}
                          height={diameter}
                          clipPath={`url(#clip-${node.id})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      );
                    })()}

                    {/* Border on top of image */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill="none"
                      stroke={isHovered ? hoverStroke : strokeColor}
                      strokeWidth={isHovered ? 2 : 1.5}
                    />

                    <text
                      x={node.x}
                      y={node.y + node.r + 14}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize={isClip ? 9 : 10}
                      fontWeight={isHovered ? "600" : "400"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.name.length > 16 ? node.name.slice(0, 14) + "…" : node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Tooltip */}
        {tooltipNode && hoveredId && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{
              left: Math.min(tooltipNode.x + tooltipNode.r + 12, dims.w - 220),
              top: Math.max(tooltipNode.y - 20, 4),
            }}
          >
            <p className="text-xs font-semibold text-slate-800 mb-0.5">{tooltipNode.name}</p>
            <p className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
              {tooltipNode.type === "clip" ? "Sound Effect" : tooltipNode.type}
            </p>
            {tooltipNode.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-[180px]">
                {tooltipNode.tags.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-300">No tags</p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-5 left-5 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Legend
          </p>
          <div className="flex items-center gap-2">
            <svg width={16} height={16}>
              <circle cx={8} cy={8} r={7} fill="#f0f9ff" stroke="#0891b2" strokeWidth={1.5} />
            </svg>
            <span className="text-[11px] text-slate-600">Character</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width={16} height={16}>
              <circle cx={8} cy={8} r={7} fill="#fffbeb" stroke="#f59e0b" strokeWidth={1.5} />
            </svg>
            <span className="text-[11px] text-slate-600">Map</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width={16} height={16}>
              <circle cx={8} cy={8} r={7} fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" strokeWidth={1.5} />
            </svg>
            <span className="text-[11px] text-slate-600">Sound Effect</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width={16} height={2}>
              <line x1={0} y1={1} x2={16} y2={1} stroke="#94a3b8" strokeWidth={1} opacity={0.7} />
            </svg>
            <span className="text-[11px] text-slate-600">Semantic similarity</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width={16} height={2}>
              <line x1={0} y1={1} x2={16} y2={1} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            </svg>
            <span className="text-[11px] text-slate-600">Parent / child</span>
          </div>
        </div>
      </div>
    </div>
  );
}
