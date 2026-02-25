export class PuzzleBase {
  constructor(puzzle) {
    this.id = puzzle.id;
    this.n = puzzle.n;
    this.adjacentOnly = Boolean(puzzle.adjacentOnly);

    this.startRowPerm = [...puzzle.startRowPerm];
    this.startColPerm = [...puzzle.startColPerm];

    this.rowPerm = [...this.startRowPerm];
    this.colPerm = [...this.startColPerm];

    this.moveCount = 0;
    this.historyStack = [];
  }

  canSwap(type, i, j) {
    if (type !== "row" && type !== "col") {
      return false;
    }

    if (!Number.isInteger(i) || !Number.isInteger(j)) {
      return false;
    }

    if (i < 0 || i >= this.n || j < 0 || j >= this.n || i === j) {
      return false;
    }

    if (this.adjacentOnly && Math.abs(i - j) !== 1) {
      return false;
    }

    return true;
  }

  canReorder(type, fromIndex, toIndex) {
    if (type !== "row" && type !== "col") {
      return false;
    }

    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
      return false;
    }

    if (fromIndex < 0 || fromIndex >= this.n || toIndex < 0 || toIndex >= this.n) {
      return false;
    }

    return fromIndex !== toIndex;
  }

  applySwap(type, i, j) {
    if (!this.canSwap(type, i, j)) {
      return false;
    }

    const snapshot = this.createSnapshot();
    this.swapPerm(type, i, j);
    this.historyStack.push(snapshot);
    this.moveCount += 1;
    return true;
  }

  applyReorder(type, fromIndex, toIndex) {
    if (!this.canReorder(type, fromIndex, toIndex)) {
      return false;
    }

    const snapshot = this.createSnapshot();
    this.reorderPerm(type, fromIndex, toIndex);
    this.historyStack.push(snapshot);
    this.moveCount += 1;
    return true;
  }

  swapPerm(type, i, j) {
    const target = type === "row" ? this.rowPerm : this.colPerm;
    [target[i], target[j]] = [target[j], target[i]];
  }

  reorderPerm(type, fromIndex, toIndex) {
    const target = type === "row" ? this.rowPerm : this.colPerm;
    const [moved] = target.splice(fromIndex, 1);
    target.splice(toIndex, 0, moved);
  }

  createSnapshot() {
    return {
      rowPerm: [...this.rowPerm],
      colPerm: [...this.colPerm],
      moveCount: this.moveCount
    };
  }

  restoreSnapshot(snapshot) {
    this.rowPerm = [...snapshot.rowPerm];
    this.colPerm = [...snapshot.colPerm];
    this.moveCount = snapshot.moveCount;
  }

  undo() {
    if (!this.historyStack.length) {
      return false;
    }

    const snapshot = this.historyStack.pop();
    this.restoreSnapshot(snapshot);
    return true;
  }

  reset() {
    this.rowPerm = [...this.startRowPerm];
    this.colPerm = [...this.startColPerm];
    this.moveCount = 0;
    this.historyStack = [];
  }

  isIdentityPerm(perm) {
    return perm.every((value, index) => value === index);
  }

  isSolved() {
    throw new Error("isSolved must be implemented by subclass.");
  }

  getProgressMetrics() {
    throw new Error("getProgressMetrics must be implemented by subclass.");
  }
}
