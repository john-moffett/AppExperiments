import * as THREE from "three";
import { TileMesh } from "./TileMesh.js";
import { HandleMesh } from "./HandleMesh.js";
import { SpringVec3, Spring } from "./SpringSystem.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class BoardView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.cellSize = options.cellSize ?? 1.0;
    this.gap = options.gap ?? 0.04;
    this.handleSize = options.handleSize ?? 0.6;
    this.handleGap = options.handleGap ?? 0.25;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.hintOverlay = new THREE.Group();
    this.scene.add(this.hintOverlay);

    this.tiles = [];
    this.rowHandles = [];
    this.colHandles = [];

    this.tileSprings = []; // SpringVec3 per tile
    this.tileScaleSprings = []; // Spring per tile

    this.raycastTargets = [];
    this.flashUntil = new Map();
    this.dragPreview = null;
    this.hintMove = null;

    this.n = 0;
    this.bounds = null;
    this.shimmerTime = 0;
    this.winAnimating = false;

    this.hintLineMaterial = new THREE.LineBasicMaterial({
      color: 0xf0b429,
      transparent: true,
      opacity: 0.95
    });
    this.hintHeadMaterial = new THREE.MeshBasicMaterial({
      color: 0xf0b429,
      transparent: true,
      opacity: 0.95
    });
    this.hintHeadGeometry = new THREE.ConeGeometry(0.11, 0.26, 20);
    this.hintLineGeometry = new THREE.BufferGeometry();
    this.hintLine = new THREE.Line(this.hintLineGeometry, this.hintLineMaterial);
    this.hintHead = new THREE.Mesh(this.hintHeadGeometry, this.hintHeadMaterial);
    this.hintLine.position.z = 0.34;
    this.hintHead.position.z = 0.34;
    this.hintLine.visible = false;
    this.hintHead.visible = false;
    this.hintOverlay.add(this.hintLine, this.hintHead);
  }

  rebuild(n) {
    this.disposeChildren();

    this.n = n;
    this.tiles = [];
    this.rowHandles = [];
    this.colHandles = [];
    this.tileSprings = [];
    this.tileScaleSprings = [];
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

    const springOpts = { stiffness: 200, damping: 18, mass: 1 };

    for (let r = 0; r < n; r += 1) {
      const row = [];
      const springRow = [];
      const scaleRow = [];
      for (let c = 0; c < n; c += 1) {
        const tile = new TileMesh(this.cellSize);
        const x = originX + c * (this.cellSize + this.gap);
        const y = originY - r * (this.cellSize + this.gap);
        tile.mesh.position.set(x, y, 0);
        tile.mesh.userData = { kind: "tile", row: r, col: c };
        row.push(tile);
        tileGroup.add(tile.mesh);

        const spring = new SpringVec3(springOpts);
        spring.snap(x, y, 0);
        springRow.push(spring);

        const scaleSpr = new Spring({ stiffness: 180, damping: 16 });
        scaleSpr.snap(1);
        scaleRow.push(scaleSpr);
      }
      this.tiles.push(row);
      this.tileSprings.push(springRow);
      this.tileScaleSprings.push(scaleRow);
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

  getDropIndex(kind, worldPoint) {
    const step = this.cellSize + this.gap;
    if (kind === "row") {
      const relative = (this.bounds.originY - worldPoint.y) / step;
      return clamp(Math.round(relative), 0, this.n - 1);
    }
    const relative = (worldPoint.x - this.bounds.originX) / step;
    return clamp(Math.round(relative), 0, this.n - 1);
  }

  setDragPreview(preview) {
    this.dragPreview = preview;
  }

  clearDragPreview() {
    this.dragPreview = null;
  }

  setHintMove(hintMove) {
    this.hintMove = hintMove ? { ...hintMove } : null;
  }

  clearHint() {
    this.hintMove = null;
    this.hintLine.visible = false;
    this.hintHead.visible = false;
  }

  hasActiveAnimations() {
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        if (!this.tileSprings[r][c].isSettled()) return true;
        if (!this.tileScaleSprings[r][c].isSettled()) return true;
      }
    }
    // shimmer always active if any tiles are matched
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        if (this.tiles[r][c].isMatch) return true;
      }
    }
    return false;
  }

  animate(dt) {
    // Advance shimmer
    this.shimmerTime += dt;
    const shimmerPhase = (this.shimmerTime * 0.4) % 1;

    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const spring = this.tileSprings[r][c];
        const scaleSpr = this.tileScaleSprings[r][c];
        spring.advance(dt);
        scaleSpr.advance(dt);

        const tile = this.tiles[r][c];
        tile.mesh.position.set(spring.x.value, spring.y.value, spring.z.value);

        const s = scaleSpr.value;
        tile.mesh.scale.set(s, s, 1);

        // Update shimmer on match tiles
        if (tile.isMatch) {
          tile.shimmerPhase = shimmerPhase;
          tile.drawFromLast();
        }
      }
    }
  }

  reorderSprings(kind, fromIndex, toIndex) {
    if (kind === "row") {
      const movedSprings = this.tileSprings[fromIndex];
      const movedScaleSprings = this.tileScaleSprings[fromIndex];
      if (fromIndex < toIndex) {
        for (let r = fromIndex; r < toIndex; r++) {
          this.tileSprings[r] = this.tileSprings[r + 1];
          this.tileScaleSprings[r] = this.tileScaleSprings[r + 1];
        }
      } else {
        for (let r = fromIndex; r > toIndex; r--) {
          this.tileSprings[r] = this.tileSprings[r - 1];
          this.tileScaleSprings[r] = this.tileScaleSprings[r - 1];
        }
      }
      this.tileSprings[toIndex] = movedSprings;
      this.tileScaleSprings[toIndex] = movedScaleSprings;
    } else {
      for (let r = 0; r < this.n; r++) {
        const movedSpring = this.tileSprings[r][fromIndex];
        const movedScaleSpring = this.tileScaleSprings[r][fromIndex];
        if (fromIndex < toIndex) {
          for (let c = fromIndex; c < toIndex; c++) {
            this.tileSprings[r][c] = this.tileSprings[r][c + 1];
            this.tileScaleSprings[r][c] = this.tileScaleSprings[r][c + 1];
          }
        } else {
          for (let c = fromIndex; c > toIndex; c--) {
            this.tileSprings[r][c] = this.tileSprings[r][c - 1];
            this.tileScaleSprings[r][c] = this.tileScaleSprings[r][c - 1];
          }
        }
        this.tileSprings[r][toIndex] = movedSpring;
        this.tileScaleSprings[r][toIndex] = movedScaleSpring;
      }
    }
  }

  animateWinCollapse(onComplete) {
    this.winAnimating = true;

    // Set spring targets to gap=0 positions
    const step = this.cellSize; // no gap
    const boardW = this.n * this.cellSize;
    const originX = -boardW / 2 + this.cellSize / 2;
    const originY = boardW / 2 - this.cellSize / 2;

    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const x = originX + c * step;
        const y = originY - r * step;
        this.tileSprings[r][c].setTarget(x, y, 0);
      }
    }

    // Fade borders over 800ms
    let elapsed = 0;
    const fadeDuration = 0.8;
    const fadeInterval = setInterval(() => {
      elapsed += 1 / 60;
      const t = Math.min(elapsed / fadeDuration, 1);
      const opacity = 1 - t;
      for (let r = 0; r < this.n; r++) {
        for (let c = 0; c < this.n; c++) {
          this.tiles[r][c].borderOpacity = opacity;
          this.tiles[r][c].drawFromLast();
        }
      }
      if (t >= 1) {
        clearInterval(fadeInterval);
        this.winAnimating = false;
        if (onComplete) onComplete();
      }
    }, 1000 / 60);
  }

  resetBorderOpacity() {
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        this.tiles[r][c].borderOpacity = 1;
      }
    }
  }

  flashHandles(type, i, j, durationMs = 190) {
    const until = performance.now() + durationMs;
    this.flashUntil.set(`${type}:${i}`, until);
    this.flashUntil.set(`${type}:${j}`, until);
  }

  updateFromEngine(engine, interactionState) {
    const hoveredHandle = interactionState.hoveredHandle;
    const selectedHandle = interactionState.selectedHandle;
    const now = performance.now();
    const step = this.cellSize + this.gap;

    this.updateHandleStates(this.rowHandles, "row", hoveredHandle, selectedHandle, now);
    this.updateHandleStates(this.colHandles, "col", hoveredHandle, selectedHandle, now);
    this.renderHintArrow();

    for (let r = 0; r < engine.n; r += 1) {
      for (let c = 0; c < engine.n; c += 1) {
        const tile = this.tiles[r][c];
        const spring = this.tileSprings[r][c];
        const scaleSpr = this.tileScaleSprings[r][c];
        const motion = this.getDragMotion(r, c);
        const baseX = this.bounds.originX + c * step;
        const baseY = this.bounds.originY - r * step;

        // Set spring targets
        spring.setTarget(baseX + motion.offsetX, baseY + motion.offsetY, motion.liftZ);

        // For drag, snap directly (no spring delay on dragged tile)
        if (motion.depthAmount >= 0.9) {
          spring.snap(baseX + motion.offsetX, baseY + motion.offsetY, motion.liftZ);
        }

        tile.mesh.rotation.set(motion.rotX, motion.rotY, 0);
        scaleSpr.setTarget(1 + motion.scaleBoost);
        tile.setDepth(motion.depthAmount);

        const cellData = engine.getCellRenderData(r, c);

        const highlightFromDrag =
          this.dragPreview &&
          ((this.dragPreview.kind === "row" && this.dragPreview.fromIndex === r) ||
            (this.dragPreview.kind === "col" && this.dragPreview.fromIndex === c));

        const hintHandle = this.hintMove ? { kind: this.hintMove.kind, index: this.hintMove.fromIndex } : null;
        const activeHandle = hoveredHandle || selectedHandle || hintHandle;
        const highlightFromHover =
          activeHandle &&
          ((activeHandle.kind === "row" && activeHandle.index === r) ||
            (activeHandle.kind === "col" && activeHandle.index === c));

        const highlight = Boolean(highlightFromDrag || highlightFromHover);
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

  renderHintArrow() {
    const hint = this.hintMove;
    if (!hint || hint.fromIndex === hint.toIndex) {
      this.hintLine.visible = false;
      this.hintHead.visible = false;
      return;
    }

    const step = this.cellSize + this.gap;
    const source = new THREE.Vector3();
    const target = new THREE.Vector3();

    if (hint.kind === "row") {
      const baseX = this.bounds.originX - (this.cellSize / 2 + this.handleGap + this.handleSize / 2);
      source.set(baseX - this.handleSize * 0.82, this.bounds.originY - hint.fromIndex * step, 0);
      target.set(baseX - this.handleSize * 0.82, this.bounds.originY - hint.toIndex * step, 0);
    } else {
      const baseY = this.bounds.originY + (this.cellSize / 2 + this.handleGap + this.handleSize / 2);
      source.set(this.bounds.originX + hint.fromIndex * step, baseY + this.handleSize * 0.82, 0);
      target.set(this.bounds.originX + hint.toIndex * step, baseY + this.handleSize * 0.82, 0);
    }

    const direction = target.clone().sub(source);
    const distance = direction.length();
    if (distance < 0.001) {
      this.hintLine.visible = false;
      this.hintHead.visible = false;
      return;
    }

    direction.normalize();
    const lineInset = Math.min(0.18, distance * 0.3);
    const lineStart = source.clone().addScaledVector(direction, lineInset);
    const lineEnd = target.clone().addScaledVector(direction, -lineInset);

    this.hintLineGeometry.setFromPoints([lineStart, lineEnd]);
    this.hintLine.visible = true;

    const headLength = 0.26;
    this.hintHead.position.copy(target).addScaledVector(direction, -headLength * 0.5);
    this.hintHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.hintHead.visible = true;
  }

  getDragMotion(r, c) {
    const motion = {
      offsetX: 0,
      offsetY: 0,
      liftZ: 0,
      rotX: 0,
      rotY: 0,
      scaleBoost: 0,
      depthAmount: 0
    };

    if (!this.dragPreview) {
      return motion;
    }

    const step = this.cellSize + this.gap;
    const { kind, fromIndex, toIndex } = this.dragPreview;

    if (kind === "row") {
      const baseFromY = this.bounds.originY - fromIndex * step;
      const minY = this.bounds.originY - (this.n - 1) * step;
      const maxY = this.bounds.originY;
      const desiredY = clamp(this.dragPreview.pointerY, minY, maxY);
      const freeOffset = desiredY - baseFromY;

      if (r === fromIndex) {
        motion.offsetY = freeOffset;
        motion.liftZ = 0.46;
        motion.scaleBoost = 0.06;
        motion.depthAmount = 1;
        motion.rotX = clamp((-freeOffset / step) * 0.22, -0.55, 0.55);
      } else if (fromIndex < toIndex && r > fromIndex && r <= toIndex) {
        motion.offsetY = step;
        motion.liftZ = 0.05;
        motion.depthAmount = 0.18;
      } else if (fromIndex > toIndex && r >= toIndex && r < fromIndex) {
        motion.offsetY = -step;
        motion.liftZ = 0.05;
        motion.depthAmount = 0.18;
      }
    } else if (kind === "col") {
      const baseFromX = this.bounds.originX + fromIndex * step;
      const minX = this.bounds.originX;
      const maxX = this.bounds.originX + (this.n - 1) * step;
      const desiredX = clamp(this.dragPreview.pointerX, minX, maxX);
      const freeOffset = desiredX - baseFromX;

      if (c === fromIndex) {
        motion.offsetX = freeOffset;
        motion.liftZ = 0.46;
        motion.scaleBoost = 0.06;
        motion.depthAmount = 1;
        motion.rotY = clamp((freeOffset / step) * 0.22, -0.55, 0.55);
      } else if (fromIndex < toIndex && c > fromIndex && c <= toIndex) {
        motion.offsetX = -step;
        motion.liftZ = 0.05;
        motion.depthAmount = 0.18;
      } else if (fromIndex > toIndex && c >= toIndex && c < fromIndex) {
        motion.offsetX = step;
        motion.liftZ = 0.05;
        motion.depthAmount = 0.18;
      }
    }

    return motion;
  }

  updateHandleStates(handles, kind, hoveredHandle, selectedHandle, now) {
    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      const flashKey = `${kind}:${i}`;
      const flashUntil = this.flashUntil.get(flashKey) ?? 0;

      if (flashUntil < now) {
        this.flashUntil.delete(flashKey);
      }

      const dragSelected = this.dragPreview?.kind === kind && this.dragPreview.fromIndex === i;
      const dragTarget = this.dragPreview?.kind === kind && this.dragPreview.toIndex === i;
      const hintSelected = this.hintMove?.kind === kind && this.hintMove.fromIndex === i;
      const hintTarget = this.hintMove?.kind === kind && this.hintMove.toIndex === i;

      handle.setState({
        selected: Boolean(selectedHandle?.kind === kind && selectedHandle.index === i) || dragSelected || hintSelected,
        hovered: Boolean(hoveredHandle?.kind === kind && hoveredHandle.index === i) || dragTarget || hintTarget,
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
    this.tileSprings = [];
    this.tileScaleSprings = [];

    disposeGroup(this.rowHandles);
    disposeGroup(this.colHandles);
    this.rowHandles = [];
    this.colHandles = [];
    this.dragPreview = null;
    this.clearHint();

    while (this.root.children.length) {
      this.root.remove(this.root.children[0]);
    }
  }

  dispose() {
    this.disposeChildren();
    this.scene.remove(this.root);
    this.scene.remove(this.hintOverlay);
    this.hintLineGeometry.dispose();
    this.hintLineMaterial.dispose();
    this.hintHeadGeometry.dispose();
    this.hintHeadMaterial.dispose();
  }
}
