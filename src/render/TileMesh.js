import * as THREE from "three";

const DARK_STYLE = {
  background: "#141c26",
  matchBackground: "#1a2a1e",
  border: "rgba(100, 140, 170, 0.35)",
  borderHighlight: "rgba(34, 211, 238, 0.6)",
  borderMatch: "rgba(240, 180, 41, 0.7)",
  text: "#c8d6e0",
  textSecondary: "#8ba0b0",
  splitRowBackground: "#1a2028",
  splitColBackground: "#161e28",
  rowAccent: "#cd7f34",
  colAccent: "#347fa0",
  divider: "#2a3a48"
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

    this.shadowGeometry = new THREE.PlaneGeometry(cellSize * 1.06, cellSize * 1.06);
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.3,
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
    this.isMatch = false;
    this.shimmerPhase = 0;
    this.borderOpacity = 1;
  }

  drawSingleLetter(letter, style = {}) {
    this.lastDraw = { kind: "single", letter, style };
    this.isMatch = Boolean(style.useMatchBackground);
    this.drawFromLast();
  }

  drawSplitLetters(a, b, style = {}) {
    this.lastDraw = { kind: "split", a, b, style };
    this.isMatch = false;
    this.drawFromLast();
  }

  drawImageChunk(imageSource, srcRow, srcCol, n, style = {}) {
    this.lastDraw = { kind: "image", imageSource, srcRow, srcCol, n, style };
    this.isMatch = Boolean(style.useMatchBackground);
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
    const spread = 0.04 + clamped * 0.05;
    this.shadowMesh.position.set(spread, -spread, -0.06 - clamped * 0.1);
    this.shadowMaterial.opacity = 0.3 + clamped * 0.25;
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

  roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  drawSingle(letter, style) {
    const size = this.textureSize;
    const ctx = this.ctx;
    const r = size * 0.07;

    ctx.clearRect(0, 0, size, size);

    const bg = style.useMatchBackground ? DARK_STYLE.matchBackground : DARK_STYLE.background;
    ctx.fillStyle = bg;
    this.roundRectPath(ctx, 0, 0, size, size, r);
    ctx.fill();

    this.drawBorder(r);

    ctx.fillStyle = DARK_STYLE.text;
    ctx.font = `700 ${Math.floor(size * 0.58)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size * 0.5, size * 0.56);
  }

  drawSplit(a, b, style) {
    const size = this.textureSize;
    const ctx = this.ctx;
    const r = size * 0.07;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    this.roundRectPath(ctx, 0, 0, size, size, r);
    ctx.clip();

    let rowBg = DARK_STYLE.splitRowBackground;
    let colBg = DARK_STYLE.splitColBackground;
    if (style.emphasizeRow) rowBg = DARK_STYLE.rowAccent;
    if (style.emphasizeCol) colBg = DARK_STYLE.colAccent;

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

    ctx.strokeStyle = DARK_STYLE.divider;
    ctx.lineWidth = Math.max(4, Math.floor(size * 0.022));
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.restore();

    this.drawBorder(r);

    ctx.fillStyle = style.emphasizeRow ? "#ffffff" : DARK_STYLE.text;
    ctx.font = `700 ${Math.floor(size * 0.38)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(a, size * 0.29, size * 0.32);

    ctx.fillStyle = style.emphasizeCol ? "#ffffff" : DARK_STYLE.textSecondary;
    ctx.fillText(b, size * 0.71, size * 0.7);
  }

  drawImage(imageSource, srcRow, srcCol, n, style) {
    const size = this.textureSize;
    const ctx = this.ctx;
    const r = size * 0.07;

    ctx.clearRect(0, 0, size, size);

    if (!imageSource) {
      ctx.fillStyle = DARK_STYLE.background;
      this.roundRectPath(ctx, 0, 0, size, size, r);
      ctx.fill();
      this.drawBorder(r);
      ctx.fillStyle = DARK_STYLE.textSecondary;
      ctx.font = `700 ${Math.floor(size * 0.1)}px "Manrope", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No Image", size * 0.5, size * 0.52);
      return;
    }

    // Clip to rounded rect for image
    ctx.save();
    this.roundRectPath(ctx, 0, 0, size, size, r);
    ctx.clip();

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

    // Dark vignette overlay
    const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    // Match tint
    if (style.useMatchBackground) {
      ctx.fillStyle = "rgba(240, 180, 41, 0.06)";
      ctx.fillRect(0, 0, size, size);
    }

    ctx.restore();

    // Draw border (match tiles get golden shimmer, others get standard)
    if (style.useMatchBackground && this.borderOpacity > 0.01) {
      this.drawShimmerBorder(r);
    } else {
      this.drawBorder(r);
    }
  }

  drawBorder(r) {
    const size = this.textureSize;
    const ctx = this.ctx;
    const opacity = this.borderOpacity;
    if (opacity < 0.01) return;

    const color = this.highlighted ? DARK_STYLE.borderHighlight : DARK_STYLE.border;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.highlighted ? Math.max(10, Math.floor(size * 0.045)) : Math.max(6, Math.floor(size * 0.028));
    this.roundRectPath(ctx, 0, 0, size, size, r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawShimmerBorder(r) {
    const size = this.textureSize;
    const ctx = this.ctx;
    const opacity = this.borderOpacity;
    if (opacity < 0.01) return;

    const cx = size / 2;
    const cy = size / 2;
    const angle = this.shimmerPhase * Math.PI * 2;

    const grad = ctx.createConicGradient(angle, cx, cy);
    grad.addColorStop(0, "rgba(240, 180, 41, 0.9)");
    grad.addColorStop(0.25, "rgba(255, 220, 100, 1.0)");
    grad.addColorStop(0.5, "rgba(240, 180, 41, 0.6)");
    grad.addColorStop(0.75, "rgba(255, 200, 60, 1.0)");
    grad.addColorStop(1, "rgba(240, 180, 41, 0.9)");

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(8, Math.floor(size * 0.038));
    this.roundRectPath(ctx, 0, 0, size, size, r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
