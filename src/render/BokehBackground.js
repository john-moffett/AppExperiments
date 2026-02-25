import * as THREE from "three";

function createCircleTexture(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class BokehBackground {
  constructor(count = 50, spread = 8) {
    this.count = count;
    this.spread = spread;
    this.texture = createCircleTexture();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);

    const warmColors = [
      new THREE.Color("#f0b429"),
      new THREE.Color("#f59e0b"),
      new THREE.Color("#d97706")
    ];
    const coolColors = [
      new THREE.Color("#22d3ee"),
      new THREE.Color("#06b6d4"),
      new THREE.Color("#3b82f6")
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 2] = -1.5;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.15;
      this.velocities[i * 3 + 1] = Math.random() * 0.08 + 0.02;
      this.velocities[i * 3 + 2] = 0;

      const isWarm = Math.random() > 0.5;
      const palette = isWarm ? warmColors : coolColors;
      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 8 + Math.random() * 18;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      map: this.texture,
      size: 0.25,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(dt) {
    const positions = this.geometry.attributes.position.array;
    const limit = this.spread;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] += this.velocities[i * 3] * dt;
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;

      if (positions[i * 3] > limit) positions[i * 3] = -limit;
      if (positions[i * 3] < -limit) positions[i * 3] = limit;
      if (positions[i * 3 + 1] > limit) positions[i * 3 + 1] = -limit;
      if (positions[i * 3 + 1] < -limit) positions[i * 3 + 1] = limit;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
