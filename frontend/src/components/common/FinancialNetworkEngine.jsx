/**
 * FinancialNetworkEngine.jsx  — Storytelling Background Engine
 *
 * Single canvas spanning the entire landing page.
 * Reads section visibility via IntersectionObserver and smoothly
 * interpolates every visual parameter between section "moods" at 60fps.
 *
 * Architecture
 * ─────────────
 * • One requestAnimationFrame loop — never restarts
 * • IntersectionObserver watches each section element
 * • A "targetState" object is updated on section change
 * • A "liveState" lerps toward targetState each frame (smooth morph)
 * • Canvas draws using liveState values
 *
 * Performance
 * ────────────
 * • Single <canvas>, position:fixed, pointer-events:none
 * • ResizeObserver for correct DPR scaling
 * • Tab visibility: cancelAnimationFrame when hidden
 * • prefers-reduced-motion: skips entirely
 * • Mobile: half node count, half packet count
 */

import React, { useRef, useEffect, useCallback } from 'react';

/* ─── Section mood definitions ──────────────────────────────────────────────
   Each mood drives the live state the engine lerps toward.
   ────────────────────────────────────────────────────────────────────────── */
const SECTION_MOODS = {
  hero: {
    edgeAlpha:        0.18,
    packetSpeed:      1.0,
    packetCount:      22,
    aiIntensity:      0.3,
    chainIntensity:   0.2,
    hexAlpha:         0.04,
    meshColor1:       [37,  99,  235],   // blue
    meshColor2:       [6,   182, 212],   // teal
    glowRadius:       6,
    capitalGlow:      0.8,
    networkCalm:      0.0,
  },
  workflow: {
    edgeAlpha:        0.28,
    packetSpeed:      1.6,
    packetCount:      34,
    aiIntensity:      0.6,
    chainIntensity:   0.4,
    hexAlpha:         0.05,
    meshColor1:       [37,  99,  235],
    meshColor2:       [124, 58,  237],   // purple
    glowRadius:       7,
    capitalGlow:      1.2,
    networkCalm:      0.0,
  },
  features: {
    edgeAlpha:        0.22,
    packetSpeed:      1.4,
    packetCount:      28,
    aiIntensity:      1.0,
    chainIntensity:   0.3,
    hexAlpha:         0.04,
    meshColor1:       [124, 58,  237],
    meshColor2:       [168, 85,  247],   // violet
    glowRadius:       8,
    capitalGlow:      0.9,
    networkCalm:      0.0,
  },
  technology: {
    edgeAlpha:        0.25,
    packetSpeed:      1.2,
    packetCount:      26,
    aiIntensity:      0.5,
    chainIntensity:   1.0,
    hexAlpha:         0.10,
    meshColor1:       [124, 58,  237],
    meshColor2:       [6,   182, 212],   // cyan
    glowRadius:       9,
    capitalGlow:      0.7,
    networkCalm:      0.0,
  },
  marketplace: {
    edgeAlpha:        0.30,
    packetSpeed:      2.0,
    packetCount:      40,
    aiIntensity:      0.4,
    chainIntensity:   0.5,
    hexAlpha:         0.05,
    meshColor1:       [245, 158, 11],    // gold
    meshColor2:       [37,  99,  235],
    glowRadius:       7,
    capitalGlow:      1.8,
    networkCalm:      0.0,
  },
  security: {
    edgeAlpha:        0.20,
    packetSpeed:      0.9,
    packetCount:      18,
    aiIntensity:      0.3,
    chainIntensity:   0.7,
    hexAlpha:         0.06,
    meshColor1:       [16,  185, 129],   // emerald
    meshColor2:       [37,  99,  235],
    glowRadius:       10,
    capitalGlow:      0.6,
    networkCalm:      0.2,
  },
  faq: {
    edgeAlpha:        0.10,
    packetSpeed:      0.5,
    packetCount:      10,
    aiIntensity:      0.1,
    chainIntensity:   0.2,
    hexAlpha:         0.02,
    meshColor1:       [100, 116, 139],   // slate
    meshColor2:       [71,  85,  105],
    glowRadius:       5,
    capitalGlow:      0.3,
    networkCalm:      1.0,
  },
  footer: {
    edgeAlpha:        0.35,
    packetSpeed:      1.5,
    packetCount:      50,
    aiIntensity:      0.8,
    chainIntensity:   1.0,
    hexAlpha:         0.08,
    meshColor1:       [37,  99,  235],
    meshColor2:       [16,  185, 129],
    glowRadius:       12,
    capitalGlow:      2.0,
    networkCalm:      0.0,
  },
};

/* Maps section element ids to mood keys */
const SECTION_ID_TO_MOOD = {
  hero:           'hero',
  stats:          'workflow',
  problem:        'workflow',
  solution:       'workflow',
  features:       'features',
  technology:     'technology',
  demo:           'marketplace',
  testimonials:   'security',
  faq:            'faq',
  cta:            'footer',
  footer:         'footer',
  // extras
  'how-it-works': 'workflow',
  marketplace:    'marketplace',
  security:       'security',
};

/* ─── Node layout (distributed across full page height as fractions) ──────── */
const NODE_LAYOUT = [
  // HERO
  { type:'MSME',       fx:0.12, fy:0.04 }, { type:'INVOICE',   fx:0.50, fy:0.05 },
  { type:'AI',         fx:0.82, fy:0.04 }, { type:'GST',       fx:0.30, fy:0.07 },
  { type:'BLOCKCHAIN', fx:0.70, fy:0.08 }, { type:'INVESTOR',  fx:0.90, fy:0.06 },
  // WORKFLOW
  { type:'WALLET',     fx:0.20, fy:0.14 }, { type:'ESCROW',    fx:0.60, fy:0.15 },
  { type:'MSME',       fx:0.80, fy:0.17 }, { type:'AI',        fx:0.40, fy:0.19 },
  { type:'NFT',        fx:0.15, fy:0.21 }, { type:'BUYER',     fx:0.75, fy:0.22 },
  // FEATURES
  { type:'AI',         fx:0.10, fy:0.27 }, { type:'BLOCKCHAIN',fx:0.50, fy:0.28 },
  { type:'INVOICE',    fx:0.85, fy:0.29 }, { type:'GST',       fx:0.35, fy:0.31 },
  { type:'MARKETPLACE',fx:0.65, fy:0.33 }, { type:'INVESTOR',  fx:0.20, fy:0.35 },
  { type:'ESCROW',     fx:0.80, fy:0.36 }, { type:'WALLET',    fx:0.50, fy:0.37 },
  // TECHNOLOGY
  { type:'BLOCKCHAIN', fx:0.15, fy:0.40 }, { type:'BLOCKCHAIN',fx:0.45, fy:0.41 },
  { type:'BLOCKCHAIN', fx:0.75, fy:0.42 }, { type:'NFT',       fx:0.30, fy:0.44 },
  { type:'NFT',        fx:0.60, fy:0.45 }, { type:'AI',        fx:0.88, fy:0.43 },
  { type:'ESCROW',     fx:0.10, fy:0.47 }, { type:'SETTLEMENT',fx:0.55, fy:0.48 },
  { type:'WALLET',     fx:0.80, fy:0.50 },
  // MARKETPLACE
  { type:'INVESTOR',   fx:0.08, fy:0.54 }, { type:'INVOICE',   fx:0.25, fy:0.55 },
  { type:'AI',         fx:0.42, fy:0.56 }, { type:'GST',       fx:0.58, fy:0.57 },
  { type:'BLOCKCHAIN', fx:0.72, fy:0.58 }, { type:'INVESTOR',  fx:0.88, fy:0.59 },
  { type:'ESCROW',     fx:0.35, fy:0.62 }, { type:'BUYER',     fx:0.55, fy:0.63 },
  { type:'SETTLEMENT', fx:0.70, fy:0.64 },
  // SECURITY / FAQ
  { type:'INVESTOR',   fx:0.12, fy:0.67 }, { type:'INVESTOR',  fx:0.30, fy:0.68 },
  { type:'MARKETPLACE',fx:0.50, fy:0.69 }, { type:'BUYER',     fx:0.70, fy:0.70 },
  { type:'BUYER',      fx:0.88, fy:0.68 }, { type:'WALLET',    fx:0.20, fy:0.73 },
  { type:'ESCROW',     fx:0.60, fy:0.74 }, { type:'NFT',       fx:0.85, fy:0.72 },
  { type:'AI',         fx:0.25, fy:0.80 }, { type:'BLOCKCHAIN',fx:0.55, fy:0.81 },
  { type:'WALLET',     fx:0.80, fy:0.82 }, { type:'GST',       fx:0.15, fy:0.84 },
  { type:'SETTLEMENT', fx:0.70, fy:0.85 },
  // FOOTER
  { type:'BLOCKCHAIN', fx:0.30, fy:0.90 }, { type:'BLOCKCHAIN',fx:0.50, fy:0.91 },
  { type:'BLOCKCHAIN', fx:0.70, fy:0.92 }, { type:'ESCROW',    fx:0.20, fy:0.94 },
  { type:'ESCROW',     fx:0.80, fy:0.94 }, { type:'INVESTOR',  fx:0.50, fy:0.96 },
  { type:'MSME',       fx:0.15, fy:0.97 }, { type:'BUYER',     fx:0.85, fy:0.97 },
];

const NODE_META = {
  MSME:        { color:'#3b82f6', isAI:false, isChain:false, label:'MSME'   },
  INVOICE:     { color:'#6366f1', isAI:false, isChain:false, label:'Invoice'},
  AI:          { color:'#a855f7', isAI:true,  isChain:false, label:'AI'     },
  GST:         { color:'#06b6d4', isAI:false, isChain:false, label:'GST'    },
  BLOCKCHAIN:  { color:'#10b981', isAI:false, isChain:true,  label:'Chain'  },
  NFT:         { color:'#f59e0b', isAI:false, isChain:true,  label:'NFT'    },
  MARKETPLACE: { color:'#ec4899', isAI:false, isChain:false, label:'Market' },
  INVESTOR:    { color:'#34d399', isAI:false, isChain:false, label:'Invest' },
  ESCROW:      { color:'#8b5cf6', isAI:false, isChain:true,  label:'Escrow' },
  BUYER:       { color:'#14b8a6', isAI:false, isChain:false, label:'Buyer'  },
  SETTLEMENT:  { color:'#f97316', isAI:false, isChain:false, label:'Settle' },
  WALLET:      { color:'#22d3ee', isAI:false, isChain:false, label:'Wallet' },
};

/* ─── Utility: linear interpolation ─────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}
function rgbA(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }
function hexA(hex, a) {
  const n = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return hex + n.toString(16).padStart(2, '0');
}

/* ─── Build node objects ─────────────────────────────────────────────────── */
function makeNodes(W, H, isMobile) {
  return NODE_LAYOUT
    .filter((_, i) => !isMobile || i % 2 === 0)
    .map((def, idx) => {
      const m = NODE_META[def.type];
      return {
        id: idx, type: def.type, color: m.color,
        isAI: m.isAI, isChain: m.isChain, label: m.label,
        fx: def.fx, fy: def.fy,
        baseX: def.fx * W, baseY: def.fy * H,
        x: def.fx * W,     y:     def.fy * H,
        r: isMobile ? 3.5 : 5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.007 + Math.random() * 0.006,
        // AI wave
        aiWave: { r: 0, active: false, speed: 0.7 + Math.random() * 0.4 },
        // Capital glow brightness multiplier (lerped by mood)
        brightness: 1,
      };
    });
}

/* ─── Build edges (proximity) ────────────────────────────────────────────── */
function makeEdges(nodes, W, isMobile) {
  const threshold = (isMobile ? 0.25 : 0.20) * W;
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].baseX - nodes[j].baseX;
      const dy = nodes[i].baseY - nodes[j].baseY;
      if (Math.hypot(dx, dy) < threshold) edges.push({ from: nodes[i], to: nodes[j] });
    }
  }
  return edges;
}

/* ─── Packet factory ─────────────────────────────────────────────────────── */
const PKT_COLORS = ['#60a5fa','#a78bfa','#34d399','#f59e0b','#22d3ee','#f472b6','#fb923c'];
function makePacket(edges, isMobile, speedMult = 1) {
  if (!edges.length) return null;
  const edge = edges[Math.floor(Math.random() * edges.length)];
  return {
    edge, t: Math.random(),
    speed: ((isMobile ? 0.0012 : 0.0009) + Math.random() * 0.0012) * speedMult,
    color: PKT_COLORS[Math.floor(Math.random() * PKT_COLORS.length)],
    size: isMobile ? 1.5 : 2.5,
  };
}

/* ─── Hex cells for blockchain layer ────────────────────────────────────── */
function makeHexCells(W, H, isMobile) {
  const cols = isMobile ? 5 : 10, rows = 16;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.30) continue;
      cells.push({
        x: (c / cols + (r % 2 ? 0.5 / cols : 0)) * W,
        y: (r / rows) * H,
        size: isMobile ? 11 : 17,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return cells;
}

/* ─── Draw regular hexagon ───────────────────────────────────────────────── */
function drawHex(ctx, cx, cy, size, strokeStyle) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(cx + size * Math.cos(a), cy + size * Math.sin(a))
            : ctx.lineTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function FinancialNetworkEngine() {
  const canvasRef = useRef(null);
  const S         = useRef({});   // mutable simulation state
  const raf       = useRef(null);
  const mouse     = useRef({ x: 0.5, y: 0.5 });
  const mood      = useRef({ ...SECTION_MOODS.hero });   // live interpolated mood
  const targetMood= useRef({ ...SECTION_MOODS.hero });   // target mood

  const isDark = () => document.documentElement.classList.contains('dark');

  /* ── Rebuild simulation on resize ──────────────────────────────────────── */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const isMobile = W < 640;
    const nodes    = makeNodes(W, H, isMobile);
    const edges    = makeEdges(nodes, W, isMobile);
    const hexCells = makeHexCells(W, H, isMobile);

    const maxPkt = isMobile ? 14 : 32;
    const packets = Array.from({ length: maxPkt }, () => makePacket(edges, isMobile));

    S.current = {
      nodes, edges, hexCells, packets,
      W, H, isMobile,
      meshPhase: { x: 0, y: 0 },
      centralHub: {
        x: W * 0.5,
        y: H * 0.93,
        r: 0,
        maxR: Math.min(W, H) * 0.12,
        phase: 0,
      },
    };
  }, []);

  /* ── Lerp live mood toward target each frame ────────────────────────────── */
  const lerpMood = useCallback(() => {
    const t = 0.012;  // ~600ms at 60fps for a smooth transition
    const live   = mood.current;
    const target = targetMood.current;
    for (const key of Object.keys(target)) {
      if (key === 'meshColor1' || key === 'meshColor2') {
        live[key] = lerpColor(live[key], target[key], t);
      } else {
        live[key] = lerp(live[key], target[key], t);
      }
    }
  }, []);

  /* ── Main draw ──────────────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = S.current;
    if (!s.nodes) return;

    const { W, H, isMobile } = s;
    const dark = isDark();
    const m    = mood.current;

    ctx.clearRect(0, 0, W, H);

    /* ── Lerp mood toward target ──────────────────────────────────────────── */
    lerpMood();

    /* ── Mesh phase drift ─────────────────────────────────────────────────── */
    s.meshPhase.x += 0.00018;
    s.meshPhase.y += 0.00013;
    const ox = Math.sin(s.meshPhase.x) * 90;
    const oy = Math.cos(s.meshPhase.y) * 70;

    /* ── LAYER 1: gradient mesh ───────────────────────────────────────────── */
    const c1 = m.meshColor1;
    const c2 = m.meshColor2;
    const mg = ctx.createRadialGradient(W * 0.28 + ox, H * 0.22 + oy, 0, W * 0.5, H * 0.5, W * 0.9);
    if (dark) {
      mg.addColorStop(0,   rgbA(c1, 0.08));
      mg.addColorStop(0.5, rgbA(c2, 0.05));
      mg.addColorStop(1,   'rgba(0,0,0,0)');
    } else {
      mg.addColorStop(0,   rgbA(c1, 0.14));
      mg.addColorStop(0.5, rgbA(c2, 0.09));
      mg.addColorStop(1,   'rgba(255,255,255,0)');
    }
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);

    const mg2 = ctx.createRadialGradient(W * 0.72 - ox * 0.5, H * 0.7 - oy * 0.5, 0, W * 0.7, H * 0.7, W * 0.65);
    if (dark) {
      mg2.addColorStop(0, rgbA(c2, 0.06));
      mg2.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      mg2.addColorStop(0, rgbA(c2, 0.12));
      mg2.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = mg2; ctx.fillRect(0, 0, W, H);

    /* ── LAYER 5: blockchain hex cells (driven by chainIntensity) ─────────── */
    s.hexCells.forEach(cell => {
      cell.phase += 0.006 + m.chainIntensity * 0.006;
      const a = (m.hexAlpha + Math.sin(cell.phase) * 0.018) * m.chainIntensity;
      if (a <= 0.002) return;
      drawHex(ctx, cell.x, cell.y, cell.size,
        dark ? `rgba(16,185,129,${a})` : `rgba(6,182,212,${a})`);
    });

    /* ── Mouse parallax ───────────────────────────────────────────────────── */
    const mx = (mouse.current.x - 0.5) * 30;
    const my = (mouse.current.y - 0.5) * 30;
    s.nodes.forEach(n => {
      n.x = n.baseX + mx * 0.18;
      n.y = n.baseY + my * 0.18;
      n.pulse = (n.pulse + n.pulseSpeed * (1 - m.networkCalm * 0.7)) % (Math.PI * 2);
    });

    /* ── LAYER 2: edges ───────────────────────────────────────────────────── */
    const ea = m.edgeAlpha;
    s.edges.forEach(({ from, to }) => {
      const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      g.addColorStop(0, hexA(from.color, dark ? ea : ea * 0.7));
      g.addColorStop(1, hexA(to.color,   dark ? ea : ea * 0.7));
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = g;
      ctx.lineWidth   = 0.85;
      ctx.stroke();
    });

    /* ── LAYER 3: packets ─────────────────────────────────────────────────── */
    s.packets.forEach((pkt, i) => {
      if (!pkt) return;
      // Adjust speed toward live mood
      pkt.speed = lerp(pkt.speed, ((isMobile ? 0.0012 : 0.0009) + 0.0006) * m.packetSpeed, 0.02);
      pkt.t += pkt.speed;
      if (pkt.t >= 1) { s.packets[i] = makePacket(s.edges, isMobile, m.packetSpeed); return; }

      const { from, to } = pkt.edge;
      const px = from.x + (to.x - from.x) * pkt.t;
      const py = from.y + (to.y - from.y) * pkt.t;

      const glowSize = pkt.size * 4.5 * m.capitalGlow;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
      gr.addColorStop(0, pkt.color + (dark ? 'aa' : '66'));
      gr.addColorStop(1, pkt.color + '00');
      ctx.beginPath(); ctx.arc(px, py, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();

      ctx.beginPath(); ctx.arc(px, py, pkt.size * m.capitalGlow * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = pkt.color + (dark ? 'ee' : 'aa'); ctx.fill();
    });

    /* ── LAYER 4: AI pulse waves ───────────────────────────────────────────── */
    s.nodes.filter(n => n.isAI).forEach(n => {
      const w = n.aiWave;
      if (!w.active) {
        // Fire more often when aiIntensity is high
        if (Math.random() < 0.001 + m.aiIntensity * 0.004) {
          w.active = true; w.r = 0;
        }
        return;
      }
      w.r += w.speed * (0.5 + m.aiIntensity * 0.8);
      const maxR = 55 + m.aiIntensity * 20;
      const a    = dark
        ? (1 - w.r / maxR) * 0.22 * m.aiIntensity
        : (1 - w.r / maxR) * 0.15 * m.aiIntensity;
      if (a <= 0 || w.r > maxR) { w.active = false; return; }
      ctx.beginPath();
      ctx.arc(n.x, n.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = n.color + Math.round(a * 255).toString(16).padStart(2, '0');
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    });

    /* ── Footer central hub ────────────────────────────────────────────────── */
    const hub = s.centralHub;
    hub.phase += 0.008;
    const hubAlpha = Math.max(0, (m.capitalGlow - 1.5) * 0.8);
    if (hubAlpha > 0.01) {
      const pulse = Math.sin(hub.phase);
      const hr    = hub.maxR + pulse * 8;
      const hg    = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, hr);
      hg.addColorStop(0, rgbA(c1, hubAlpha * 0.25));
      hg.addColorStop(0.5, rgbA(c2, hubAlpha * 0.12));
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, hr, 0, Math.PI * 2); ctx.fill();

      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hr + 10 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = rgbA(c1, hubAlpha * 0.15);
      ctx.lineWidth   = 1; ctx.stroke();
    }

    /* ── LAYER 2b: nodes (drawn above edges) ───────────────────────────────── */
    const nodeR = m.glowRadius;
    s.nodes.forEach(n => {
      const p     = Math.sin(n.pulse);
      const calm  = 1 - m.networkCalm * 0.6;
      const ringR = n.r + nodeR * 0.5 + p * 2 * calm;
      const ringA = dark
        ? (0.08 + p * 0.04) * calm
        : (0.06 + p * 0.03) * calm;

      ctx.beginPath(); ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(n.color, ringA);
      ctx.lineWidth   = 1; ctx.stroke();

      const grd = ctx.createRadialGradient(n.x - 1, n.y - 1, 0, n.x, n.y, n.r);
      grd.addColorStop(0, hexA(n.color, dark ? 0.72 : 0.50));
      grd.addColorStop(1, hexA(n.color, dark ? 0.30 : 0.18));
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      ctx.font         = `500 ${isMobile ? 7 : 8}px Inter,sans-serif`;
      ctx.textAlign    = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle    = dark ? 'rgba(203,213,225,0.40)' : 'rgba(51,65,85,0.40)';
      ctx.fillText(n.label, n.x, n.y + n.r + 3);
    });

    raf.current = requestAnimationFrame(draw);
  }, [lerpMood]);

  /* ── Lifecycle ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    rebuild();
    raf.current = requestAnimationFrame(draw);

    /* ResizeObserver */
    const ro = new ResizeObserver(rebuild);
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);

    /* Mouse parallax */
    const onMouse = (e) => { mouse.current = { x: e.clientX / innerWidth, y: e.clientY / innerHeight }; };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* Pause on hidden tab */
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf.current);
      else raf.current = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVis);

    /* Dark mode observer */
    const mo = new MutationObserver(rebuild);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    /* ── IntersectionObserver: detect which section is most visible ────────── */
    const sectionMap = new Map(); // id → intersectionRatio

    const applyMostVisibleMood = () => {
      let bestId = 'hero', bestRatio = 0;
      sectionMap.forEach((ratio, id) => { if (ratio > bestRatio) { bestRatio = ratio; bestId = id; } });
      const moodKey = SECTION_ID_TO_MOOD[bestId] || 'hero';
      targetMood.current = { ...SECTION_MOODS[moodKey] };
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          const id = e.target.id;
          if (SECTION_ID_TO_MOOD[id] !== undefined) {
            sectionMap.set(id, e.intersectionRatio);
          }
        });
        applyMostVisibleMood();
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
    );

    // Observe all sections listed in the map
    Object.keys(SECTION_ID_TO_MOOD).forEach(id => {
      const el = document.getElementById(id);
      if (el) { io.observe(el); sectionMap.set(id, 0); }
    });

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [rebuild, draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
