import * as THREE from "three";

const BASE_STYLE = {
  idleBg: "#e8eef2",
  hoverBg: "#d5ecf5",
  selectedBg: "#1d7596",
  selectedText: "#f7fcff",
  flashBg: "#f4d16f",
  border: "#6d8491",
  borderSelected: "#164f65",
  text: "#193340"
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
    const merged = {
      ...this.state,
      ...nextState
    };

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

    ctx.clearRect(0, 0, size, size);

    let bg = BASE_STYLE.idleBg;
    let textColor = BASE_STYLE.text;
    let border = BASE_STYLE.border;

    if (this.state.flash) {
      bg = BASE_STYLE.flashBg;
    }

    if (this.state.hovered) {
      bg = BASE_STYLE.hoverBg;
    }

    if (this.state.selected) {
      bg = BASE_STYLE.selectedBg;
      textColor = BASE_STYLE.selectedText;
      border = BASE_STYLE.borderSelected;
    }

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = border;
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, size, size);

    ctx.fillStyle = textColor;
    ctx.font = `700 ${Math.floor(size * 0.36)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, size * 0.5, size * 0.56);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
