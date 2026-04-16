import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── Animated canvas background ────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    }
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.5 + 0.15,
      speed: Math.random() * 0.00015 + 0.00005,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    function draw() {
      if (!canvas || !ctx) return;
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "28px 24px",
        backdropFilter: "blur(8px)",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.18)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)")
      }
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid rgba(6,182,212,0.4)",
          background: "rgba(6,182,212,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#22d3ee",
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "monospace",
        }}
      >
        {num}
      </div>
      <div>
        <h4 style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14.5, marginBottom: 6 }}>{title}</h4>
        <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.65 }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Tech badge ────────────────────────────────────────────────────────────────
function TechBadge({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: "16px 20px",
        minWidth: 200,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "#03040e",
        minHeight: "100vh",
        fontFamily: "'Open Sans', sans-serif",
        color: "#e2e8f0",
        overflowX: "hidden",
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(3,4,14,0.85)",
          backdropFilter: "blur(16px)",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo icon */}
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#22d3ee" opacity={0.9} />
            <path d="M2 17l10 5 10-5" stroke="#8b5cf6" strokeWidth={1.5} strokeLinecap="round" />
            <path d="M2 12l10 5 10-5" stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
            Sound Forge
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/graph")}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#cbd5e1",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Asset Graph
          </button>
          <button
            onClick={() => navigate("/sprites")}
            style={{
              background: "linear-gradient(135deg, #0891b2, #7c3aed)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Open App →
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "96px 32px 80px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <StarField />

        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "20%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            right: "15%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: 740, margin: "0 auto" }}>
          {/* Hackathon badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 100,
              padding: "5px 14px 5px 8px",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                background: "linear-gradient(90deg,#22d3ee,#8b5cf6)",
                color: "transparent",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 100,
                border: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              Hackathon
            </span>
            <span style={{ color: "#94a3b8", fontSize: 12.5 }}>
              Built for ElevenLabs × turbopuffer
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(40px, 5vw, 62px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
              background: "linear-gradient(135deg, #f1f5f9 20%, #94a3b8 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Forge the Sound<br />
            <span
              style={{
                background: "linear-gradient(90deg, #22d3ee 0%, #818cf8 50%, #c084fc 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
              }}
            >
              of Your Game.
            </span>
          </h1>

          <p
            style={{
              color: "#64748b",
              fontSize: 17,
              lineHeight: 1.7,
              maxWidth: 560,
              margin: "0 auto 36px",
            }}
          >
            Upload your sprites and maps. Sound Forge uses AI to give every character a voice,
            generate dynamic soundscapes, and map the semantic relationships between all your assets —
            automatically.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/sprites")}
              style={{
                background: "linear-gradient(135deg, #0891b2 0%, #7c3aed 100%)",
                border: "none",
                color: "#fff",
                borderRadius: 10,
                padding: "13px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 32px rgba(8,145,178,0.3)",
              }}
            >
              Start Forging →
            </button>
            <button
              onClick={() => navigate("/graph")}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                borderRadius: 10,
                padding: "13px 28px",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              View Asset Graph
            </button>
          </div>

          {/* Floating pills */}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 40,
            }}
          >
            {["AI Voice Lines", "Semantic Search", "Music Generation", "Force Graph", "Sprite Preview", "Sound Effects"].map(
              (pill) => (
                <span
                  key={pill}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 100,
                    padding: "4px 12px",
                    fontSize: 11.5,
                    color: "#475569",
                    letterSpacing: "0.02em",
                  }}
                >
                  {pill}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── GRAPH SHOWCASE ──────────────────────────────────────────────── */}
      <section style={{ padding: "20px 32px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p
              style={{
                color: "#22d3ee",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Live Asset Graph
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "#f1f5f9",
                marginBottom: 12,
              }}
            >
              Your Asset Universe, Mapped
            </h2>
            <p style={{ color: "#475569", fontSize: 14.5, maxWidth: 500, margin: "0 auto" }}>
              A physics-simulated force graph that reveals semantic connections between characters,
              maps, and sound effects — powered by turbopuffer vector search.
            </p>
          </div>

          {/* Browser chrome wrapper */}
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px -20px rgba(0,0,0,0.6), 0 0 60px rgba(6,182,212,0.08)",
            }}
          >
            {/* Chrome bar */}
            <div
              style={{
                background: "#0f1117",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.8 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.8 }} />
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 11.5,
                  color: "#475569",
                  fontFamily: "monospace",
                }}
              >
                localhost:5173/graph
              </div>
              <div style={{ width: 60 }} />
            </div>

            {/* Iframe */}
            <div style={{ height: 580, background: "#f8fafc", position: "relative" }}>
              <iframe
                src="/graph"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  display: "block",
                }}
                title="Asset Graph"
              />
            </div>
          </div>

          {/* Graph legend callout */}
          <div
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            {[
              { color: "#0891b2", label: "Characters" },
              { color: "#f59e0b", label: "Maps" },
              { color: "#8b5cf6", label: "Sound Effects" },
              { color: "#94a3b8", label: "Semantic similarity edges" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ color: "#475569", fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ padding: "20px 32px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p
              style={{
                color: "#8b5cf6",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Features
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "#f1f5f9",
              }}
            >
              Everything your game needs to sound alive
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <FeatureCard
              accent="rgba(6,182,212,0.15)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#22d3ee" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              }
              title="AI Voice Lines"
              desc="Every character gets a unique ElevenLabs voice. Generate dialogue, ambient chatter, and custom sound effects with a single prompt."
            />
            <FeatureCard
              accent="rgba(139,92,246,0.15)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <circle cx={11} cy={11} r={7} stroke="#a78bfa" strokeWidth={1.5} />
                  <path d="m21 21-4.35-4.35" stroke="#a78bfa" strokeWidth={1.5} strokeLinecap="round" />
                  <path d="M8 11h6M11 8v6" stroke="#a78bfa" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              }
              title="Semantic Asset Search"
              desc="turbopuffer's vector search finds the right audio blueprint based on meaning — not just keywords. Describe a vibe, get the perfect sound."
            />
            <FeatureCard
              accent="rgba(245,158,11,0.12)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <path d="M9 18V5l12-2v13" stroke="#fbbf24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={6} cy={18} r={3} stroke="#fbbf24" strokeWidth={1.5} />
                  <circle cx={18} cy={16} r={3} stroke="#fbbf24" strokeWidth={1.5} />
                </svg>
              }
              title="Music & Soundscapes"
              desc="Full background tracks and layered ambient soundscapes generated per map. Each location gets its own sonic identity, forged on demand."
            />
            <FeatureCard
              accent="rgba(34,197,94,0.1)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <circle cx={5} cy={12} r={2.5} stroke="#4ade80" strokeWidth={1.5} />
                  <circle cx={19} cy={5} r={2.5} stroke="#4ade80" strokeWidth={1.5} />
                  <circle cx={19} cy={19} r={2.5} stroke="#4ade80" strokeWidth={1.5} />
                  <circle cx={12} cy={12} r={2.5} stroke="#4ade80" strokeWidth={1.5} />
                  <path d="M7.5 12h2M14.5 12h2M17 7l-3 3.5M17 17l-3-3.5" stroke="#4ade80" strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              }
              title="Live Relationship Graph"
              desc="Physics-simulated force graph shows how characters, maps, and sounds relate through shared semantic tags and parent-child associations."
            />
            <FeatureCard
              accent="rgba(244,63,94,0.1)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <rect x={3} y={3} width={18} height={18} rx={3} stroke="#fb7185" strokeWidth={1.5} />
                  <path d="M3 9h18M9 9v12" stroke="#fb7185" strokeWidth={1.2} strokeLinecap="round" />
                  <rect x={12} y={13} width={5} height={4} rx={1} fill="#fb7185" opacity={0.5} />
                </svg>
              }
              title="Sprite Sheet Preview"
              desc="Canvas-based live animation preview extracts exact frames from any sprite sheet. See your characters move before committing to a voice."
            />
            <FeatureCard
              accent="rgba(6,182,212,0.08)"
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h10M4 18h6" stroke="#67e8f9" strokeWidth={1.5} strokeLinecap="round" />
                  <circle cx={19} cy={17} r={3} stroke="#67e8f9" strokeWidth={1.5} />
                  <path d="M19 15.5v1.5l1 1" stroke="#67e8f9" strokeWidth={1.2} strokeLinecap="round" />
                </svg>
              }
              title="Batch Import & Tagging"
              desc="Upload multiple sprites at once and tag them semantically. Tags power both the asset graph edges and the turbopuffer similarity search."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "20px 32px 80px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p
              style={{
                color: "#22d3ee",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "#f1f5f9",
              }}
            >
              From sprite sheet to full audio world in minutes
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 40,
              position: "relative",
            }}
          >
            {/* Connector line */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: "calc(16% + 18px)",
                right: "calc(16% + 18px)",
                height: 1,
                background: "linear-gradient(90deg, rgba(6,182,212,0.4), rgba(139,92,246,0.4))",
                pointerEvents: "none",
              }}
            />

            <StepCard
              num="01"
              title="Upload your sprites & maps"
              desc="Drop in sprite sheets and map images. Set frame dimensions, animation ranges, and the preview frame for the graph."
            />
            <StepCard
              num="02"
              title="Tag with semantic labels"
              desc="Add descriptive tags like 'forest', 'mysterious', 'warrior'. turbopuffer embeds and indexes them for similarity search."
            />
            <StepCard
              num="03"
              title="Generate voice, sound & music"
              desc="One click. ElevenLabs generates voice lines and unique sound effects per character, plus ambient music tracks for every map."
            />
            <StepCard
              num="04"
              title="Explore the graph"
              desc="Watch the force-directed graph reveal hidden connections — which sounds belong to which characters, which maps share a mood."
            />
          </div>
        </div>
      </section>

      {/* ── HACKATHON SECTION ────────────────────────────────────────────── */}
      <section
        style={{
          padding: "60px 32px 80px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 12,
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a78bfa",
              marginBottom: 24,
            }}
          >
            ✦ Hackathon Project
          </div>

          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 38px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#f1f5f9",
              marginBottom: 16,
            }}
          >
            Built for ElevenLabs{" "}
            <span style={{ color: "#475569" }}>×</span>{" "}
            turbopuffer
          </h2>

          <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
            Sound Forge was built to demonstrate how semantic vector search and generative audio
            can combine into a practical creative tool. turbopuffer powers fast ANN similarity search
            across tagged game assets; ElevenLabs turns every semantic match into real, unique audio —
            no sound designer required.
          </p>

          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <TechBadge
              label="ElevenLabs"
              sub="Voice, SFX & Music generation"
              color="#22d3ee"
            />
            <TechBadge
              label="turbopuffer"
              sub="Vector DB · ANN semantic search"
              color="#8b5cf6"
            />
            <TechBadge
              label="HuggingFace"
              sub="all-MiniLM-L6-v2 · local embeddings"
              color="#f59e0b"
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#22d3ee" opacity={0.9} />
            <path d="M2 17l10 5 10-5" stroke="#8b5cf6" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
          <span style={{ color: "#334155", fontSize: 13, fontWeight: 600 }}>Sound Forge</span>
        </div>
        <p style={{ color: "#1e293b", fontSize: 12 }}>
          ElevenLabs × turbopuffer Hackathon 2025
        </p>
      </footer>
    </div>
  );
}
