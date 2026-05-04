/*  ═══════════════════════════════════════════════════════════════════════
    ICU Ventilator Allocation System — app.js
    Full graph engine: graph data, BFS/DFS algorithms, canvas rendering,
    live animations, triage dashboard, cascade display, surge timeline.
    ═══════════════════════════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════════════
const TYPE = { PATIENT:'patient', VENTILATOR:'ventilator', ZONE:'zone', STAFF:'staff' };
const STATUS = { STABLE:'stable', RISK:'risk', CRITICAL:'critical', FREE:'free', IN_USE:'in_use', OFFLINE:'offline' };

const COLOR = {
  stable:   '#00e676',
  risk:     '#ffea00',
  critical: '#ff1744',
  free:     '#78909c',
  in_use:   '#2979ff',
  offline:  '#37474f',
  bfs:      '#00e5ff',
  dfs:      '#e040fb',
  zone:     'rgba(41,121,255,0.12)',
  staff:    '#ffea00',
  edge:     'rgba(56,120,200,0.25)',
  edgeHL:   'rgba(0,229,255,0.7)',
};

const NODE_RADIUS = { patient:22, ventilator:18, zone:0, staff:16 };

const CASCADE_DATA = [
  { time:0,  organ:'Lungs',   label:'Ventilator removed — lungs fail',       stability: 0.20 },
  { time:2,  organ:'Oxygen',  label:'Blood oxygen drops critically',          stability: 0.35 },
  { time:8,  organ:'Kidneys', label:'Kidneys under severe stress',            stability: 0.45 },
  { time:20, organ:'Heart',   label:'Heart strain / arrhythmia risk',         stability: 0.55 },
  { time:45, organ:'Brain',   label:'Brain damage — irreversible threshold',  stability: 0.75 },
];

// ══════════════════════════════════════════════════════════════════════════
//  INITIAL GRAPH DATA
// ══════════════════════════════════════════════════════════════════════════
function buildInitialGraph() {
  const nodes = [
    // Zones (drawn as labelled rectangles, no circle)
    { id:0,  name:'ICU Ward A',      type:TYPE.ZONE,       status:STATUS.RISK,     cx:320, cy:260, floor:2, wing:'A', capacity:8, patients:6, availVents:1 },
    { id:1,  name:'ICU Ward B',      type:TYPE.ZONE,       status:STATUS.STABLE,   cx:320, cy:420, floor:2, wing:'B', capacity:8, patients:4, availVents:2 },
    { id:2,  name:'Step-Down Unit',  type:TYPE.ZONE,       status:STATUS.STABLE,   cx:590, cy:260, floor:3, wing:'C', capacity:10, patients:3, availVents:2 },
    { id:3,  name:'Emergency Room',  type:TYPE.ZONE,       status:STATUS.CRITICAL, cx:800, cy:260, floor:1, wing:'ER', capacity:6, patients:5, availVents:0 },

    // Ventilators
    { id:4,  name:'Vent-01', type:TYPE.VENTILATOR, status:STATUS.IN_USE,  cx:200, cy:200, floor:2, wing:'A', patientId:7 },
    { id:5,  name:'Vent-02', type:TYPE.VENTILATOR, status:STATUS.FREE,    cx:260, cy:190, floor:2, wing:'A', patientId:-1 },
    { id:6,  name:'Vent-03', type:TYPE.VENTILATOR, status:STATUS.FREE,    cx:380, cy:190, floor:2, wing:'A', patientId:-1 },
    { id:7,  name:'Vent-04', type:TYPE.VENTILATOR, status:STATUS.IN_USE,  cx:260, cy:390, floor:2, wing:'B', patientId:8 },
    { id:8,  name:'Vent-05', type:TYPE.VENTILATOR, status:STATUS.FREE,    cx:590, cy:210, floor:3, wing:'C', patientId:-1 },

    // Patients
    { id:9,  name:'Alice Chen',   type:TYPE.PATIENT, status:STATUS.CRITICAL, cx:190, cy:280, oxygenLevel:72,  lungStability:0.25, heartStability:0.40, kidneyStability:0.60, brainStability:0.80, ventId:4, timeOnVent:480, priorityScore:0, weaningCandidate:false },
    { id:10, name:'Bob Martinez', type:TYPE.PATIENT, status:STATUS.RISK,     cx:310, cy:300, oxygenLevel:88,  lungStability:0.55, heartStability:0.65, kidneyStability:0.70, brainStability:0.85, ventId:7, timeOnVent:120, priorityScore:0, weaningCandidate:false },
    { id:11, name:'Carol Singh',  type:TYPE.PATIENT, status:STATUS.STABLE,   cx:430, cy:280, oxygenLevel:96,  lungStability:0.85, heartStability:0.88, kidneyStability:0.90, brainStability:0.95, ventId:-1, timeOnVent:60, priorityScore:0, weaningCandidate:false },
    { id:12, name:'David Wu',     type:TYPE.PATIENT, status:STATUS.CRITICAL, cx:800, cy:310, oxygenLevel:68,  lungStability:0.20, heartStability:0.35, kidneyStability:0.50, brainStability:0.75, ventId:-1, timeOnVent:0,  priorityScore:0, weaningCandidate:false },
    { id:13, name:'Eva Patel',    type:TYPE.PATIENT, status:STATUS.RISK,     cx:310, cy:450, oxygenLevel:91,  lungStability:0.70, heartStability:0.72, kidneyStability:0.68, brainStability:0.88, ventId:-1, timeOnVent:30, priorityScore:0, weaningCandidate:false },

    // Staff
    { id:14, name:'Nurse Rita', type:TYPE.STAFF, status:STATUS.STABLE, cx:230, cy:350, role:'Nurse', available:true, zoneId:0 },
    { id:15, name:'RT James',   type:TYPE.STAFF, status:STATUS.STABLE, cx:540, cy:290, role:'Resp. Therapist', available:true, zoneId:2 },
  ];

  const edges = [
    // Zone—Zone (physical adjacency)
    { u:0, v:1, w:5.0  },
    { u:0, v:2, w:10.0 },
    { u:2, v:3, w:8.0  },
    { u:1, v:3, w:12.0 },
    // Vent—Zone and Vent—Patient
    { u:4, v:9,  w:0.5 },
    { u:4, v:0,  w:1.0 },
    { u:5, v:0,  w:1.0 },
    { u:6, v:0,  w:1.5 },
    { u:7, v:10, w:0.5 },
    { u:7, v:1,  w:1.0 },
    { u:8, v:2,  w:1.0 },
    // Patient—Zone
    { u:9,  v:0, w:1.0 },
    { u:10, v:0, w:1.5 },
    { u:11, v:2, w:1.0 },
    { u:12, v:3, w:1.0 },
    { u:13, v:1, w:1.0 },
    // Patient—Patient (proximity / shared sedation protocol)
    { u:9,  v:10, w:2.0 },
    { u:10, v:11, w:3.0 },
    { u:12, v:13, w:4.0 },
    // Staff—Zone, Staff—Patient
    { u:14, v:0,  w:1.0 },
    { u:15, v:2,  w:1.0 },
    { u:14, v:9,  w:2.0 },
    { u:15, v:11, w:2.0 },
  ];

  return { nodes, edges };
}

// ══════════════════════════════════════════════════════════════════════════
//  ALGORITHMS (JavaScript mirrors of the C code)
// ══════════════════════════════════════════════════════════════════════════

function computePriority(node) {
  const p = node;
  const organRisk = 1 - (
    0.35 * p.lungStability   +
    0.25 * p.heartStability  +
    0.20 * p.kidneyStability +
    0.20 * p.brainStability
  );
  const oxyRisk   = (100 - p.oxygenLevel) / 100;
  const timeBonus = Math.min(p.timeOnVent / 1440, 1);
  const score     = organRisk * 50 + oxyRisk * 35 + timeBonus * 15;

  node.priorityScore = score;
  node.weaningCandidate = (
    p.oxygenLevel >= 94 && p.lungStability >= 0.80 &&
    p.heartStability >= 0.80 && p.kidneyStability >= 0.75
  );
  return score;
}

// BFS: returns { found: nodeId, path: [ids], visited: Set }
function bfsNearest(graph, startId, targetFn) {
  const visited = new Set([startId]);
  const queue   = [startId];
  const parent  = { [startId]: null };

  while (queue.length) {
    const cur = queue.shift();
    const node = graph.nodes[cur];
    if (cur !== startId && targetFn(node)) {
      // reconstruct path
      const path = [];
      let n = cur;
      while (n !== null) { path.unshift(n); n = parent[n]; }
      return { found: cur, path, visited };
    }
    for (const { to } of adjacencyList(graph, cur)) {
      if (!visited.has(to)) {
        visited.add(to);
        parent[to] = cur;
        queue.push(to);
      }
    }
  }
  return { found: -1, path: [], visited };
}

// BFS surge: returns zones in BFS order
function bfsSurgeMap(graph, startZoneId) {
  const visited = new Set([startZoneId]);
  const queue   = [startZoneId];
  const order   = [];
  while (queue.length) {
    const cur = queue.shift();
    if (graph.nodes[cur].type === TYPE.ZONE) order.push(cur);
    for (const { to } of adjacencyList(graph, cur)) {
      if (!visited.has(to)) { visited.add(to); queue.push(to); }
    }
  }
  return order;
}

// DFS: find weaning candidates via DFS traversal
function dfsFindWeaningCandidates(graph) {
  const visited   = new Set();
  const stack     = graph.nodes.map(n => n.id).filter(id => graph.nodes[id].type === TYPE.PATIENT);
  const candidates = [];
  while (stack.length) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const n = graph.nodes[cur];
    if (n.type === TYPE.PATIENT && n.weaningCandidate && n.ventId >= 0) candidates.push(cur);
    for (const { to } of adjacencyList(graph, cur))
      if (!visited.has(to)) stack.push(to);
  }
  return candidates;
}

// DFS cycle detection (undirected)
function dfsCycleDetect(graph) {
  const color  = {};
  const cycles = [];
  graph.nodes.forEach(n => { if (n.type === TYPE.PATIENT) color[n.id] = 0; });

  function visit(cur, par) {
    color[cur] = 1;
    for (const { to } of adjacencyList(graph, cur)) {
      if (graph.nodes[to].type !== TYPE.PATIENT) continue;
      if (color[to] === 1 && to !== par) {
        cycles.push([cur, to]);
      } else if (!color[to]) {
        visit(to, cur);
      }
    }
    color[cur] = 2;
  }

  graph.nodes.forEach(n => { if (n.type === TYPE.PATIENT && !color[n.id]) visit(n.id, -1); });
  return cycles;
}

// Adjacency list helper
function adjacencyList(graph, nodeId) {
  return graph.edges
    .filter(e => e.u === nodeId || e.v === nodeId)
    .map(e => ({ to: e.u === nodeId ? e.v : e.u, w: e.w }));
}

function surgeTimeToZero(graph, rate) {
  const freeVents = graph.nodes.filter(n => n.type === TYPE.VENTILATOR && n.status === STATUS.FREE).length;
  if (rate <= 0) return Infinity;
  return freeVents / rate;
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDERER
// ══════════════════════════════════════════════════════════════════════════
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.scale  = 1;
    this.panX   = 0;
    this.panY   = 0;
    this._dragging = false;
    this._lastMouse = null;
    this._initEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  _initEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this._dragging   = true;
      this._lastMouse  = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', e => {
      if (this._dragging) {
        this.panX += (e.clientX - this._lastMouse.x) / this.scale;
        this.panY += (e.clientY - this._lastMouse.y) / this.scale;
        this._lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    window.addEventListener('mouseup', () => { this._dragging = false; });
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.scale = Math.max(0.3, Math.min(3, this.scale * zoomFactor));
    }, { passive: false });
  }

  zoom(delta) { this.scale = Math.max(0.3, Math.min(3, this.scale * delta)); }
  resetView() { this.scale = 1; this.panX = 0; this.panY = 0; }

  worldToScreen(wx, wy) {
    return {
      x: (wx + this.panX) * this.scale,
      y: (wy + this.panY) * this.scale,
    };
  }
  screenToWorld(sx, sy) {
    return { x: sx / this.scale - this.panX, y: sy / this.scale - this.panY };
  }

  clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    // Dark grid
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(41,121,255,0.06)';
    this.ctx.lineWidth = 1;
    const gs = 60 * this.scale;
    const ox = ((this.panX * this.scale) % gs + gs) % gs;
    const oy = ((this.panY * this.scale) % gs + gs) % gs;
    for (let x = ox; x < width; x += gs) { this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,height); this.ctx.stroke(); }
    for (let y = oy; y < height; y += gs) { this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(width,y); this.ctx.stroke(); }
    this.ctx.restore();
  }

  drawEdges(graph, highlightEdges = new Set(), highlightColor = COLOR.edgeHL) {
    const ctx = this.ctx;
    graph.edges.forEach((e, idx) => {
      const nu = graph.nodes[e.u];
      const nv = graph.nodes[e.v];
      const pu = this.worldToScreen(nu.cx, nu.cy);
      const pv = this.worldToScreen(nv.cx, nv.cy);
      const hl = highlightEdges.has(idx);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pu.x, pu.y);
      ctx.lineTo(pv.x, pv.y);
      ctx.strokeStyle = hl ? highlightColor : COLOR.edge;
      ctx.lineWidth   = hl ? 2.5 * this.scale : 1.2 * this.scale;
      ctx.globalAlpha = hl ? 0.95 : 0.5;
      if (hl) ctx.shadowColor = highlightColor, ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // weight label
      if (hl) {
        const mx = (pu.x + pv.x) / 2, my = (pu.y + pv.y) / 2;
        ctx.save();
        ctx.fillStyle = highlightColor;
        ctx.font = `${11 * this.scale}px JetBrains Mono`;
        ctx.globalAlpha = 0.8;
        ctx.fillText(`${e.w}m`, mx + 4, my - 4);
        ctx.restore();
      }
    });
  }

  drawZones(graph) {
    const ctx = this.ctx;
    graph.nodes.filter(n => n.type === TYPE.ZONE).forEach(z => {
      const p = this.worldToScreen(z.cx, z.cy);
      const w = 160 * this.scale, h = 110 * this.scale;
      ctx.save();
      ctx.strokeStyle = COLOR[z.status] || COLOR.zone;
      ctx.lineWidth   = 1.5 * this.scale;
      ctx.globalAlpha = 0.7;
      // Draw rounded rect
      const r = 14 * this.scale;
      ctx.beginPath();
      ctx.moveTo(p.x - w/2 + r, p.y - h/2);
      ctx.lineTo(p.x + w/2 - r, p.y - h/2);
      ctx.quadraticCurveTo(p.x + w/2, p.y - h/2, p.x + w/2, p.y - h/2 + r);
      ctx.lineTo(p.x + w/2, p.y + h/2 - r);
      ctx.quadraticCurveTo(p.x + w/2, p.y + h/2, p.x + w/2 - r, p.y + h/2);
      ctx.lineTo(p.x - w/2 + r, p.y + h/2);
      ctx.quadraticCurveTo(p.x - w/2, p.y + h/2, p.x - w/2, p.y + h/2 - r);
      ctx.lineTo(p.x - w/2, p.y - h/2 + r);
      ctx.quadraticCurveTo(p.x - w/2, p.y - h/2, p.x - w/2 + r, p.y - h/2);
      ctx.closePath();
      ctx.fillStyle   = `${COLOR[z.status]}11`;
      ctx.fill();
      ctx.stroke();

      // Zone label
      ctx.globalAlpha = 0.95;
      ctx.fillStyle   = COLOR[z.status] || '#fff';
      ctx.font        = `bold ${12 * this.scale}px Inter`;
      ctx.textAlign   = 'center';
      ctx.fillText(z.name, p.x, p.y - h/2 + 18 * this.scale);
      ctx.fillStyle   = 'rgba(143,168,200,0.8)';
      ctx.font        = `${10 * this.scale}px Inter`;
      ctx.fillText(`Cap: ${z.patients}/${z.capacity} · Vents: ${z.availVents}`, p.x, p.y - h/2 + 32 * this.scale);
      ctx.restore();
    });
  }

  drawNode(node, overrideColor = null, glowIntensity = 0) {
    if (node.type === TYPE.ZONE) return;
    const ctx = this.ctx;
    const p   = this.worldToScreen(node.cx, node.cy);
    const r   = (NODE_RADIUS[node.type] || 16) * this.scale;
    const col = overrideColor || COLOR[node.status] || '#fff';

    ctx.save();
    // glow
    if (glowIntensity > 0) {
      ctx.shadowColor = col;
      ctx.shadowBlur  = glowIntensity * this.scale;
    }
    // ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 4 * this.scale, 0, Math.PI * 2);
    ctx.strokeStyle = `${col}44`;
    ctx.lineWidth   = 2 * this.scale;
    ctx.stroke();

    // body
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(p.x - r*0.3, p.y - r*0.3, 0, p.x, p.y, r);
    grad.addColorStop(0, `${col}cc`);
    grad.addColorStop(1, `${col}44`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2 * this.scale;
    ctx.stroke();
    ctx.restore();

    // Icon
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font      = `${Math.floor(r * 0.75)}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = { patient:'🧑', ventilator:'💨', staff:'👩‍⚕️' };
    ctx.fillText(icons[node.type] || '●', p.x, p.y);
    ctx.restore();

    // Label below
    ctx.save();
    ctx.fillStyle   = 'rgba(232,240,254,0.85)';
    ctx.font        = `${Math.max(9, 11 * this.scale)}px Inter`;
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'top';
    ctx.fillText(node.name, p.x, p.y + r + 4 * this.scale);

    // Score badge for patients
    if (node.type === TYPE.PATIENT && node.priorityScore > 0) {
      const score = node.priorityScore.toFixed(1);
      const bx = p.x + r, by = p.y - r;
      const badgeCol = node.priorityScore > 55 ? '#ff1744' : node.priorityScore > 30 ? '#ffea00' : '#00e676';
      ctx.fillStyle = badgeCol;
      ctx.font      = `bold ${Math.max(8, 10 * this.scale)}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.beginPath();
      ctx.arc(bx, by, 10 * this.scale, 0, Math.PI*2);
      ctx.fillStyle = `${badgeCol}33`;
      ctx.fill();
      ctx.strokeStyle = badgeCol;
      ctx.lineWidth   = 1.5 * this.scale;
      ctx.stroke();
      ctx.fillStyle = badgeCol;
      ctx.fillText(score, bx, by);
    }

    // Weaning badge
    if (node.type === TYPE.PATIENT && node.weaningCandidate) {
      ctx.fillStyle = '#00e676';
      ctx.font      = `${Math.max(8, 9*this.scale)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText('💚 WEAN', p.x, p.y + r + 14 * this.scale);
    }

    // Ventilator status
    if (node.type === TYPE.VENTILATOR) {
      const statusTxt = node.status === STATUS.FREE ? 'FREE' : 'IN USE';
      ctx.fillStyle = COLOR[node.status] || '#fff';
      ctx.font      = `bold ${Math.max(7, 9*this.scale)}px JetBrains Mono`;
      ctx.fillText(statusTxt, p.x, p.y + r + 14 * this.scale);
    }
    ctx.restore();
  }

  // BFS ripple animation circles
  drawBFSWave(cx, cy, radius, alpha) {
    const ctx = this.ctx;
    const p   = this.worldToScreen(cx, cy);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * this.scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
    ctx.lineWidth   = 2 * this.scale;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur  = 18;
    ctx.stroke();
    ctx.restore();
  }

  // DFS path highlight with pulsing arrow
  drawDFSPath(path, graph, progress) {
    if (path.length < 2) return;
    const ctx = this.ctx;
    for (let i = 0; i < Math.min(path.length - 1, Math.ceil(progress)); i++) {
      const nu = graph.nodes[path[i]];
      const nv = graph.nodes[path[i+1]];
      if (!nu || !nv) continue;
      const pu = this.worldToScreen(nu.cx, nu.cy);
      const pv = this.worldToScreen(nv.cx, nv.cy);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pu.x, pu.y);
      ctx.lineTo(pv.x, pv.y);
      ctx.strokeStyle = COLOR.dfs;
      ctx.lineWidth   = 3 * this.scale;
      ctx.shadowColor = COLOR.dfs;
      ctx.shadowBlur  = 16;
      ctx.setLineDash([8 * this.scale, 4 * this.scale]);
      ctx.stroke();
      ctx.restore();
    }
  }

  nodeAt(graph, sx, sy) {
    const w = this.screenToWorld(sx, sy);
    return graph.nodes.find(n => {
      if (n.type === TYPE.ZONE) return false;
      const r = NODE_RADIUS[n.type] || 16;
      const dx = n.cx - w.x, dy = n.cy - w.y;
      return Math.sqrt(dx*dx + dy*dy) <= r + 6;
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  ANIMATION ENGINE
// ══════════════════════════════════════════════════════════════════════════
class AnimEngine {
  constructor() {
    this.bfsWaves  = [];   // { cx, cy, r, maxR, alpha, speed }
    this.dfsPath   = null; // { path, progress, maxProgress }
    this.nodeGlows = {};   // id → { col, intensity, decay }
    this.callbacks = [];
  }

  triggerBFS(graph, pathNodeIds) {
    // Ripple outward from each node in path sequence
    this.bfsWaves = [];
    pathNodeIds.forEach((id, i) => {
      const n = graph.nodes[id];
      setTimeout(() => {
        this.bfsWaves.push({ cx:n.cx, cy:n.cy, r:10, maxR:80, alpha:0.9, speed:1.8 });
        this.nodeGlows[id] = { col:COLOR.bfs, intensity:30, decay:0.4 };
      }, i * 180);
    });
  }

  triggerDFS(pathNodeIds) {
    this.dfsPath = { path:pathNodeIds, progress:0, maxProgress:pathNodeIds.length - 1 };
    pathNodeIds.forEach(id => {
      setTimeout(() => {
        this.nodeGlows[id] = { col:COLOR.dfs, intensity:30, decay:0.3 };
      }, pathNodeIds.indexOf(id) * 400);
    });
  }

  triggerNodePulse(id, col) {
    this.nodeGlows[id] = { col, intensity:40, decay:0.5 };
  }

  update() {
    // BFS waves
    this.bfsWaves = this.bfsWaves.filter(w => {
      w.r     += w.speed;
      w.alpha -= 0.018;
      return w.alpha > 0 && w.r < w.maxR;
    });
    // DFS path
    if (this.dfsPath && this.dfsPath.progress < this.dfsPath.maxProgress) {
      this.dfsPath.progress = Math.min(this.dfsPath.maxProgress, this.dfsPath.progress + 0.04);
    }
    // Node glows
    for (const id in this.nodeGlows) {
      this.nodeGlows[id].intensity -= this.nodeGlows[id].decay;
      if (this.nodeGlows[id].intensity <= 0) delete this.nodeGlows[id];
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN SIMULATION
// ══════════════════════════════════════════════════════════════════════════
class ICUSimulation {
  constructor() {
    this.graph   = buildInitialGraph();
    this.canvas  = document.getElementById('hospital-canvas');
    this.renderer= new Renderer(this.canvas);
    this.anim    = new AnimEngine();
    this.tooltip = document.getElementById('tooltip');
    this.arrivalRate = 0.15;
    this._nextPatientId = 20;

    this._computeAllPriorities();
    this._renderUI();
    this._bindEvents();
    this._startLoop();
    this._initClock();
  }

  _computeAllPriorities() {
    this.graph.nodes.forEach(n => {
      if (n.type === TYPE.PATIENT) computePriority(n);
    });
  }

  // ── RENDER LOOP ──────────────────────────────────────────────────────────
  _startLoop() {
    const loop = () => {
      this.anim.update();
      this._draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _draw() {
    const { renderer: r, graph, anim } = this;
    r.clear();
    r.drawZones(graph);
    r.drawEdges(graph);

    // BFS waves
    anim.bfsWaves.forEach(w => r.drawBFSWave(w.cx, w.cy, w.r, w.alpha));

    // DFS path
    if (anim.dfsPath) r.drawDFSPath(anim.dfsPath.path, graph, anim.dfsPath.progress);

    // Nodes
    graph.nodes.forEach(n => {
      if (n.type === TYPE.ZONE) return;
      const glow = anim.nodeGlows[n.id];
      r.drawNode(n, glow ? glow.col : null, glow ? glow.intensity : 0);
    });
  }

  // ── UI PANELS ────────────────────────────────────────────────────────────
  _renderUI() {
    this._renderTriage();
    this._renderSurge();
  }

  _renderTriage() {
    const patients = this.graph.nodes
      .filter(n => n.type === TYPE.PATIENT)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const list = document.getElementById('triage-list');
    list.innerHTML = '';
    patients.forEach((p, i) => {
      const scoreClass = p.priorityScore > 55 ? 'score-high' : p.priorityScore > 30 ? 'score-med' : 'score-low';
      const weanBadge  = p.weaningCandidate ? '<span class="triage-wean">💚 WEAN</span>' : '';
      list.innerHTML += `
        <div class="triage-row">
          <span class="triage-rank">#${i+1}</span>
          <span class="triage-name">${p.name}</span>
          <span class="triage-score ${scoreClass}">${p.priorityScore.toFixed(1)}</span>
          ${weanBadge}
        </div>`;
    });

    // Header free-vent count
    const freeVents = this.graph.nodes.filter(n => n.type === TYPE.VENTILATOR && n.status === STATUS.FREE).length;
    document.getElementById('free-vent-count').textContent = freeVents;
  }

  _renderSurge() {
    const mins = surgeTimeToZero(this.graph, this.arrivalRate);
    const display = isFinite(mins) ? mins.toFixed(0) : '∞';
    document.getElementById('surge-timer').textContent = display;
    document.getElementById('surge-time-lbl').textContent = isFinite(mins) ? `${display} min` : '∞';

    // Bar fill: 0% when infinite, 100% when <=5min
    const pct = isFinite(mins) ? Math.min(100, Math.max(0, (1 - mins / 60) * 100)) : 0;
    document.getElementById('surge-bar').style.width = pct + '%';

    // Zone order
    const erId = this.graph.nodes.find(n => n.name === 'Emergency Room')?.id ?? 3;
    const order = bfsSurgeMap(this.graph, erId);
    const container = document.getElementById('zone-surge-list');
    container.innerHTML = '';
    order.forEach((id, i) => {
      const z = this.graph.nodes[id];
      const fillPct = Math.min(100, (z.patients / z.capacity) * 100);
      container.innerHTML += `
        <div class="zone-row">
          <span class="zone-order">${i+1}</span>
          <span style="flex:1">${z.name}</span>
          <div class="zone-bar" style="width:${fillPct * 0.8}px; opacity:${0.4 + fillPct/150}"></div>
        </div>`;
    });
  }

  // ── ACTIONS ──────────────────────────────────────────────────────────────

  // 1. New critical patient → BFS find nearest vent
  doNewCriticalPatient() {
    const newId = this._nextPatientId++;
    // Place near ER
    const er = this.graph.nodes.find(n => n.type === TYPE.ZONE && n.name === 'Emergency Room');
    const cx = er.cx + (Math.random() - 0.5) * 80;
    const cy = er.cy + 40 + Math.random() * 40;
    const patientNames = ['Frank Lee','Grace Kim','Hector Ruiz','Iris Patel','Jake Brown','Lily Wang'];
    const name = patientNames[Math.floor(Math.random() * patientNames.length)];

    const newNode = {
      id: newId, name, type: TYPE.PATIENT, status: STATUS.CRITICAL,
      cx, cy,
      oxygenLevel: 65 + Math.random() * 15,
      lungStability:   0.15 + Math.random() * 0.25,
      heartStability:  0.20 + Math.random() * 0.30,
      kidneyStability: 0.30 + Math.random() * 0.30,
      brainStability:  0.60 + Math.random() * 0.25,
      ventId: -1, timeOnVent: 0, priorityScore: 0, weaningCandidate: false
    };
    computePriority(newNode);
    this.graph.nodes.push(newNode);
    // Connect to ER zone
    this.graph.edges.push({ u: newId, v: er.id, w: 1.5 });
    this.graph.edges.push({ u: newId, v: 12, w: 5.0 }); // near David Wu

    this.log(`🚨 New critical patient admitted: ${name}`, 'log-critical');

    // BFS: nearest free vent
    const result = bfsNearest(this.graph, newId, n => n.type === TYPE.VENTILATOR && n.status === STATUS.FREE);
    if (result.found >= 0) {
      const vent = this.graph.nodes[result.found];
      this.log(`🔵 BFS found ${vent.name} — ${result.path.length-1} hop(s) away`, 'log-bfs');
      this.anim.triggerBFS(this.graph, result.path);
      this.anim.triggerNodePulse(newId, COLOR.critical);

      // Assign vent
      setTimeout(() => {
        vent.status        = STATUS.IN_USE;
        vent.patientId     = newId;
        newNode.ventId     = result.found;
        newNode.status     = STATUS.RISK;
        this.log(`✅ ${vent.name} allocated to ${name}`, 'log-success');
        this._computeAllPriorities();
        this._renderUI();
      }, result.path.length * 200 + 500);
    } else {
      this.log('⚠ No free ventilator found! Surge critical.', 'log-warn');
      this.anim.triggerNodePulse(newId, COLOR.critical);
    }

    this._computeAllPriorities();
    this._renderUI();
  }

  // 2. Remove ventilator from most critical patient → DFS cascade
  doRemoveVentilator() {
    const criticalPatient = this.graph.nodes
      .filter(n => n.type === TYPE.PATIENT && n.ventId >= 0)
      .sort((a, b) => b.priorityScore - a.priorityScore)[0];

    if (!criticalPatient) { this.log('No patient on ventilator.', 'log-warn'); return; }

    const vent = this.graph.nodes[criticalPatient.ventId];
    this.log(`⚠ Removing ${vent.name} from ${criticalPatient.name}`, 'log-warn');

    // Build cascade path: patient → adjacent patients
    const path = [criticalPatient.id];
    const adj  = adjacencyList(this.graph, criticalPatient.id);
    adj.filter(e => this.graph.nodes[e.to].type === TYPE.PATIENT).forEach(e => path.push(e.to));

    this.anim.triggerDFS(path);
    this.anim.triggerNodePulse(criticalPatient.id, COLOR.critical);

    // Show cascade panel
    this._showCascade(criticalPatient);

    // Actually remove vent
    vent.status             = STATUS.FREE;
    vent.patientId          = -1;
    criticalPatient.ventId  = -1;
    criticalPatient.status  = STATUS.CRITICAL;

    this.log(`💀 DFS cascade: tracing organ failure for ${criticalPatient.name}`, 'log-dfs');
    this._computeAllPriorities();
    this._renderUI();
  }

  // 3. Find weaning candidate
  doFindWeaningCandidate() {
    this._computeAllPriorities();
    const candidates = dfsFindWeaningCandidates(this.graph);
    if (candidates.length === 0) {
      this.log('💔 No weaning candidates found — impossible decision!', 'log-warn');
      // Show cascade of the sickest anyway
      const sickest = this.graph.nodes
        .filter(n => n.type === TYPE.PATIENT && n.ventId >= 0)
        .sort((a, b) => b.priorityScore - a.priorityScore)[0];
      if (sickest) {
        this.log(`💀 Consequence if no action: cascade for ${sickest.name}`, 'log-dfs');
        this._showCascade(sickest);
        this.anim.triggerNodePulse(sickest.id, COLOR.critical);
      }
      return;
    }

    candidates.forEach(id => {
      const n = this.graph.nodes[id];
      this.log(`💚 DFS: Weaning candidate → ${n.name} (score ${n.priorityScore.toFixed(1)})`, 'log-success');
      this.anim.triggerNodePulse(id, COLOR.stable);
    });

    // Wean the best candidate (lowest score)
    const bestId = candidates.sort((a,b) =>
      this.graph.nodes[a].priorityScore - this.graph.nodes[b].priorityScore
    )[0];
    const best = this.graph.nodes[bestId];
    this.log(`✅ Weaning ${best.name} — freeing ${this.graph.nodes[best.ventId]?.name ?? 'ventilator'}`, 'log-success');

    const vent = this.graph.nodes[best.ventId];
    if (vent) { vent.status = STATUS.FREE; vent.patientId = -1; }
    best.ventId = -1;
    this._computeAllPriorities();
    this._renderUI();
  }

  // 4. Dispatch staff
  doDispatchStaff() {
    const critPatient = this.graph.nodes
      .filter(n => n.type === TYPE.PATIENT && n.status === STATUS.CRITICAL)[0];
    if (!critPatient) { this.log('No critical patient needs staff.', 'log-warn'); return; }

    const result = bfsNearest(this.graph, critPatient.id, n => n.type === TYPE.STAFF && n.available);
    if (result.found >= 0) {
      const staff = this.graph.nodes[result.found];
      this.log(`👩‍⚕️ BFS: Dispatching ${staff.name} to ${critPatient.name} (${result.path.length-1} hop${result.path.length>2?'s':''})`, 'log-bfs');
      this.anim.triggerBFS(this.graph, result.path);
      staff.available = false;
      setTimeout(() => { staff.available = true; }, 8000);
    } else {
      this.log('⚠ No available staff found!', 'log-warn');
    }
  }

  // 5. Cycle / deadlock detection
  doDetectCycles() {
    const cycles = dfsCycleDetect(this.graph);
    const modal  = document.getElementById('deadlock-modal');
    const body   = document.getElementById('modal-body');

    if (cycles.length === 0) {
      body.innerHTML = '<div class="no-deadlock">✅ No deadlocks detected. Patient dependency graph is acyclic.</div>';
      this.log('✅ DFS: No dependency deadlocks found.', 'log-success');
    } else {
      body.innerHTML = cycles.map(([a, b]) => `
        <div class="deadlock-item">
          ⚠ Deadlock: <strong>${this.graph.nodes[a].name}</strong> ↔ 
          <strong>${this.graph.nodes[b].name}</strong><br/>
          <small>These patients form a weaning dependency cycle</small>
        </div>`).join('');
      this.log(`⚠ DFS: ${cycles.length} deadlock(s) detected!`, 'log-warn');
      cycles.forEach(([a]) => this.anim.triggerNodePulse(a, COLOR.dfs));
    }
    modal.classList.remove('hidden');
  }

  doSurgeAlert() {
    const freeVents = this.graph.nodes.filter(n => n.type === TYPE.VENTILATOR && n.status === STATUS.FREE);
    const mins = surgeTimeToZero(this.graph, this.arrivalRate);
    this.log(`⚡ SURGE ALERT: ${freeVents.length} vents free, ~${isFinite(mins) ? mins.toFixed(0) : '∞'} min to depletion at ${this.arrivalRate} patients/min`, 'log-critical');

    // BFS from ER showing spread
    const erId = this.graph.nodes.find(n => n.name === 'Emergency Room')?.id ?? 3;
    const surgeOrder = bfsSurgeMap(this.graph, erId);
    surgeOrder.forEach((id, i) => {
      setTimeout(() => {
        const z = this.graph.nodes[id];
        this.log(`📍 BFS surge: ${z.name} fills in wave ${i+1}`, 'log-bfs');
        this.anim.triggerNodePulse(id, COLOR.bfs);
      }, i * 600);
    });
  }

  _showCascade(patient) {
    const panel = document.getElementById('cascade-panel');
    const steps = document.getElementById('cascade-steps');
    panel.style.display = 'block';
    steps.innerHTML = '';
    CASCADE_DATA.forEach((step, i) => {
      const stability = Math.max(0, (patient[step.organ.toLowerCase() + 'Stability'] ?? 0.5) - step.stability * 0.6);
      setTimeout(() => {
        steps.innerHTML += `
          <div class="cascade-step" style="animation-delay:${i*0.1}s">
            <span class="cascade-time">T+${step.time}m</span>
            <div>
              <div class="cascade-organ">${step.organ}</div>
              <div class="cascade-label">${step.label}</div>
              <div style="font-family:var(--mono);font-size:10px;color:${stability < 0.2 ? '#ff1744' : '#ffea00'};margin-top:3px">
                Stability: ${(stability * 100).toFixed(0)}% ${stability <= 0 ? '— IRREVERSIBLE' : ''}
              </div>
            </div>
          </div>`;
      }, i * 400);
    });
  }

  doReset() {
    this.graph = buildInitialGraph();
    this._nextPatientId = 20;
    this.anim  = new AnimEngine();
    document.getElementById('cascade-panel').style.display = 'none';
    document.getElementById('cascade-steps').innerHTML = '';
    document.getElementById('event-log').innerHTML = '';
    this._computeAllPriorities();
    this._renderUI();
    this.log('↺ Simulation reset.', 'log-success');
  }

  // ── EVENT BINDING ────────────────────────────────────────────────────────
  _bindEvents() {
    document.getElementById('btn-new-patient').addEventListener('click', () => this.doNewCriticalPatient());
    document.getElementById('btn-remove-vent').addEventListener('click', () => this.doRemoveVentilator());
    document.getElementById('btn-weaning').addEventListener('click', () => this.doFindWeaningCandidate());
    document.getElementById('btn-dispatch-staff').addEventListener('click', () => this.doDispatchStaff());
    document.getElementById('btn-cycle').addEventListener('click', () => this.doDetectCycles());
    document.getElementById('btn-surge').addEventListener('click', () => this.doSurgeAlert());
    document.getElementById('btn-reset').addEventListener('click', () => this.doReset());

    document.getElementById('btn-zoom-in').addEventListener('click', () => this.renderer.zoom(1.2));
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.renderer.zoom(0.85));
    document.getElementById('btn-zoom-reset').addEventListener('click', () => this.renderer.resetView());

    const slider = document.getElementById('arrival-rate');
    slider.addEventListener('input', () => {
      this.arrivalRate = parseFloat(slider.value);
      document.getElementById('rate-val').textContent = this.arrivalRate.toFixed(2);
      this._renderSurge();
    });

    // Tooltip on hover
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const node  = this.renderer.nodeAt(this.graph, e.clientX - rect.left, e.clientY - rect.top);
      const tt    = this.tooltip;
      if (node) {
        tt.classList.remove('hidden');
        tt.style.left = (e.clientX + 14) + 'px';
        tt.style.top  = (e.clientY + 14) + 'px';
        tt.innerHTML  = this._tooltipHTML(node);
      } else {
        tt.classList.add('hidden');
      }
    });
    this.canvas.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));
  }

  _tooltipHTML(node) {
    if (node.type === TYPE.PATIENT) {
      return `<div class="tooltip-title">🧑 ${node.name}</div>
        Status: <b style="color:${COLOR[node.status]}">${node.status.toUpperCase()}</b><br/>
        SpO₂: <b>${node.oxygenLevel.toFixed(1)}%</b><br/>
        Lung: ${(node.lungStability*100).toFixed(0)}% · Heart: ${(node.heartStability*100).toFixed(0)}%<br/>
        Kidney: ${(node.kidneyStability*100).toFixed(0)}% · Brain: ${(node.brainStability*100).toFixed(0)}%<br/>
        Priority Score: <b style="color:${node.priorityScore>55?'#ff1744':node.priorityScore>30?'#ffea00':'#00e676'}">${node.priorityScore.toFixed(1)}</b><br/>
        Vent: ${node.ventId >= 0 ? this.graph.nodes[node.ventId]?.name : 'None'}
        ${node.weaningCandidate ? '<br/><b style="color:#00e676">💚 Weaning Candidate</b>' : ''}`;
    }
    if (node.type === TYPE.VENTILATOR) {
      return `<div class="tooltip-title">💨 ${node.name}</div>
        Status: <b style="color:${COLOR[node.status]}">${node.status.replace('_',' ').toUpperCase()}</b><br/>
        Floor: ${node.floor} · Wing: ${node.wing}<br/>
        Patient: ${node.patientId >= 0 ? this.graph.nodes[node.patientId]?.name : 'None'}`;
    }
    if (node.type === TYPE.STAFF) {
      return `<div class="tooltip-title">👩‍⚕️ ${node.name}</div>
        Role: ${node.role}<br/>
        Available: <b style="color:${node.available?'#00e676':'#ff1744'}">${node.available ? 'Yes' : 'Dispatched'}</b>`;
    }
    return `<div class="tooltip-title">${node.name}</div>`;
  }

  // ── CLOCK ────────────────────────────────────────────────────────────────
  _initClock() {
    const update = () => {
      const now = new Date();
      document.getElementById('clock').textContent =
        now.toLocaleTimeString('en-IN', { hour12:false });
    };
    update();
    setInterval(update, 1000);
  }

  // ── LOG ──────────────────────────────────────────────────────────────────
  log(message, cls = '') {
    const el = document.getElementById('event-log');
    const div = document.createElement('div');
    div.className = `log-entry ${cls}`;
    div.textContent = `[${new Date().toLocaleTimeString('en-IN',{hour12:false})}] ${message}`;
    el.prepend(div);
    // cap at 60 entries
    while (el.children.length > 60) el.removeChild(el.lastChild);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  const sim = new ICUSimulation();
  sim.log('🏥 ICU Ventilator Allocation System online.', 'log-success');
  sim.log('Graph loaded: 4 zones · 5 vents · 5 patients · 2 staff', '');
  sim.log('Use the action buttons to run BFS/DFS algorithms.', '');
});
