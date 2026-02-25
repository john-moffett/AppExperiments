const ROWS = 7;
const COLS = 7;

const PIECE_LIBRARY = [
  { name: "Domino", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
  { name: "Line-3", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] },
  { name: "L-3", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { name: "Square", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { name: "Line-4", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
  { name: "L-4", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
  { name: "T-4", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] },
  { name: "Z-4", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { name: "P-5", cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }] },
  { name: "U-5", cells: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }
];

const COLORS = [
  "#3d8fb0",
  "#58a55c",
  "#d97f2f",
  "#c65744",
  "#2b9f9a",
  "#9f6dba",
  "#6e8f2f",
  "#3d6bb2",
  "#bb5b7a",
  "#4f8192"
];

const boardEl = document.getElementById("board");
const rowQuotasEl = document.getElementById("row-quotas");
const colQuotasEl = document.getElementById("col-quotas");
const trayEl = document.getElementById("tray");
const statusTextEl = document.getElementById("status-text");
const moveCountEl = document.getElementById("move-count");

const rotateBtn = document.getElementById("rotate-btn");
const flipBtn = document.getElementById("flip-btn");
const undoBtn = document.getElementById("undo-btn");
const newBtn = document.getElementById("new-btn");

const state = {
  rows: ROWS,
  cols: COLS,
  board: [],
  rowQuota: [],
  colQuota: [],
  rowRemaining: [],
  colRemaining: [],
  pieces: [],
  selectedPieceId: null,
  hover: null,
  undoStack: [],
  moves: 0,
  won: false,
  status: "",
  statusTone: "info",
  cellNodes: [],
  rowQuotaNodes: [],
  colQuotaNodes: []
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(list) {
  return list[randomInt(0, list.length - 1)];
}

function shuffle(list) {
  const clone = [...list];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function normalizeCells(cells) {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const normalized = cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));

  normalized.sort((a, b) => {
    if (a.y === b.y) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  return normalized;
}

function transformCells(baseCells, rotation, flipped) {
  let transformed = baseCells.map((cell) => ({ x: cell.x, y: cell.y }));

  if (flipped) {
    transformed = transformed.map((cell) => ({ x: -cell.x, y: cell.y }));
  }

  for (let i = 0; i < rotation; i += 1) {
    transformed = transformed.map((cell) => ({ x: cell.y, y: -cell.x }));
  }

  return normalizeCells(transformed);
}

function getDims(cells) {
  return {
    width: Math.max(...cells.map((cell) => cell.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.y)) + 1
  };
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      blocked: false,
      pieceId: null,
      color: ""
    }))
  );
}

function tryPlaceOnSolution(shapeCells, occupancy) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const rotation = randomInt(0, 3);
    const flipped = Math.random() < 0.5;
    const transformed = transformCells(shapeCells, rotation, flipped);
    const dims = getDims(transformed);

    const row = randomInt(0, state.rows - dims.height);
    const col = randomInt(0, state.cols - dims.width);

    let fits = true;
    for (const cell of transformed) {
      const r = row + cell.y;
      const c = col + cell.x;
      if (occupancy[r][c]) {
        fits = false;
        break;
      }
    }

    if (!fits) {
      continue;
    }

    for (const cell of transformed) {
      occupancy[row + cell.y][col + cell.x] = true;
    }

    return true;
  }

  return false;
}

function generatePuzzle() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const occupancy = Array.from({ length: state.rows }, () => Array.from({ length: state.cols }, () => false));
    const pickedPieces = [];
    const pieceCount = randomInt(8, 10);

    let failed = false;
    for (let i = 0; i < pieceCount; i += 1) {
      const shape = randomItem(PIECE_LIBRARY);
      const canonical = normalizeCells(shape.cells);
      const placed = tryPlaceOnSolution(canonical, occupancy);

      if (!placed) {
        failed = true;
        break;
      }

      pickedPieces.push({
        id: `piece-${i + 1}`,
        name: shape.name,
        cells: canonical,
        color: COLORS[i % COLORS.length]
      });
    }

    if (failed) {
      continue;
    }

    const rowQuota = occupancy.map((row) => row.filter(Boolean).length);
    const colQuota = Array.from({ length: state.cols }, (_, col) =>
      occupancy.reduce((sum, row) => sum + (row[col] ? 1 : 0), 0)
    );

    const totalFilled = rowQuota.reduce((sum, value) => sum + value, 0);
    const activeRows = rowQuota.filter((value) => value > 0).length;
    const activeCols = colQuota.filter((value) => value > 0).length;

    if (totalFilled < 20 || totalFilled > 32 || activeRows < 4 || activeCols < 4) {
      continue;
    }

    const blockedCells = [];
    const blockedInRow = Array.from({ length: state.rows }, () => 0);
    const blockedInCol = Array.from({ length: state.cols }, () => 0);

    const emptyCells = [];
    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        if (!occupancy[row][col]) {
          emptyCells.push({ row, col });
        }
      }
    }

    const targetBlocked = randomInt(4, 7);
    for (const cell of shuffle(emptyCells)) {
      if (blockedCells.length >= targetBlocked) {
        break;
      }

      const nextBlockedRow = blockedInRow[cell.row] + 1;
      const nextBlockedCol = blockedInCol[cell.col] + 1;
      const availableInRow = state.cols - nextBlockedRow;
      const availableInCol = state.rows - nextBlockedCol;

      if (availableInRow < rowQuota[cell.row] || availableInCol < colQuota[cell.col]) {
        continue;
      }

      blockedInRow[cell.row] = nextBlockedRow;
      blockedInCol[cell.col] = nextBlockedCol;
      blockedCells.push(cell);
    }

    return {
      rowQuota,
      colQuota,
      blockedCells,
      pieces: shuffle(pickedPieces)
    };
  }

  throw new Error("Unable to generate a puzzle with the current constraints.");
}

function buildBoardDom() {
  boardEl.innerHTML = "";
  rowQuotasEl.innerHTML = "";
  colQuotasEl.innerHTML = "";

  state.cellNodes = [];
  state.rowQuotaNodes = [];
  state.colQuotaNodes = [];

  boardEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;
  boardEl.style.gridTemplateRows = `repeat(${state.rows}, var(--cell-size))`;

  rowQuotasEl.style.gridTemplateRows = `repeat(${state.rows}, var(--cell-size))`;
  colQuotasEl.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell-size))`;

  for (let i = 0; i < state.cols; i += 1) {
    const quotaNode = document.createElement("div");
    quotaNode.className = "quota";
    colQuotasEl.appendChild(quotaNode);
    state.colQuotaNodes.push(quotaNode);
  }

  for (let i = 0; i < state.rows; i += 1) {
    const quotaNode = document.createElement("div");
    quotaNode.className = "quota";
    rowQuotasEl.appendChild(quotaNode);
    state.rowQuotaNodes.push(quotaNode);
  }

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cellNode = document.createElement("button");
      cellNode.type = "button";
      cellNode.className = "cell";
      cellNode.dataset.row = String(row);
      cellNode.dataset.col = String(col);
      cellNode.setAttribute("aria-label", `Board cell row ${row + 1}, col ${col + 1}`);

      cellNode.addEventListener("pointerenter", () => {
        state.hover = { row, col };
        render();
      });

      cellNode.addEventListener("click", () => {
        placeAt(row, col);
      });

      boardEl.appendChild(cellNode);
      state.cellNodes.push(cellNode);
    }
  }

  boardEl.onpointerleave = () => {
    state.hover = null;
    render();
  };
}

function initPuzzle() {
  const puzzle = generatePuzzle();

  state.board = createEmptyBoard(state.rows, state.cols);
  state.rowQuota = [...puzzle.rowQuota];
  state.colQuota = [...puzzle.colQuota];
  state.rowRemaining = [...puzzle.rowQuota];
  state.colRemaining = [...puzzle.colQuota];
  state.undoStack = [];
  state.moves = 0;
  state.hover = null;
  state.won = false;

  for (const blocked of puzzle.blockedCells) {
    state.board[blocked.row][blocked.col].blocked = true;
  }

  state.pieces = puzzle.pieces.map((piece) => ({
    ...piece,
    rotation: 0,
    flipped: false,
    placed: false,
    placedCells: []
  }));

  state.selectedPieceId = state.pieces.length ? state.pieces[0].id : null;
  setStatus("New puzzle generated. Keep all row and column quotas at or above zero.");

  buildBoardDom();
  render();
}

function setStatus(message, tone = "info") {
  state.status = message;
  state.statusTone = tone;
}

function getSelectedPiece() {
  return state.pieces.find((piece) => piece.id === state.selectedPieceId && !piece.placed) || null;
}

function getPieceCells(piece) {
  return transformCells(piece.cells, piece.rotation, piece.flipped);
}

function evaluatePlacement(cells, anchorRow, anchorCol) {
  const positionedCells = [];
  const rowDelta = Array.from({ length: state.rows }, () => 0);
  const colDelta = Array.from({ length: state.cols }, () => 0);

  let legal = true;
  let reason = "";

  for (const cell of cells) {
    const row = anchorRow + cell.y;
    const col = anchorCol + cell.x;

    if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) {
      legal = false;
      reason = "Out of bounds";
      continue;
    }

    positionedCells.push({ row, col });
  }

  for (const pos of positionedCells) {
    const boardCell = state.board[pos.row][pos.col];

    if (boardCell.blocked) {
      legal = false;
      reason = "Blocked cell";
    } else if (boardCell.pieceId) {
      legal = false;
      reason = "Overlaps a placed piece";
    }

    rowDelta[pos.row] += 1;
    colDelta[pos.col] += 1;
  }

  for (let row = 0; row < state.rows; row += 1) {
    if (state.rowRemaining[row] - rowDelta[row] < 0) {
      legal = false;
      reason = `Row ${row + 1} would go negative`;
      break;
    }
  }

  for (let col = 0; col < state.cols; col += 1) {
    if (state.colRemaining[col] - colDelta[col] < 0) {
      legal = false;
      reason = `Column ${col + 1} would go negative`;
      break;
    }
  }

  return {
    legal,
    reason,
    positionedCells,
    rowDelta,
    colDelta
  };
}

function placeAt(anchorRow, anchorCol) {
  if (state.won) {
    return;
  }

  const selected = getSelectedPiece();
  if (!selected) {
    setStatus("Pick an unplaced piece from the tray.", "warn");
    render();
    return;
  }

  const cells = getPieceCells(selected);
  const evaluation = evaluatePlacement(cells, anchorRow, anchorCol);

  if (!evaluation.legal) {
    setStatus(`Invalid placement: ${evaluation.reason}.`, "error");
    render();
    return;
  }

  for (const pos of evaluation.positionedCells) {
    state.board[pos.row][pos.col].pieceId = selected.id;
    state.board[pos.row][pos.col].color = selected.color;
  }

  selected.placed = true;
  selected.placedCells = evaluation.positionedCells;

  for (let row = 0; row < state.rows; row += 1) {
    state.rowRemaining[row] -= evaluation.rowDelta[row];
  }

  for (let col = 0; col < state.cols; col += 1) {
    state.colRemaining[col] -= evaluation.colDelta[col];
  }

  state.undoStack.push({
    pieceId: selected.id,
    cells: evaluation.positionedCells,
    rowDelta: evaluation.rowDelta,
    colDelta: evaluation.colDelta
  });

  state.moves += 1;
  const nextPiece = state.pieces.find((piece) => !piece.placed);
  state.selectedPieceId = nextPiece ? nextPiece.id : null;

  postMoveStatus();
  render();
}

function postMoveStatus() {
  if (isWin()) {
    state.won = true;
    setStatus("Solved. Every row and column quota is exactly zero.", "success");
    return;
  }

  if (!hasAnyLegalMove()) {
    setStatus("No legal moves left. Undo or generate a new puzzle.", "warn");
    return;
  }

  setStatus("Legal placement. Keep balancing both axes.", "info");
}

function isWin() {
  return state.rowRemaining.every((value) => value === 0) && state.colRemaining.every((value) => value === 0);
}

function canPlaceQuick(cells, anchorRow, anchorCol) {
  const rowDelta = Array.from({ length: state.rows }, () => 0);
  const colDelta = Array.from({ length: state.cols }, () => 0);

  for (const cell of cells) {
    const row = anchorRow + cell.y;
    const col = anchorCol + cell.x;

    if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) {
      return false;
    }

    const boardCell = state.board[row][col];
    if (boardCell.blocked || boardCell.pieceId) {
      return false;
    }

    rowDelta[row] += 1;
    colDelta[col] += 1;
  }

  for (let row = 0; row < state.rows; row += 1) {
    if (state.rowRemaining[row] - rowDelta[row] < 0) {
      return false;
    }
  }

  for (let col = 0; col < state.cols; col += 1) {
    if (state.colRemaining[col] - colDelta[col] < 0) {
      return false;
    }
  }

  return true;
}

function hasAnyLegalMove() {
  if (state.won) {
    return true;
  }

  const remaining = state.pieces.filter((piece) => !piece.placed);
  if (!remaining.length) {
    return false;
  }

  for (const piece of remaining) {
    for (let flipState = 0; flipState < 2; flipState += 1) {
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const transformed = transformCells(piece.cells, rotation, Boolean(flipState));
        const dims = getDims(transformed);

        for (let row = 0; row <= state.rows - dims.height; row += 1) {
          for (let col = 0; col <= state.cols - dims.width; col += 1) {
            if (canPlaceQuick(transformed, row, col)) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

function rotateSelected() {
  const selected = getSelectedPiece();
  if (!selected || state.won) {
    return;
  }

  selected.rotation = (selected.rotation + 1) % 4;
  setStatus(`Rotated ${selected.name}.`, "info");
  render();
}

function flipSelected() {
  const selected = getSelectedPiece();
  if (!selected || state.won) {
    return;
  }

  selected.flipped = !selected.flipped;
  setStatus(`Flipped ${selected.name}.`, "info");
  render();
}

function undoMove() {
  const latest = state.undoStack.pop();
  if (!latest) {
    setStatus("No move to undo.", "warn");
    render();
    return;
  }

  for (const pos of latest.cells) {
    state.board[pos.row][pos.col].pieceId = null;
    state.board[pos.row][pos.col].color = "";
  }

  for (let row = 0; row < state.rows; row += 1) {
    state.rowRemaining[row] += latest.rowDelta[row];
  }

  for (let col = 0; col < state.cols; col += 1) {
    state.colRemaining[col] += latest.colDelta[col];
  }

  const piece = state.pieces.find((candidate) => candidate.id === latest.pieceId);
  if (piece) {
    piece.placed = false;
    piece.placedCells = [];
    state.selectedPieceId = piece.id;
  }

  state.moves = Math.max(0, state.moves - 1);
  state.won = false;
  setStatus("Move undone.", "info");
  render();
}

function quotaToneClass(value) {
  if (value === 0) {
    return "zero";
  }
  if (value <= 1) {
    return "critical";
  }
  return "";
}

function renderQuotas(preview) {
  for (let row = 0; row < state.rows; row += 1) {
    const node = state.rowQuotaNodes[row];
    const remaining = state.rowRemaining[row];
    const previewDelta = preview && preview.rowDelta ? preview.rowDelta[row] : 0;

    node.className = "quota";
    node.textContent = String(remaining);
    node.removeAttribute("data-predicted");

    const tone = quotaToneClass(remaining);
    if (tone) {
      node.classList.add(tone);
    }

    if (previewDelta > 0 && preview && preview.legal) {
      node.classList.add("preview", "predicted");
      node.setAttribute("data-predicted", `→${remaining - previewDelta}`);
    }
  }

  for (let col = 0; col < state.cols; col += 1) {
    const node = state.colQuotaNodes[col];
    const remaining = state.colRemaining[col];
    const previewDelta = preview && preview.colDelta ? preview.colDelta[col] : 0;

    node.className = "quota";
    node.textContent = String(remaining);
    node.removeAttribute("data-predicted");

    const tone = quotaToneClass(remaining);
    if (tone) {
      node.classList.add(tone);
    }

    if (previewDelta > 0 && preview && preview.legal) {
      node.classList.add("preview", "predicted");
      node.setAttribute("data-predicted", `→${remaining - previewDelta}`);
    }
  }
}

function renderBoard(preview) {
  const previewKeys = new Set((preview ? preview.positionedCells : []).map((cell) => `${cell.row},${cell.col}`));

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const index = row * state.cols + col;
      const node = state.cellNodes[index];
      const cell = state.board[row][col];

      node.className = "cell";
      node.style.background = "";
      node.dataset.hover = "false";

      if (cell.blocked) {
        node.classList.add("blocked");
      } else if (cell.pieceId) {
        node.classList.add("filled");
        node.style.background = cell.color;
      }

      if (state.hover && state.hover.row === row && state.hover.col === col) {
        node.dataset.hover = "true";
      }

      if (previewKeys.has(`${row},${col}`)) {
        node.classList.add(preview && preview.legal ? "preview-valid" : "preview-invalid");
      }
    }
  }
}

function renderTray() {
  trayEl.innerHTML = "";

  for (const piece of state.pieces) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "piece";
    if (piece.id === state.selectedPieceId && !piece.placed) {
      button.classList.add("selected");
    }
    if (piece.placed) {
      button.classList.add("placed");
    }

    const meta = document.createElement("div");
    meta.className = "piece-meta";

    const title = document.createElement("strong");
    title.textContent = piece.name;

    const subtitle = document.createElement("small");
    if (piece.placed) {
      subtitle.textContent = "locked";
    } else {
      subtitle.textContent = `${piece.cells.length} cells`;
    }

    meta.append(title, subtitle);

    const visibleCells = getPieceCells(piece);
    const dims = getDims(visibleCells);
    const activeKeys = new Set(visibleCells.map((cell) => `${cell.x},${cell.y}`));

    const mini = document.createElement("div");
    mini.className = "mini";
    mini.style.gridTemplateColumns = `repeat(${dims.width}, 11px)`;
    mini.style.gridTemplateRows = `repeat(${dims.height}, 11px)`;

    for (let row = 0; row < dims.height; row += 1) {
      for (let col = 0; col < dims.width; col += 1) {
        const miniCell = document.createElement("div");
        miniCell.className = "mini-cell";
        if (activeKeys.has(`${col},${row}`)) {
          miniCell.classList.add("on");
          miniCell.style.background = piece.color;
        }
        mini.appendChild(miniCell);
      }
    }

    button.append(meta, mini);

    button.addEventListener("click", () => {
      if (piece.placed) {
        return;
      }

      state.selectedPieceId = piece.id;
      setStatus(`Selected ${piece.name}.`, "info");
      render();
    });

    trayEl.appendChild(button);
  }
}

function renderStatus() {
  statusTextEl.textContent = state.status;
  moveCountEl.textContent = `Moves: ${state.moves}`;

  statusTextEl.style.color = "#203442";
  if (state.statusTone === "success") {
    statusTextEl.style.color = "#1f9d55";
  } else if (state.statusTone === "warn") {
    statusTextEl.style.color = "#9f5a10";
  } else if (state.statusTone === "error") {
    statusTextEl.style.color = "#b53e35";
  }
}

function getPreviewPlacement() {
  const selected = getSelectedPiece();
  if (!selected || !state.hover || state.won) {
    return null;
  }

  const cells = getPieceCells(selected);
  return evaluatePlacement(cells, state.hover.row, state.hover.col);
}

function render() {
  const preview = getPreviewPlacement();
  renderQuotas(preview);
  renderBoard(preview);
  renderTray();
  renderStatus();
}

rotateBtn.addEventListener("click", rotateSelected);
flipBtn.addEventListener("click", flipSelected);
undoBtn.addEventListener("click", undoMove);
newBtn.addEventListener("click", initPuzzle);

document.addEventListener("keydown", (event) => {
  const tag = event.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "r") {
    event.preventDefault();
    rotateSelected();
  } else if (key === "f") {
    event.preventDefault();
    flipSelected();
  } else if (key === "u") {
    event.preventDefault();
    undoMove();
  } else if (key === "n") {
    event.preventDefault();
    initPuzzle();
  }
});

initPuzzle();
