import * as THREE from "three";
import { TileMesh } from "./TileMesh.js";
import { HandleMesh } from "./HandleMesh.js";

export class BoardView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.cellSize = options.cellSize ?? 1.0;
    this.gap = options.gap ?? 0.08;
    this.handleSize = options.handleSize ?? 0.6;
    this.handleGap = options.handleGap ?? 0.25;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.tiles = [];
    this.rowHandles = [];
    this.colHandles = [];

    this.raycastTargets = [];
    this.flashUntil = new Map();
    this.swapAnimation = null;

    this.n = 0;
    this.bounds = null;
  }

  rebuild(n) {
    this.disposeChildren();

    this.n = n;
    this.tiles = [];
    this.rowHandles = [];
    this.colHandles = [];
    this.raycastTargets = [];

    const boardW = n * this.cellSize + (n - 1) * this.gap;
    const originX = -boardW / 2 + this.cellSize / 2;
    const originY = boardW / 2 - this.cellSize / 2;

    this.bounds = {
      boardW,
      originX,
      originY,
      minX: originX - this.cellSize / 2 - this.handleGap - this.handleSize,
      maxX: originX + (n - 1) * (this.cellSize + this.gap) + this.cellSize / 2,
      minY: originY - (n - 1) * (this.cellSize + this.gap) - this.cellSize / 2,
      maxY: originY + this.cellSize / 2 + this.handleGap + this.handleSize
    };

    const tileGroup = new THREE.Group();
    tileGroup.name = "tiles";

    for (let r = 0; r < n; r += 1) {
      const row = [];
      for (let c = 0; c < n; c += 1) {
        const tile = new TileMesh(this.cellSize);
        const x = originX + c * (this.cellSize + this.gap);
        const y = originY - r * (this.cellSize + this.gap);
        tile.mesh.position.set(x, y, 0);
        tile.mesh.userData = { kind: "tile", row: r, col: c };
        row.push(tile);
        tileGroup.add(tile.mesh);
      }
      this.tiles.push(row);
    }

    const rowHandleGroup = new THREE.Group();
    rowHandleGroup.name = "row-handles";

    for (let r = 0; r < n; r += 1) {
      const handle = new HandleMesh(this.handleSize, `R${r + 1}`);
      const x = originX - (this.cellSize / 2 + this.handleGap + this.handleSize / 2);
      const y = originY - r * (this.cellSize + this.gap);
      handle.mesh.position.set(x, y, 0.1);
      handle.mesh.userData = { kind: "row", index: r };
      this.rowHandles.push(handle);
      this.raycastTargets.push(handle.mesh);
      rowHandleGroup.add(handle.mesh);
    }

    const colHandleGroup = new THREE.Group();
    colHandleGroup.name = "col-handles";

    for (let c = 0; c < n; c += 1) {
      const handle = new HandleMesh(this.handleSize, `C${c + 1}`);
      const x = originX + c * (this.cellSize + this.gap);
      const y = originY + (this.cellSize / 2 + this.handleGap + this.handleSize / 2);
      handle.mesh.position.set(x, y, 0.1);
      handle.mesh.userData = { kind: "col", index: c };
      this.colHandles.push(handle);
      this.raycastTargets.push(handle.mesh);
      colHandleGroup.add(handle.mesh);
    }

    this.root.add(tileGroup, rowHandleGroup, colHandleGroup);
  }

  ensureSize(n) {
    if (this.n !== n) {
      this.rebuild(n);
    }
  }

  getBounds() {
    return this.bounds;
  }

  getRaycastTargets() {
    return this.raycastTargets;
  }

  flashHandles(type, i, j, durationMs = 190) {
    const until = performance.now() + durationMs;
    this.flashUntil.set(`${type}:${i}`, until);
    this.flashUntil.set(`${type}:${j}`, until);
  }

  startSwapAnimation(kind, i, j, durationMs = 300) {
    this.swapAnimation = {
      kind,
      i,
      j,
      startTime: performance.now(),
      durationMs
    };
  }

  hasActiveAnimations() {
    if (!this.swapAnimation) {
      return false;
    }

    return performance.now() - this.swapAnimation.startTime < this.swapAnimation.durationMs;
  }

  updateFromEngine(engine, interactionState) {
    const hoveredHandle = interactionState.hoveredHandle;
    const selectedHandle = interactionState.selectedHandle;
    const now = performance.now();
    const step = this.cellSize + this.gap;

    this.updateHandleStates(this.rowHandles, "row", hoveredHandle, selectedHandle, now);
    this.updateHandleStates(this.colHandles, "col", hoveredHandle, selectedHandle, now);

    for (let r = 0; r < engine.n; r += 1) {
      for (let c = 0; c < engine.n; c += 1) {
        const tile = this.tiles[r][c];
        const motion = this.getSwapMotion(r, c, now);
        const baseX = this.bounds.originX + c * step;
        const baseY = this.bounds.originY - r * step;

        tile.mesh.position.set(baseX + motion.offsetX, baseY + motion.offsetY, motion.liftZ);
        tile.mesh.rotation.set(motion.rotX, motion.rotY, 0);
        tile.mesh.scale.set(1 + motion.scaleBoost, 1 + motion.scaleBoost, 1);
        tile.setDepth(motion.depthAmount);

        const cellData = engine.getCellRenderData(r, c);

        const activeHandle = hoveredHandle || selectedHandle;
        const highlight =
          activeHandle &&
          ((activeHandle.kind === "row" && activeHandle.index === r) ||
            (activeHandle.kind === "col" && activeHandle.index === c));

        tile.setHighlighted(Boolean(highlight));

        if (cellData.mode === "single") {
          tile.drawSingleLetter(cellData.letter, {
            useMatchBackground: Boolean(cellData.isMatch)
          });
        } else if (cellData.mode === "image") {
          tile.drawImageChunk(cellData.imageSource, cellData.srcRow, cellData.srcCol, cellData.n, {
            useMatchBackground: Boolean(cellData.isMatch)
          });
        } else {
          const emphasizeRow = hoveredHandle?.kind === "row" && hoveredHandle.index === r;
          const emphasizeCol = hoveredHandle?.kind === "col" && hoveredHandle.index === c;
          tile.drawSplitLetters(cellData.rowLetter, cellData.colLetter, {
            emphasizeRow,
            emphasizeCol
          });
        }
      }
    }
  }

  getSwapMotion(r, c, now) {
    const motion = {
      offsetX: 0,
      offsetY: 0,
      liftZ: 0,
      rotX: 0,
      rotY: 0,
      scaleBoost: 0,
      depthAmount: 0
    };

    if (!this.swapAnimation) {
      return motion;
    }

    const { kind, i, j, startTime, durationMs } = this.swapAnimation;
    const elapsed = now - startTime;
    if (elapsed >= durationMs) {
      this.swapAnimation = null;
      return motion;
    }

    const t = Math.max(0, Math.min(1, elapsed / durationMs));
    const eased = this.easeInOutCubic(t);
    const travel = 1 - eased;
    const hump = Math.sin(Math.PI * t);
    const step = this.cellSize + this.gap;

    let moving = false;
    if (kind === "row") {
      const delta = (j - i) * step;
      const sign = Math.sign(delta || 1);
      if (r === i) {
        motion.offsetY = -delta * travel;
        motion.rotX = 0.5 * hump * sign;
        moving = true;
      } else if (r === j) {
        motion.offsetY = delta * travel;
        motion.rotX = -0.5 * hump * sign;
        moving = true;
      }
    } else if (kind === "col") {
      const delta = (j - i) * step;
      const sign = Math.sign(delta || 1);
      if (c === i) {
        motion.offsetX = delta * travel;
        motion.rotY = -0.5 * hump * sign;
        moving = true;
      } else if (c === j) {
        motion.offsetX = -delta * travel;
        motion.rotY = 0.5 * hump * sign;
        moving = true;
      }
    }

    if (moving) {
      motion.liftZ = 0.36 * hump;
      motion.scaleBoost = 0.045 * hump;
      motion.depthAmount = hump;
    }

    return motion;
  }

  easeInOutCubic(t) {
    if (t < 0.5) {
      return 4 * t * t * t;
    }
    const f = -2 * t + 2;
    return 1 - (f * f * f) / 2;
  }

  updateHandleStates(handles, kind, hoveredHandle, selectedHandle, now) {
    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      const flashKey = `${kind}:${i}`;
      const flashUntil = this.flashUntil.get(flashKey) ?? 0;

      if (flashUntil < now) {
        this.flashUntil.delete(flashKey);
      }

      handle.setState({
        selected: selectedHandle?.kind === kind && selectedHandle.index === i,
        hovered: hoveredHandle?.kind === kind && hoveredHandle.index === i,
        flash: flashUntil >= now
      });
    }
  }

  disposeChildren() {
    const disposeGroup = (items) => {
      for (const item of items) {
        item.dispose();
        this.root.remove(item.mesh);
      }
    };

    for (const row of this.tiles) {
      for (const tile of row) {
        tile.dispose();
      }
    }

    this.tiles = [];
    this.swapAnimation = null;

    disposeGroup(this.rowHandles);
    disposeGroup(this.colHandles);
    this.rowHandles = [];
    this.colHandles = [];

    while (this.root.children.length) {
      this.root.remove(this.root.children[0]);
    }
  }

  dispose() {
    this.disposeChildren();
    this.scene.remove(this.root);
  }
}
