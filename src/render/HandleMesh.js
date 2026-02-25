import * as THREE from "three";

const DARK_STYLE = {
  idleBg: "rgba(18, 28, 40, 0.7)",
  idleBorder: "rgba(100, 140, 170, 0.25)",
  hoverBg: "rgba(34, 211, 238, 0.08)",
  hoverBorder: "rgba(34, 211, 238, 0.45)",
  selectedBg: "rgba(34, 211, 238, 0.15)",
  selectedBorder: "rgba(34, 211, 238, 0.8)",
  flashBg: "rgba(240, 180, 41, 0.15)",
  flashBorder: "rgba(240, 180, 41, 0.7)",
  idleText: "rgba(180, 200, 215, 0.7)",
  selectedText: "#22d3ee",
  flashText: "#f0b429"
};

export class HandleMesh {
  constructor(size, label) {
    this.size = size;
    this.label = label;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 192;
    this.canvas.height = 192;
    this.ctx = this.canvas.getContext("2d");

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.geometry = new THREE.PlaneGeometry(size, size);
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.state = {
      selected: false,
      hovered: false,
      flash: false
    };

    this.redraw();
  }

  setLabel(label) {
    if (this.label === label) {
      return;
    }
    this.label = label;
    this.redraw();
  }

  setState(nextState) {
    const merged = { ...this.state, ...nextState };
    if (
      merged.selected === this.state.selected &&
      merged.hovered === this.state.hovered &&
      merged.flash === this.state.flash
    ) {
      return;
    }
    this.state = merged;
    this.redraw();
  }

  redraw() {
    const size = this.canvas.width;
    const ctx = this.ctx;
    const r = size * 0.35;

    ctx.clearRect(0, 0, size, size);

    let bg = DARK_STYLE.idleBg;
    let borderColor = DARK_STYLE.idleBorder;
    let textColor = DARK_STYLE.idleText;
    let glowBlur = 0;

    if (this.state.hovered) {
      bg = DARK_STYLE.hoverBg;
      borderColor = DARK_STYLE.hoverBorder;
      textColor = DARK_STYLE.selectedText;
    }

    if (this.state.selected) {
      bg = DARK_STYLE.selectedBg;
      borderColor = DARK_STYLE.selectedBorder;
      textColor = DARK_STYLE.selectedText;
      glowBlur = 16;
    }

    if (this.state.flash) {
      bg = DARK_STYLE.flashBg;
      borderColor = DARK_STYLE.flashBorder;
      textColor = DARK_STYLE.flashText;
      glowBlur = 20;
    }

    // Pill shape background
    ctx.beginPath();
    ctx.roundRect(4, 4, size - 8, size - 8, r);

    ctx.fillStyle = bg;
    ctx.fill();

    // Glow effect for selected/flash
    if (glowBlur > 0) {
      ctx.save();
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = glowBlur;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Label text
    ctx.fillStyle = textColor;
    ctx.font = `700 ${Math.floor(size * 0.34)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, size * 0.5, size * 0.54);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
