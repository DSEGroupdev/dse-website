/* DSE Group — self-building mesh.
   Phase 1 (~2s): a digitized mesh constructs itself left to right, edges drawing
   in with a gold trace behind a build-front. Symbolizes automated building.
   Phase 2: the finished mesh stays live: a soft gold pulse sweeps back and
   forth across it, and individual nodes glitter at random.
   Respects prefers-reduced-motion (renders the completed mesh as a static frame). */
(function () {
  const canvas = document.getElementById("neural");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BUILD_MS = 2000;      // front crosses the full width in 2s
  const EDGE_DRAW = 320;      // ms for one edge to draw in
  const WAVE_PERIOD = 9000;   // ms for one full back-and-forth pulse
  const CELL = 82;

  let w, h, dpr, nodes, edges, startTime = null, sparks = [];

  function build() {
    nodes = [];
    const cols = Math.ceil(w / CELL) + 2;
    const rows = Math.ceil(h / CELL) + 2;
    for (let c = -1; c < cols; c++) {
      for (let r = -1; r < rows; r++) {
        nodes.push({
          x: c * CELL + CELL * 0.5 + (Math.random() - 0.5) * CELL * 0.72,
          y: r * CELL + CELL * 0.5 + (Math.random() - 0.5) * CELL * 0.72,
        });
      }
    }
    const seen = new Set();
    edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const near = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CELL * CELL * 4) near.push([d2, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      const k = 2 + (i % 2);
      for (let n = 0; n < Math.min(k, near.length); n++) {
        const j = near[n][1];
        const key = i < j ? i + "-" + j : j + "-" + i;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ a: nodes[i], b: nodes[j], minX: Math.min(nodes[i].x, nodes[j].x) });
        }
      }
    }
    edges.sort((e1, e2) => e1.minX - e2.minX);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (reduced) drawBase();
  }

  function drawBase() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    for (const e of edges) {
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(226,180,92,0.28)";
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(now) {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const span = w + CELL * 2;
    const msPerPx = BUILD_MS / span;
    const built = elapsed > BUILD_MS + EDGE_DRAW;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;

    if (!built) {
      /* ---- Phase 1: construction ---- */
      const frontX = (elapsed / BUILD_MS) * span - CELL;
      for (const e of edges) {
        if (e.minX > frontX) break;
        const t = Math.min((elapsed - (e.minX + CELL) * msPerPx) / EDGE_DRAW, 1);
        if (t <= 0) continue;
        const ease = t * (2 - t);
        ctx.strokeStyle = t < 1 ? "rgba(226,180,92,0.4)" : "rgba(255,255,255,0.07)";
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.a.x + (e.b.x - e.a.x) * ease, e.a.y + (e.b.y - e.a.y) * ease);
        ctx.stroke();
      }
      for (const n of nodes) {
        const dist = frontX - n.x;
        if (dist < 0) continue;
        const nearFront = Math.max(0, 1 - dist / (CELL * 2.2));
        ctx.fillStyle = "rgba(226,180,92," + (0.22 + nearFront * 0.5).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 + nearFront * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      if (frontX < w) {
        const g = ctx.createLinearGradient(frontX - 70, 0, frontX, 0);
        g.addColorStop(0, "rgba(226,180,92,0)");
        g.addColorStop(1, "rgba(226,180,92,0.05)");
        ctx.fillStyle = g;
        ctx.fillRect(frontX - 70, 0, 70, h);
      }
    } else {
      /* ---- Phase 2: living mesh ---- */
      const t2 = elapsed - (BUILD_MS + EDGE_DRAW);
      // pulse sweeps back and forth (cosine so it starts from the right, where the build ended)
      const waveX = (0.5 - 0.5 * Math.cos((t2 / WAVE_PERIOD) * Math.PI * 2 + Math.PI)) * w;
      const REACH = CELL * 2.4;

      for (const e of edges) {
        const mid = (e.a.x + e.b.x) / 2;
        const p = Math.max(0, 1 - Math.abs(mid - waveX) / REACH);
        if (p > 0.05) {
          ctx.strokeStyle = "rgba(226,180,92," + (0.07 + p * 0.12).toFixed(3) + ")";
        } else {
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
        }
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      }
      for (const n of nodes) {
        const p = Math.max(0, 1 - Math.abs(n.x - waveX) / REACH);
        ctx.fillStyle = "rgba(226,180,92," + (0.24 + p * 0.4).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 + p * 0.9, 0, Math.PI * 2); ctx.fill();
      }

      // glitter: random nodes flare briefly
      if (Math.random() < 0.12 && sparks.length < 7) {
        sparks.push({ n: nodes[(Math.random() * nodes.length) | 0], born: elapsed, life: 500 + Math.random() * 500 });
      }
      sparks = sparks.filter((s) => elapsed - s.born < s.life);
      for (const s of sparks) {
        const p = 1 - (elapsed - s.born) / s.life;
        const a = Math.sin(p * Math.PI); // fade in, fade out
        const g = ctx.createRadialGradient(s.n.x, s.n.y, 0, s.n.x, s.n.y, 8);
        g.addColorStop(0, "rgba(226,180,92," + (a * 0.75).toFixed(3) + ")");
        g.addColorStop(1, "rgba(226,180,92,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.n.x, s.n.y, 8, 0, Math.PI * 2); ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  if (!reduced) requestAnimationFrame(frame);
})();
