/* DSE Group — self-building mesh.
   A structured, digitized mesh constructs itself from left to right while the
   visitor watches: nodes materialize, edges draw in, and a gold build-front
   sweeps across the canvas. Symbolizes automated building.
   Respects prefers-reduced-motion (renders the completed mesh as a static frame). */
(function () {
  const canvas = document.getElementById("neural");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BUILD_SECONDS = 45;   // time for the front to cross the full width
  const EDGE_DRAW = 900;      // ms for a single edge to draw in
  const CELL = 82;            // mesh density (px between grid cells)

  let w, h, dpr, nodes, edges, startTime;

  function build() {
    // Jittered grid = structured "digitized" mesh rather than random scatter
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
    // Connect each node to its 2-3 nearest neighbors, dedupe edges
    const seen = new Set();
    edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CELL * CELL * 4) dists.push([d2, j]);
      }
      dists.sort((a, b) => a[0] - b[0]);
      const k = 2 + (i % 2); // alternate 2/3 links for organic-but-orderly texture
      for (let n = 0; n < Math.min(k, dists.length); n++) {
        const j = dists[n][1];
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
    if (reduced) drawStatic();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    for (const e of edges) {
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(226,180,92,0.30)";
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(now) {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    // Front position: sweeps left -> right over BUILD_SECONDS, then holds
    const frontX = Math.min((elapsed / (BUILD_SECONDS * 1000)) * (w + CELL * 2), w + CELL * 2) - CELL;
    const msPerPx = (BUILD_SECONDS * 1000) / (w + CELL * 2);

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;

    for (const e of edges) {
      if (e.minX > frontX) break; // edges are sorted; nothing further has started
      const born = (e.minX + CELL) * msPerPx;
      const t = Math.min((elapsed - born) / EDGE_DRAW, 1);
      if (t <= 0) continue;
      const ease = t * (2 - t); // easeOutQuad
      const x2 = e.a.x + (e.b.x - e.a.x) * ease;
      const y2 = e.a.y + (e.b.y - e.a.y) * ease;
      if (t < 1) {
        // actively drawing: faint gold trace
        ctx.strokeStyle = "rgba(226,180,92,0.35)";
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
      }
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Nodes: appear once the front passes; near the front they glow gold, then settle
    for (const n of nodes) {
      const dist = frontX - n.x;
      if (dist < 0) continue;
      const nearFront = Math.max(0, 1 - dist / (CELL * 2.2));
      const alpha = 0.22 + nearFront * 0.5;
      const r = 1.3 + nearFront * 1.2;
      ctx.fillStyle = "rgba(226,180,92," + alpha.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      if (nearFront > 0.55) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 9);
        g.addColorStop(0, "rgba(226,180,92," + (nearFront * 0.28).toFixed(3) + ")");
        g.addColorStop(1, "rgba(226,180,92,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Vertical build-front scanline: a barely-there gold sheen marking progress
    if (frontX < w) {
      const grad = ctx.createLinearGradient(frontX - 70, 0, frontX, 0);
      grad.addColorStop(0, "rgba(226,180,92,0)");
      grad.addColorStop(1, "rgba(226,180,92,0.045)");
      ctx.fillStyle = grad;
      ctx.fillRect(frontX - 70, 0, 70, h);
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  if (!reduced) requestAnimationFrame(frame);
})();
