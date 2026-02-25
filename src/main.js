import * as THREE from "three";
import { getPuzzleForMode } from "./puzzles.js";
import { ModeImageEngine } from "./engine/ModeImageEngine.js";
import { BoardView } from "./render/BoardView.js";
import { InputController } from "./input/InputController.js";

const imageInputEl = document.getElementById("image-input");
const demoImageBtn = document.getElementById("demo-image-btn");
const resetBtn = document.getElementById("reset-btn");
const undoBtn = document.getElementById("undo-btn");
const playAgainBtn = document.getElementById("play-again-btn");

const movesValueEl = document.getElementById("moves-value");
const metricLabelEl = document.getElementById("metric-label");
const metricValueEl = document.getElementById("metric-value");
const metricSecondaryLabelEl = document.getElementById("metric-secondary-label");
const metricSecondaryValueEl = document.getElementById("metric-secondary-value");

const statusTextEl = document.getElementById("status-text");
const winOverlayEl = document.getElementById("win-overlay");
const winTextEl = document.getElementById("win-text");

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
let selectedHandle = null;
let hoveredHandle = null;
let renderQueued = false;

let currentImageSource = createDemoImage();

function createDemoImage(size = 1200) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

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
    const x = cx - bodyW * 0.4 + (Math.random() * bodyW * 0.8);
    const y = cy - bodyH * 0.22 + (Math.random() * bodyH * 0.45);
    ctx.beginPath();
    ctx.ellipse(x, y, bodyW * 0.027, bodyH * 0.022, Math.random() * Math.PI, 0, Math.PI * 2);
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

function isSolved() {
  return engine?.isSolved() ?? false;
}

function randomPermutation(n) {
  const result = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
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

function createStrongScramblePerm(n) {
  const maxInversions = (n * (n - 1)) / 2;
  const minInversions = Math.max(1, Math.floor(maxInversions * 0.7));

  for (let attempt = 0; attempt < 3000; attempt += 1) {
    const perm = randomPermutation(n);
    if (countFixedPoints(perm) !== 0) {
      continue;
    }
    if (countInversions(perm) < minInversions) {
      continue;
    }
    return perm;
  }

  return randomPermutation(n);
}

function createEngine() {
  const puzzle = getPuzzleForMode("I");
  puzzle.startRowPerm = createStrongScramblePerm(puzzle.n);
  puzzle.startColPerm = createStrongScramblePerm(puzzle.n);
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
  movesValueEl.textContent = String(engine.moveCount);

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
    boardView.updateFromEngine(engine, { selectedHandle, hoveredHandle });
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

function onSwapSuccess(kind, i, j) {
  boardView.flashHandles(kind, i, j);
  boardView.startSwapAnimation(kind, i, j);
  requestRender();
}

function attemptSwap(kind, i, j, source = "click") {
  if (isSolved()) {
    setStatus("Puzzle already solved. Reset to play again.", "good");
    return false;
  }

  if (!engine.canSwap(kind, i, j)) {
    if (engine.adjacentOnly) {
      setStatus("Swap blocked: adjacent swaps only.", "warn");
    } else {
      setStatus("Swap blocked.", "warn");
    }
    return false;
  }

  const success = engine.applySwap(kind, i, j);

  if (!success) {
    setStatus("Swap blocked.", "warn");
    refreshUi();
    return false;
  }

  onSwapSuccess(kind, i, j);
  const solved = isSolved();

  if (solved) {
    setStatus("Solved. All constraints satisfied.", "good");
  } else if (source === "drag") {
    setStatus(`${kind === "row" ? "Row" : "Column"} swapped by drag.`, "neutral");
  } else {
    setStatus(`${kind === "row" ? "Row" : "Column"} swapped.`, "neutral");
  }

  refreshUi();
  return true;
}

function handleHandleClick(kind, index) {
  if (isSolved()) {
    setStatus("Puzzle already solved. Reset to play again.", "good");
    return;
  }

  if (!selectedHandle) {
    selectedHandle = { kind, index };
    setStatus(`${kind === "row" ? "Row" : "Column"} ${index + 1} selected.`, "neutral");
    refreshUi();
    return;
  }

  if (selectedHandle.kind !== kind) {
    selectedHandle = { kind, index };
    setStatus(`Switched selection to ${kind} ${index + 1}.`, "neutral");
    refreshUi();
    return;
  }

  if (selectedHandle.index === index) {
    selectedHandle = null;
    setStatus("Selection cleared.", "neutral");
    refreshUi();
    return;
  }

  const i = selectedHandle.index;
  const j = index;
  selectedHandle = null;

  attemptSwap(kind, i, j, "click");
}

function handleDragReleaseSwap(kind, fromIndex, toIndex) {
  selectedHandle = null;
  const success = attemptSwap(kind, fromIndex, toIndex, "drag");
  return success;
}

function initializeGame() {
  engine = createEngine();
  selectedHandle = null;
  hoveredHandle = null;

  configureBoardFromEngine();
  setStatus("Image mode loaded. Tap two row/column handles or drag between two headings to swap strips.", "neutral");
  refreshUi();
}

function resetCurrentMode() {
  engine.reset();
  selectedHandle = null;
  hoveredHandle = null;
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

  selectedHandle = null;
  setStatus("Move undone.", "neutral");
  refreshUi();
}

function setCurrentImageSource(imageSource, message = "Image updated.") {
  currentImageSource = imageSource;

  engine = createEngine();
  selectedHandle = null;
  hoveredHandle = null;
  configureBoardFromEngine();
  setStatus(`${message} New strong scramble generated.`, "neutral");
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

const input = new InputController({
  domElement: renderer.domElement,
  camera,
  getTargets: () => boardView.getRaycastTargets(),
  onHandleClick: handleHandleClick,
  onDragReleaseSwap: handleDragReleaseSwap,
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
