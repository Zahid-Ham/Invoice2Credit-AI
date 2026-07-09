/**
 * FinancialNetworkEngine.jsx
 *
 * Full-page animated Canvas background for the Invoice2Credit AI landing page.
 * Covers the entire page from Hero to Footer — continuous, seamless, 60fps.
 *
 * Architecture:
 *   Layer 1 — Gradient mesh (very slow drift)
 *   Layer 2 — Financial network nodes + connections
 *   Layer 3 — Moving capital / invoice packets along connections
 *   Layer 4 — AI pulse waves from AI nodes
 *   Layer 5 — Blockchain hex cells (subtle, fixed positions)
 *   Layer 6 — Fog vignette blends
 *
 * All rendering is on a single Canvas2D context for maximum performance.
 */

import React, { useRef, useEffect, useCallback } from 'react';

/* ─── Node type definitions ─────────────────────────────────────────────── */
const NODE_TYPES = {
  MSME:        { color: '#3b82f6', label: 'MSME',       ai: false, chain: false },
  INVOICE:     { color: '#6366f1', label: 'Invoice',    ai: false, chain: false },
  AI:          { color: '#a855f7', label: 'AI',         ai: true,  chain: false },
  GST:         { color: '#06b6d4', label: 'GST',        ai: false, chain: false },
  BLOCKCHAIN:  { color: '#10b981', label: 'Chain',      ai: false, chain: true  },
  NFT:         { color: '#f59e0b', label: 'NFT',        ai: false, chain: true  },
  MARKETPLACE: { color: '#ec4899', label: 'Market',     ai: false, chain: false },
  INVESTOR:    { color: '#34d399', label: 'Investor',   ai: false, chain: false },
  ESCROW:      { color: '#8b5cf6', label: 'Escrow',     ai: false, chain: true  },
  BUYER:       { color: '#14b8a6', label: 'Buyer',      ai: false, chain: false },
  SETTLEMENT:  { color: '#f97316', label: 'Settle',     ai: false, chain: false },
  WALLET:      { color: '#22d3ee', label: 'Wallet',     ai: false, chain: false },
};

/* Determines how many nodes of each type to generate based on canvas height */
function buildNodeLayout(W, H, isMobile) {
  const scale = isMobile ? 0.5 : 1;

  // Each entry: [type, relativeX, relativeY (0-1 of full page height)]
  const layout = [
    // === HERO ZONE (0–12%) ===
    ['MSME',        0.12, 0.04], ['INVOICE',    0.50, 0.06],
    ['AI',          0.82, 0.04], ['GST',        0.30, 0.08],
    ['BLOCKCHAIN',  0.70, 0.09], ['INVESTOR',   0.90, 0.07],

    // === STATS / PROBLEM (12–25%) ===
    ['WALLET',      0.20, 0.15], ['ESCROW',     0.60, 0.16],
    ['MSME',        0.80, 0.18], ['AI',         0.40, 0.20],
    ['NFT',         0.15, 0.22], ['BUYER',      0.75, 0.23],

    // === FEATURES (25–38%) ===
    ['AI',          0.10, 0.27], ['BLOCKCHAIN', 0.50, 0.28],
    ['INVOICE',     0.85, 0.29], ['GST',        0.35, 0.31],
    ['MARKETPLACE', 0.65, 0.33], ['INVESTOR',   0.20, 0.35],
    ['ESCROW',      0.80, 0.36], ['WALLET',     0.50, 0.37],

    // === TECHNOLOGY (38–52%) ===
    ['BLOCKCHAIN',  0.15, 0.40], ['BLOCKCHAIN', 0.45, 0.41],
    ['BLOCKCHAIN',  0.75, 0.42], ['NFT',        0.30, 0.44],
    ['NFT',         0.60, 0.45], ['AI',         0.88, 0.43],
    ['ESCROW',      0.10, 0.47], ['SETTLEMENT', 0.55, 0.48],
    ['WALLET',      0.80, 0.50],

    // === WORKFLOW (52–65%) ===
    ['MSME',        0.08, 0.54], ['INVOICE',    0.25, 0.55],
    ['AI',          0.42, 0.56], ['GST',        0.58, 0.57],
    ['BLOCKCHAIN',  0.72, 0.58], ['INVESTOR',   0.88, 0.59],
    ['ESCROW',      0.35, 0.62], ['BUYER',      0.55, 0.63],
    ['SETTLEMENT',  0.70, 0.64],

    // === MARKETPLACE (65–78%) ===
    ['INVESTOR',    0.12, 0.67], ['INVESTOR',   0.30, 0.68],
    ['MARKETPLACE', 0.50, 0.69], ['BUYER',      0.70, 0.70],
    ['BUYER',       0.88, 0.68], ['WALLET',     0.20, 0.73],
    ['ESCROW',      0.60, 0.74], ['NFT',        0.85, 0.72],

    // === FAQ (78–88%) ===
    ['AI',          0.25, 0.80], ['BLOCKCHAIN', 0.55, 0.81],
    ['WALLET',      0.80, 0.82], ['GST',        0.15, 0.84],
    ['SETTLEMENT',  0.70, 0.85],

    // === FOOTER (88–100%) ===
    ['BLOCKCHAIN',  0.30, 0.90], ['BLOCKCHAIN', 0.50, 0.91],
    ['BLOCKCHAIN',  0.70, 0.92], ['ESCROW',     0.20, 0.94],
    ['ESCROW',      0.80, 0.94], ['INVESTOR',   0.50, 0.96],
    ['MSME',        0.15, 0.97], ['BUYER',      0.85, 0.97],
  ];

  return layout
    .filter((_, i) => !isMobile || i % 2 === 0) // half nodes on mobile
    .map(([type, fx, fy], idx) => {
      const def = NODE_TYPES[type];
      return {
        id: idx,
        type,
        label: def.label,
        color: def.color,
        isAI: def.ai,
        isChain: def.chain,
        fx,
        fy,
        x: fx * W,
        y: fy * H,
        baseX: fx * W,
        baseY: fy * H,
        r: isMobile ? 3.5 : 5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.006,
        aiWaveRadius: 0,
        aiWaveActive: def.ai && Math.random() < 0.5,
        aiWaveSpeed: 0.6 + Math.random() * 0.4,
      };
    });
}

/* Build edges: connect nearby nodes (within threshold) */
function buildEdges(nodes, W, isMobile) {
  const edges = [];
  const threshold = (isMobile ? 0.22 : 0.18) * W;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].baseX - nodes[j].baseX;
      const dy = nodes[i].baseY - nodes[j].baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) {
        edges.push({ from: nodes[i], to: nodes[j], dist });
      }
    }
  }
  return edges;
}

/* Create a travelling packet on a random edge */
function spawnPacket(edges, isMobile) {
  if (!edges.length) return null;
  const edge = edges[Math.floor(Math.random() * edges.length)];
  const colors = ['#60a5fa','#a78bfa','#34d399','#f59e0b','#22d3ee','#f472b6'];
  return {
    edge,
    t: 0,
    speed: (isMobile ? 0.0015 : 0.001) + Math.random() * 0.0015,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: isMobile ? 1.5 : 2.5,
    done: false,
  };
}

/* Hex cell positions for blockchain layer */
function buildHexCells(W, H, isMobile) {
  const cells = [];
  const cols = isMobile ? 4 : 8;
  const rows = 14;
  const cw = W / cols;
  const ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.35) continue; // sparse
      const x = c * cw + (r % 2 === 0 ? 0 : cw / 2) + cw / 2;
      const y = r * ch + ch / 2;
      cells.push({ x, y, size: isMobile ? 12 : 18, phase: Math.random() * Math.PI * 2 });
    }
  }
  return cells;
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function FinancialNetworkEngine() {
  const canvasRef = useRef(null);
  const stateRef  = useRef({});
  const rafRef    = useRef(null);
  const mouse     = useRef({ x: 0.5, y: 0.5 });

  /* ── isDark helper ──────────────────────────────────────────────────────── */
  const isDark = () => document.documentElement.classList.contains('dark');

  /* ── Rebuild state when canvas is resized ─────────────────────────────── */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const isMobile = W < 640;
    const nodes    = buildNodeLayout(W, H, isMobile);
    const edges    = buildEdges(nodes, W, isMobile);
    const hexCells = buildHexCells(W, H, isMobile);

    // Pre-spawn packets
    const maxPackets = isMobile ? 12 : 30;
    const packets = Array.from({ length: maxPackets }, () => spawnPacket(edges, isMobile));

    // Gradient mesh offsets
    const meshPhase = { x: 0, y: 0 };

    stateRef.current = { nodes, edges, hexCells, packets, W, H, isMobile, meshPhase };
  }, []);

  /* ── Main render loop ─────────────────────────────────────────────────── */
  const draw = useCallback((ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;
    if (!s.nodes) return;

    const { W, H, isMobile } = s;
    const dark = isDark();

    /* Clear */
    ctx.clearRect(0, 0, W, H);

    /* ── LAYER 1: Gradient mesh ─────────────────────────────────────────── */
    s.meshPhase.x = (s.meshPhase.x + 0.0002) % (Math.PI * 2);
    s.meshPhase.y = (s.meshPhase.y + 0.00015) % (Math.PI * 2);
    const ox = Math.sin(s.meshPhase.x) * 80;
    const oy = Math.cos(s.meshPhase.y) * 60;

    const mg = ctx.createRadialGradient(
      W * 0.3 + ox, H * 0.25 + oy, 0,
      W * 0.5, H * 0.5, W * 0.85
    );
    if (dark) {
      mg.addColorStop(0,   'rgba(37,99,235,0.07)');
      mg.addColorStop(0.4, 'rgba(124,58,237,0.05)');
      mg.addColorStop(0.7, 'rgba(6,182,212,0.04)');
      mg.addColorStop(1,   'rgba(0,0,0,0)');
    } else {
      mg.addColorStop(0,   'rgba(219,234,254,0.55)');
      mg.addColorStop(0.4, 'rgba(237,233,254,0.35)');
      mg.addColorStop(0.7, 'rgba(207,250,254,0.25)');
      mg.addColorStop(1,   'rgba(255,255,255,0)');
    }
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, W, H);

    /* Secondary gradient bottom-right */
    const mg2 = ctx.createRadialGradient(
      W * 0.75 - ox * 0.5, H * 0.75 - oy * 0.5, 0,
      W * 0.7, H * 0.7, W * 0.6
    );
    if (dark) {
      mg2.addColorStop(0,   'rgba(16,185,129,0.05)');
      mg2.addColorStop(0.5, 'rgba(139,92,246,0.04)');
      mg2.addColorStop(1,   'rgba(0,0,0,0)');
    } else {
      mg2.addColorStop(0,   'rgba(187,247,208,0.40)');
      mg2.addColorStop(0.5, 'rgba(196,181,253,0.20)');
      mg2.addColorStop(1,   'rgba(255,255,255,0)');
    }
    ctx.fillStyle = mg2;
    ctx.fillRect(0, 0, W, H);

    /* ── LAYER 5: Blockchain hex cells ──────────────────────────────────── */
    s.hexCells.forEach(cell => {
      cell.phase += 0.008;
      const alpha = dark
        ? 0.04 + Math.sin(cell.phase) * 0.02
        : 0.06 + Math.sin(cell.phase) * 0.03;
      drawHex(ctx, cell.x, cell.y, cell.size, dark ? `rgba(16,185,129,${alpha})` : `rgba(6,182,212,${alpha})`);
    });

    /* ── Mouse parallax: shift nodes ─────────────────────────────────────── */
    const mx = (mouse.current.x - 0.5) * 30;
    const my = (mouse.current.y - 0.5) * 30;
    s.nodes.forEach(n => {
      n.x = n.baseX + mx * 0.18;
      n.y = n.baseY + my * 0.18;
      n.pulse = (n.pulse + n.pulseSpeed) % (Math.PI * 2);
    });

    /* ── LAYER 2: Edges ───────────────────────────────────────────────────── */
    s.edges.forEach(edge => {
      const { from, to } = edge;
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      if (dark) {
        grad.addColorStop(0,   hexWithAlpha(from.color, 0.20));
        grad.addColorStop(1,   hexWithAlpha(to.color,   0.20));
      } else {
        grad.addColorStop(0,   hexWithAlpha(from.color, 0.12));
        grad.addColorStop(1,   hexWithAlpha(to.color,   0.12));
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    });

    /* ── LAYER 3: Packets ─────────────────────────────────────────────────── */
    s.packets.forEach((pkt, i) => {
      if (!pkt) return;
      pkt.t += pkt.speed;
      if (pkt.t >= 1) {
        s.packets[i] = spawnPacket(s.edges, isMobile);
        return;
      }
      const { from, to } = pkt.edge;
      const px = from.x + (to.x - from.x) * pkt.t;
      const py = from.y + (to.y - from.y) * pkt.t;

      // Outer glow
      const gr = ctx.createRadialGradient(px, py, 0, px, py, pkt.size * 5);
      gr.addColorStop(0, pkt.color + (dark ? 'aa' : '66'));
      gr.addColorStop(1, pkt.color + '00');
      ctx.beginPath();
      ctx.arc(px, py, pkt.size * 5, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
      ctx.fillStyle = pkt.color + (dark ? 'ee' : 'bb');
      ctx.fill();
    });

    /* ── LAYER 4: AI pulse waves ──────────────────────────────────────────── */
    s.nodes.filter(n => n.isAI).forEach(n => {
      if (!n.aiWaveActive) {
        if (Math.random() < 0.002) {
          n.aiWaveActive = true;
          n.aiWaveRadius = 0;
        }
        return;
      }
      n.aiWaveRadius += n.aiWaveSpeed;
      const maxR  = 60;
      const alpha = dark
        ? (1 - n.aiWaveRadius / maxR) * 0.18
        : (1 - n.aiWaveRadius / maxR) * 0.12;
      if (alpha <= 0 || n.aiWaveRadius > maxR) {
        n.aiWaveActive = false;
        n.aiWaveRadius = 0;
        return;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.aiWaveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = n.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth   = 1;
      ctx.stroke();
    });

    /* ── LAYER 2: Nodes (on top of edges) ─────────────────────────────────── */
    s.nodes.forEach(n => {
      const pulseFactor = Math.sin(n.pulse);

      // Pulse ring
      const ringR     = n.r + 5 + pulseFactor * 3;
      const ringAlpha = dark ? 0.10 + pulseFactor * 0.05 : 0.07 + pulseFactor * 0.03;
      ctx.beginPath();
      ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = hexWithAlpha(n.color, ringAlpha);
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Node fill
      const grd = ctx.createRadialGradient(n.x - 1, n.y - 1, 0, n.x, n.y, n.r);
      grd.addColorStop(0, hexWithAlpha(n.color, dark ? 0.70 : 0.50));
      grd.addColorStop(1, hexWithAlpha(n.color, dark ? 0.35 : 0.20));
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Label
      ctx.font         = `500 ${isMobile ? 7 : 8}px Inter, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = dark ? 'rgba(203,213,225,0.45)' : 'rgba(51,65,85,0.45)';
      ctx.fillText(n.label, n.x, n.y + n.r + 3);
    });

    /* ── LAYER 8: Bottom fog vignette ─────────────────────────────────────── */
    // (Handled in CSS via gradient overlays on sections — no extra canvas layer needed)

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  /* ── Utility: draw hexagon outline ─────────────────────────────────────── */
  function drawHex(ctx, cx, cy, size, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx    = cx + size * Math.cos(angle);
      const hy    = cy + size * Math.sin(angle);
      i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.7;
    ctx.stroke();
  }

  /* ── Utility: hex color + alpha ─────────────────────────────────────────── */
  function hexWithAlpha(hex, alpha) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
    return hex + a;
  }

  /* ── Setup & teardown ────────────────────────────────────────────────────── */
  useEffect(() => {
    // Respect reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    rebuild();
    rafRef.current = requestAnimationFrame(draw);

    // Auto-resize
    const ro = new ResizeObserver(rebuild);
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);

    // Mouse parallax
    const onMouse = (e) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    // Pause on hidden tab
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // React to dark mode toggling
    const mo = new MutationObserver(rebuild);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [rebuild, draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, display: 'block' }}
    />
  );
}
