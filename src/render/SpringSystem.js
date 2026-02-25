export class Spring {
  constructor({ stiffness = 180, damping = 16, mass = 1 } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.value = 0;
    this.target = 0;
    this.velocity = 0;
  }

  setTarget(t) {
    this.target = t;
  }

  snap(v) {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  isSettled(threshold = 0.0005) {
    return (
      Math.abs(this.value - this.target) < threshold &&
      Math.abs(this.velocity) < threshold
    );
  }

  advance(dt) {
    const displacement = this.value - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
  }
}

export class SpringVec3 {
  constructor(options) {
    this.x = new Spring(options);
    this.y = new Spring(options);
    this.z = new Spring(options);
  }

  setTarget(x, y, z) {
    this.x.setTarget(x);
    this.y.setTarget(y);
    this.z.setTarget(z);
  }

  snap(x, y, z) {
    this.x.snap(x);
    this.y.snap(y);
    this.z.snap(z);
  }

  isSettled(threshold) {
    return (
      this.x.isSettled(threshold) &&
      this.y.isSettled(threshold) &&
      this.z.isSettled(threshold)
    );
  }

  advance(dt) {
    this.x.advance(dt);
    this.y.advance(dt);
    this.z.advance(dt);
  }
}
