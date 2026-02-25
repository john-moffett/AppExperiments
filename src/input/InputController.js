import * as THREE from "three";

export class InputController {
  constructor({ domElement, camera, getTargets, onHandleClick, onDragReleaseSwap, onHoverHandle, requestRender }) {
    this.domElement = domElement;
    this.camera = camera;
    this.getTargets = getTargets;
    this.onHandleClick = onHandleClick;
    this.onDragReleaseSwap = onDragReleaseSwap;
    this.onHoverHandle = onHoverHandle;
    this.requestRender = requestRender;

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.worldPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.worldPoint = new THREE.Vector3();

    this.pointerDown = false;
    this.downHandle = null;
    this.dragStart = new THREE.Vector3();
    this.dragged = false;

    this.dragThreshold = 0.35;

    this.boundPointerDown = (event) => this.onPointerDown(event);
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerUp = (event) => this.onPointerUp(event);
    this.boundPointerLeave = () => this.onPointerLeave();

    this.domElement.addEventListener("pointerdown", this.boundPointerDown);
    this.domElement.addEventListener("pointermove", this.boundPointerMove);
    this.domElement.addEventListener("pointerup", this.boundPointerUp);
    this.domElement.addEventListener("pointercancel", this.boundPointerUp);
    this.domElement.addEventListener("pointerleave", this.boundPointerLeave);
  }

  dispose() {
    this.domElement.removeEventListener("pointerdown", this.boundPointerDown);
    this.domElement.removeEventListener("pointermove", this.boundPointerMove);
    this.domElement.removeEventListener("pointerup", this.boundPointerUp);
    this.domElement.removeEventListener("pointercancel", this.boundPointerUp);
    this.domElement.removeEventListener("pointerleave", this.boundPointerLeave);
  }

  onPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const hit = this.pickHandle(event);
    this.pointerDown = Boolean(hit);
    this.downHandle = hit;
    this.dragged = false;

    if (hit) {
      this.domElement.setPointerCapture(event.pointerId);
      this.getWorldPoint(event, this.dragStart);
    }
  }

  onPointerMove(event) {
    const hover = this.pickHandle(event);
    this.onHoverHandle(hover);

    if (!this.pointerDown || !this.downHandle) {
      this.requestRender();
      return;
    }

    if (!this.getWorldPoint(event, this.worldPoint)) {
      return;
    }

    const dx = this.worldPoint.x - this.dragStart.x;
    const dy = this.worldPoint.y - this.dragStart.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= this.dragThreshold) {
      this.dragged = true;
    }

    this.requestRender();
  }

  onPointerUp(event) {
    if (this.pointerDown && this.downHandle) {
      const upHandle = this.pickHandle(event);
      const droppedOnCompatibleHandle =
        upHandle &&
        upHandle.kind === this.downHandle.kind &&
        upHandle.index !== this.downHandle.index;

      if (droppedOnCompatibleHandle) {
        this.onDragReleaseSwap(this.downHandle.kind, this.downHandle.index, upHandle.index);
      } else if (!this.dragged) {
        this.onHandleClick(this.downHandle.kind, this.downHandle.index);
      }
    }

    if (this.domElement.hasPointerCapture(event.pointerId)) {
      this.domElement.releasePointerCapture(event.pointerId);
    }

    this.pointerDown = false;
    this.downHandle = null;
    this.dragged = false;
    this.requestRender();
  }

  onPointerLeave() {
    if (!this.pointerDown) {
      this.onHoverHandle(null);
      this.requestRender();
    }
  }

  pickHandle(event) {
    this.updatePointerNdc(event);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const hits = this.raycaster.intersectObjects(this.getTargets(), false);
    if (!hits.length) {
      return null;
    }

    const data = hits[0].object.userData;
    if (!data || (data.kind !== "row" && data.kind !== "col")) {
      return null;
    }

    return {
      kind: data.kind,
      index: data.index
    };
  }

  getWorldPoint(event, out) {
    this.updatePointerNdc(event);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.ray.intersectPlane(this.worldPlane, out);
  }

  updatePointerNdc(event) {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerNdc.set(x, y);
  }
}
