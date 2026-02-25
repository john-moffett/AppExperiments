import * as THREE from "three";

const DEFAULT_STYLE = {
  background: "#f2f7fa",
  matchBackground: "#dbf4e4",
  splitRowBackground: "#f2efe8",
  splitColBackground: "#e8f1f7",
  border: "#6d8491",
  borderHighlight: "#196f8f",
  divider: "#48606d",
  text: "#15303b",
  textSecondary: "#2b4c5a",
  rowAccent: "#cd7f34",
  colAccent: "#347fa0"
};

export class TileMesh {
  constructor(cellSize, textureSize = 256) {
    this.cellSize = cellSize;
    this.textureSize = textureSize;
    this.canvas = document.createElement("canvas");
    this.canvas.width = textureSize;
    this.canvas.height = textureSize;
    this.ctx = this.canvas.getContext("2d");

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.geometry = new THREE.PlaneGeometry(cellSize, cellSize);
    this.faceMesh = new THREE.Mesh(this.geometry, this.material);
    this.faceMesh.position.z = 0.02;

    this.shadowGeometry = new THREE.PlaneGeometry(cellSize * 1.035, cellSize * 1.035);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: "#091017",
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    this.shadowMesh = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    this.shadowMesh.position.set(0.04, -0.04, -0.06);

    this.mesh = new THREE.Group();
    this.mesh.add(this.shadowMesh);
    this.mesh.add(this.faceMesh);

    this.highlighted = false;
    this.depthAmount = 0;
    this.lastDraw = null;
  }

  drawSingleLetter(letter, style = {}) {
    this.lastDraw = { kind: "single", letter, style };
    this.drawFromLast();
  }

  drawSplitLetters(a, b, style = {}) {
    this.lastDraw = { kind: "split", a, b, style };
    this.drawFromLast();
  }

  drawImageChunk(imageSource, srcRow, srcCol, n, style = {}) {
    this.lastDraw = { kind: "image", imageSource, srcRow, srcCol, n, style };
    this.drawFromLast();
  }

  setHighlighted(highlighted) {
    if (this.highlighted === highlighted) {
      return;
    }

    this.highlighted = highlighted;
    this.drawFromLast();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.shadowGeometry.dispose();
    this.shadowMaterial.dispose();
    this.texture.dispose();
  }

  setDepth(amount) {
    const clamped = Math.max(0, Math.min(1, amount));
    if (Math.abs(clamped - this.depthAmount) < 0.0001) {
      return;
    }

    this.depthAmount = clamped;
    const spread = 0.04 + clamped * 0.03;
    this.shadowMesh.position.set(spread, -spread, -0.06 - clamped * 0.08);
    this.shadowMaterial.opacity = 0.14 + clamped * 0.2;
  }

  drawFromLast() {
    if (!this.lastDraw) {
      return;
    }

    if (this.lastDraw.kind === "single") {
      this.drawSingle(this.lastDraw.letter, this.lastDraw.style);
    } else if (this.lastDraw.kind === "split") {
      this.drawSplit(this.lastDraw.a, this.lastDraw.b, this.lastDraw.style);
    } else {
      this.drawImage(this.lastDraw.imageSource, this.lastDraw.srcRow, this.lastDraw.srcCol, this.lastDraw.n, this.lastDraw.style);
    }

    this.texture.needsUpdate = true;
  }

  drawSingle(letter, style) {
    const s = { ...DEFAULT_STYLE, ...style };
    const size = this.textureSize;
    const ctx = this.ctx;

    const bg = style.useMatchBackground ? s.matchBackground : s.background;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    this.drawBorder(s);

    ctx.fillStyle = s.text;
    ctx.font = `700 ${Math.floor(size * 0.58)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size * 0.5, size * 0.56);
  }

  drawSplit(a, b, style) {
    const s = { ...DEFAULT_STYLE, ...style };
    const size = this.textureSize;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, size, size);

    let rowBg = s.splitRowBackground;
    let colBg = s.splitColBackground;

    if (style.emphasizeRow) {
      rowBg = s.rowAccent;
    }

    if (style.emphasizeCol) {
      colBg = s.colAccent;
    }

    ctx.fillStyle = rowBg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colBg;
    ctx.beginPath();
    ctx.moveTo(size, size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = s.divider;
    ctx.lineWidth = Math.max(4, Math.floor(size * 0.022));
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();

    this.drawBorder(s);

    ctx.fillStyle = style.emphasizeRow ? "#ffffff" : s.text;
    ctx.font = `700 ${Math.floor(size * 0.38)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a, size * 0.29, size * 0.32);

    ctx.fillStyle = style.emphasizeCol ? "#ffffff" : s.textSecondary;
    ctx.fillText(b, size * 0.71, size * 0.7);
  }

  drawImage(imageSource, srcRow, srcCol, n, style) {
    const s = { ...DEFAULT_STYLE, ...style };
    const size = this.textureSize;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, size, size);

    if (!imageSource) {
      ctx.fillStyle = s.background;
      ctx.fillRect(0, 0, size, size);
      this.drawBorder(s);
      ctx.fillStyle = s.textSecondary;
      ctx.font = `700 ${Math.floor(size * 0.1)}px "Manrope", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No Image", size * 0.5, size * 0.52);
      return;
    }

    const imageWidth = imageSource.width;
    const imageHeight = imageSource.height;

    const cropSize = Math.min(imageWidth, imageHeight);
    const cropOffsetX = (imageWidth - cropSize) * 0.5;
    const cropOffsetY = (imageHeight - cropSize) * 0.5;
    const tileSize = cropSize / n;

    const sx = cropOffsetX + srcCol * tileSize;
    const sy = cropOffsetY + srcRow * tileSize;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageSource, sx, sy, tileSize, tileSize, 0, 0, size, size);

    if (style.useMatchBackground) {
      ctx.fillStyle = "rgba(27, 138, 77, 0.10)";
      ctx.fillRect(0, 0, size, size);
    }

    this.drawBorder(s);
  }

  drawBorder(style) {
    const size = this.textureSize;
    const ctx = this.ctx;

    ctx.strokeStyle = this.highlighted ? style.borderHighlight : style.border;
    ctx.lineWidth = this.highlighted ? Math.max(10, Math.floor(size * 0.045)) : Math.max(6, Math.floor(size * 0.03));
    ctx.strokeRect(0, 0, size, size);
  }
}
