import * as THREE from "three";
import { getPuzzleForMode } from "./puzzles.js";
import { ModeImageEngine } from "./engine/ModeImageEngine.js";
import { BoardView } from "./render/BoardView.js";
import { InputController } from "./input/InputController.js";

const imageInputEl = document.getElementById("image-input");
const gridSizeSelectEl = document.getElementById("grid-size-select");
const demoImageBtn = document.getElementById("demo-image-btn");
const resetBtn = document.getElementById("reset-btn");
const undoBtn = document.getElementById("undo-btn");
const playAgainBtn = document.getElementById("play-again-btn");

const movesValueEl = document.getElementById("moves-value");
const bestMovesValueEl = document.getElementById("best-moves-value");
const metricLabelEl = document.getElementById("metric-label");
const metricValueEl = document.getElementById("metric-value");
const metricSecondaryLabelEl = document.getElementById("metric-secondary-label");
const metricSecondaryValueEl = document.getElementById("metric-secondary-value");

const statusTextEl = document.getElementById("status-text");
const winOverlayEl = document.getElementById("win-overlay");
const winTextEl = document.getElementById("win-text");
const DEFAULT_IMAGE_URL = new URL("../cat.png", import.meta.url);

const boardRoot = document.getElementById("board-root");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
boardRoot.appendChild(renderer.domElement);

const boardView = new BoardView(scene, {
  cellSize: 1.0,
  gap: 0.04,
  handleSize: 0.6,
  handleGap: 0.25
});

let engine = null;
let hoveredHandle = null;
let renderQueued = false;

let currentImageSource = createDemoImage();
let currentImageSeedKey = "builtin-demo-v1";
let gridSize = parseGridSize(gridSizeSelectEl?.value);

function createDemoImage(size = 1200) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const ornamentRng = createSeededRng("builtin-demo-v1", "ornaments");

  ctx.fillStyle = "#f4f5f6";
  ctx.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.57;
  const bodyW = size * 0.56;
  const bodyH = size * 0.38;

  const bodyGradient = ctx.createLinearGradient(cx - bodyW * 0.5, cy - bodyH * 0.5, cx + bodyW * 0.5, cy + bodyH * 0.5);
  bodyGradient.addColorStop(0, "#2d9ac7");
  bodyGradient.addColorStop(0.5, "#1f7fb1");
  bodyGradient.addColorStop(1, "#15578a");

  ctx.beginPath();
  ctx.ellipse(cx, cy, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.strokeStyle = "#123c61";
  ctx.lineWidth = size * 0.012;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.64, cy - bodyH * 0.14);
  ctx.quadraticCurveTo(cx - bodyW * 0.88, cy - bodyH * 0.1, cx - bodyW * 1.0, cy - bodyH * 0.03);
  ctx.quadraticCurveTo(cx - bodyW * 0.88, cy + bodyH * 0.06, cx - bodyW * 0.62, cy - bodyH * 0.02);
  ctx.closePath();
  ctx.fillStyle = "#1b77a8";
  ctx.fill();
  ctx.strokeStyle = "#123c61";
  ctx.lineWidth = size * 0.01;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + bodyW * 0.58, cy - bodyH * 0.02, bodyW * 0.2, Math.PI * 0.2, Math.PI * 1.8, true);
  ctx.lineWidth = size * 0.036;
  ctx.strokeStyle = "#1f7fb1";
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(cx - bodyW * 0.58, cy - bodyH * 0.35, bodyW * 1.16, bodyH * 0.14);
  ctx.fillStyle = "#2a8fc0";
  ctx.fill();
  ctx.strokeStyle = "#123c61";
  ctx.lineWidth = size * 0.01;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy - bodyH * 0.46, bodyW * 0.2, bodyH * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2b8dbd";
  ctx.fill();
  ctx.strokeStyle = "#123c61";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy - bodyH * 0.61, bodyW * 0.12, bodyH * 0.11, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2f95c3";
  ctx.fill();
  ctx.strokeStyle = "#123c61";
  ctx.stroke();

  ctx.strokeStyle = "#f8f4ef";
  ctx.lineWidth = size * 0.01;
  for (let i = 0; i < 9; i += 1) {
    const startX = cx - bodyW * 0.45 + i * (bodyW * 0.11);
    const startY = cy + bodyH * 0.21;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX - bodyW * 0.1,
      startY - bodyH * 0.22,
      startX + bodyW * 0.02,
      startY - bodyH * 0.3,
      startX + bodyW * 0.08,
      startY - bodyH * 0.43
    );
    ctx.stroke();
  }

  for (let i = 0; i < 22; i += 1) {
    const x = cx - bodyW * 0.4 + (ornamentRng() * bodyW * 0.8);
    const y = cy - bodyH * 0.22 + (ornamentRng() * bodyH * 0.45);
    ctx.beginPath();
    ctx.ellipse(x, y, bodyW * 0.027, bodyH * 0.022, ornamentRng() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = "#f8f4ef";
    ctx.fill();
  }

  return canvas;
}

function setStatus(text, tone = "neutral") {
  statusTextEl.textContent = text;
  statusTextEl.className = "";
  if (tone === "good") {
    statusTextEl.classList.add("good");
  } else if (tone === "warn") {
    statusTextEl.classList.add("warn");
  } else if (tone === "bad") {
    statusTextEl.classList.add("bad");
  }
}

function parseGridSize(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) {
    return 5;
  }

  return Math.max(4, Math.min(10, parsed));
}

function isSolved() {
  return engine?.isSolved() ?? false;
}

function xmur3(input) {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRng(seedKey, streamKey = "") {
  const seedGen = xmur3(`${seedKey}::${streamKey}`);
  return mulberry32(seedGen());
}

function randomPermutation(n, rng) {
  const result = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function countFixedPoints(perm) {
  let count = 0;
  for (let i = 0; i < perm.length; i += 1) {
    if (perm[i] === i) {
      count += 1;
    }
  }
  return count;
}

function countInversions(perm) {
  let inversions = 0;
  for (let i = 0; i < perm.length; i += 1) {
    for (let j = i + 1; j < perm.length; j += 1) {
      if (perm[i] > perm[j]) {
        inversions += 1;
      }
    }
  }
  return inversions;
}

function countAdjacentSourceNeighbors(perm) {
  let count = 0;
  for (let i = 0; i < perm.length - 1; i += 1) {
    if (Math.abs(perm[i] - perm[i + 1]) === 1) {
      count += 1;
    }
  }
  return count;
}

function permutationScrambleScore(perm) {
  const inversions = countInversions(perm);
  const displacement = perm.reduce((sum, value, index) => sum + Math.abs(value - index), 0);
  return inversions * (perm.length + 1) + displacement;
}

function createStrongScramblePerm(n, rng) {
  const attemptBudget = n <= 6 ? 12000 : 8000;
  let bestStrict = null;
  let bestFallback = null;

  for (let attempt = 0; attempt < attemptBudget; attempt += 1) {
    const perm = randomPermutation(n, rng);
    if (countFixedPoints(perm) !== 0) {
      continue;
    }

    const score = permutationScrambleScore(perm);
    if (!bestFallback || score > bestFallback.score) {
      bestFallback = { perm, score };
    }

    if (countAdjacentSourceNeighbors(perm) !== 0) {
      continue;
    }

    if (!bestStrict || score > bestStrict.score) {
      bestStrict = { perm, score };
    }
  }

  if (bestStrict) {
    return bestStrict.perm;
  }

  if (bestFallback) {
    return bestFallback.perm;
  }

  return randomPermutation(n, rng);
}

function createEngine() {
  const puzzle = getPuzzleForMode("I");
  puzzle.n = gridSize;
  const scrambleKey = `${currentImageSeedKey}|n:${gridSize}`;
  const rowRng = createSeededRng(scrambleKey, "rows");
  const colRng = createSeededRng(scrambleKey, "cols");
  puzzle.startRowPerm = createStrongScramblePerm(gridSize, rowRng);
  puzzle.startColPerm = createStrongScramblePerm(gridSize, colRng);
  return new ModeImageEngine(puzzle, currentImageSource);
}

function configureBoardFromEngine() {
  boardView.ensureSize(engine.n);

  const bounds = boardView.getBounds();
  const pad = 0.5;
  const fitPadding = 1.12;
  const width = (bounds.maxX - bounds.minX + pad) * fitPadding;
  const height = (bounds.maxY - bounds.minY + pad) * fitPadding;
  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerY = (bounds.minY + bounds.maxY) * 0.5;

  const viewportW = boardRoot.clientWidth;
  const viewportH = Math.max(1, boardRoot.clientHeight);
  const aspect = viewportW / viewportH;

  let viewWidth = width;
  let viewHeight = height;

  if (aspect > width / height) {
    viewWidth = height * aspect;
  } else {
    viewHeight = width / aspect;
  }

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(centerX, centerY, 10);
  camera.lookAt(centerX, centerY, 0);
  camera.updateProjectionMatrix();

  renderer.setSize(viewportW, viewportH, true);
}

function updateMetrics() {
  const metrics = engine.getProgressMetrics();
  const minMoves = engine.getMinimumInsertMoves();
  movesValueEl.textContent = String(engine.moveCount);
  bestMovesValueEl.textContent = String(minMoves.total);
  bestMovesValueEl.title = `Rows ${minMoves.rowMin} + Cols ${minMoves.colMin}`;

  metricLabelEl.textContent = "Correct Tiles";
  metricValueEl.textContent = `${metrics.correctCells}/${metrics.total}`;
  metricSecondaryLabelEl.textContent = "Mismatches";
  metricSecondaryValueEl.textContent = String(metrics.mismatchCount);

  undoBtn.disabled = engine.historyStack.length === 0;
}

function updateWinOverlay() {
  if (isSolved()) {
    winOverlayEl.classList.remove("hidden");
    winTextEl.textContent = `Image restored in ${engine.moveCount} moves.`;
  } else {
    winOverlayEl.classList.add("hidden");
  }
}

function requestRender() {
  if (!engine || renderQueued) {
    return;
  }

  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    boardView.updateFromEngine(engine, { selectedHandle: null, hoveredHandle });
    renderer.render(scene, camera);

    if (boardView.hasActiveAnimations()) {
      requestRender();
    }
  });
}

function refreshUi() {
  updateMetrics();
  updateWinOverlay();
  requestRender();
}

function onReorderSuccess(kind, fromIndex, toIndex) {
  boardView.clearDragPreview();
  hoveredHandle = null;
  boardView.flashHandles(kind, fromIndex, toIndex);
}

function attemptReorder(kind, fromIndex, toIndex, source = "drag") {
  boardView.clearDragPreview();

  if (fromIndex === toIndex) {
    setStatus("No change: drop on a different row/column to count a move.", "neutral");
    refreshUi();
    return false;
  }

  if (isSolved()) {
    setStatus("Puzzle already solved. Reset to play again.", "good");
    refreshUi();
    return false;
  }

  if (!engine.canReorder(kind, fromIndex, toIndex)) {
    setStatus("Move blocked.", "warn");
    refreshUi();
    return false;
  }

  const success = engine.applyReorder(kind, fromIndex, toIndex);

  if (!success) {
    setStatus("Move blocked.", "warn");
    refreshUi();
    return false;
  }

  onReorderSuccess(kind, fromIndex, toIndex);
  const solved = isSolved();

  if (solved) {
    setStatus("Solved. All constraints satisfied.", "good");
  } else if (source === "drag") {
    setStatus(
      `${kind === "row" ? "Row" : "Column"} moved from ${fromIndex + 1} to ${toIndex + 1}.`,
      "neutral"
    );
  } else {
    setStatus(`${kind === "row" ? "Row" : "Column"} reordered.`, "neutral");
  }

  refreshUi();
  return true;
}

function handleHandleTap(kind, index) {
  if (isSolved()) {
    setStatus("Puzzle already solved. Reset to play again.", "good");
    return;
  }

  setStatus(
    `Drag ${kind === "row" ? `row ${index + 1}` : `column ${index + 1}`} to a new position, then release.`,
    "neutral"
  );
  requestRender();
}

function handleDragPreview(preview) {
  boardView.setDragPreview(preview);
  if (preview) {
    hoveredHandle = { kind: preview.kind, index: preview.toIndex };
  } else {
    hoveredHandle = null;
  }
}

function handleDragCommit(kind, fromIndex, toIndex) {
  return attemptReorder(kind, fromIndex, toIndex, "drag");
}

async function initializeGame() {
  let startupMessage = "Image mode loaded. Drag row/column headings to reorder strips.";
  let startupTone = "neutral";

  try {
    currentImageSource = await loadImageFromUrl(DEFAULT_IMAGE_URL.href);
    startupMessage = "Loaded default image: cat.png. Drag row/column headings to reorder strips.";
  } catch {
    currentImageSource = createDemoImage();
    startupMessage = "Could not load cat.png. Using built-in demo image.";
    startupTone = "warn";
  }

  engine = createEngine();
  hoveredHandle = null;
  boardView.clearDragPreview();

  configureBoardFromEngine();
  setStatus(startupMessage, startupTone);
  refreshUi();
}

function resetCurrentMode() {
  engine.reset();
  hoveredHandle = null;
  boardView.clearDragPreview();
  setStatus("Puzzle reset to start state.", "neutral");
  refreshUi();
}

function undoMove() {
  const undone = engine.undo();
  if (!undone) {
    setStatus("Nothing to undo.", "warn");
    refreshUi();
    return;
  }

  hoveredHandle = null;
  boardView.clearDragPreview();
  setStatus("Move undone.", "neutral");
  refreshUi();
}

function setCurrentImageSource(imageSource, message = "Image updated.") {
  currentImageSource = imageSource;

  engine = createEngine();
  hoveredHandle = null;
  boardView.clearDragPreview();
  configureBoardFromEngine();
  setStatus(`${message} New strong scramble generated.`, "neutral");
  refreshUi();
}

function setGridSize(nextSize) {
  const parsed = parseGridSize(nextSize);
  if (parsed === gridSize && engine) {
    return;
  }

  gridSize = parsed;
  if (gridSizeSelectEl) {
    gridSizeSelectEl.value = String(gridSize);
  }

  if (!engine) {
    return;
  }

  engine = createEngine();
  hoveredHandle = null;
  boardView.clearDragPreview();
  configureBoardFromEngine();
  setStatus(`Grid set to ${gridSize}x${gridSize}. New strong scramble generated.`, "neutral");
  refreshUi();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Selected file is not a readable image."));
      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image at ${url}`));
    image.src = url;
  });
}

const input = new InputController({
  domElement: renderer.domElement,
  camera,
  getTargets: () => boardView.getRaycastTargets(),
  getDropIndex: (kind, worldPoint) => boardView.getDropIndex(kind, worldPoint),
  onDragPreview: handleDragPreview,
  onReorderCommit: handleDragCommit,
  onHandleTap: handleHandleTap,
  onHoverHandle: (handle) => {
    hoveredHandle = handle;
  },
  requestRender
});

imageInputEl.addEventListener("change", async () => {
  const file = imageInputEl.files?.[0];
  if (!file) {
    return;
  }

  try {
    const image = await loadImageFromFile(file);
    setCurrentImageSource(image, `Loaded image: ${file.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load that image.";
    setStatus(message, "bad");
  } finally {
    imageInputEl.value = "";
  }
});

demoImageBtn.addEventListener("click", () => {
  setCurrentImageSource(createDemoImage(), "Switched to built-in demo image.");
});

gridSizeSelectEl?.addEventListener("change", () => {
  setGridSize(gridSizeSelectEl.value);
});

resetBtn.addEventListener("click", () => {
  resetCurrentMode();
});

undoBtn.addEventListener("click", () => {
  undoMove();
});

playAgainBtn.addEventListener("click", () => {
  resetCurrentMode();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z") {
    event.preventDefault();
    undoMove();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    resetCurrentMode();
  }
});

window.addEventListener("resize", () => {
  configureBoardFromEngine();
  requestRender();
});

window.addEventListener("beforeunload", () => {
  input.dispose();
  boardView.dispose();
  renderer.dispose();
});

initializeGame();
