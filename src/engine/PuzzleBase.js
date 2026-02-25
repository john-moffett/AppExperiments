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

  reorderPermCopy(perm, fromIndex, toIndex) {
    const next = [...perm];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  countFixedPoints(perm) {
    let count = 0;
    for (let i = 0; i < perm.length; i += 1) {
      if (perm[i] === i) {
        count += 1;
      }
    }
    return count;
  }

  countDisplacement(perm) {
    let displacement = 0;
    for (let i = 0; i < perm.length; i += 1) {
      displacement += Math.abs(perm[i] - i);
    }
    return displacement;
  }

  minInsertMovesForPerm(perm) {
    const tails = [];

    for (let i = 0; i < perm.length; i += 1) {
      const value = perm[i];
      let lo = 0;
      let hi = tails.length;

      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (tails[mid] < value) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }

      tails[lo] = value;
    }

    return perm.length - tails.length;
  }

  getMinimumInsertMoves() {
    const rowMin = this.minInsertMovesForPerm(this.rowPerm);
    const colMin = this.minInsertMovesForPerm(this.colPerm);

    return {
      rowMin,
      colMin,
      total: rowMin + colMin
    };
  }

  findOptimalInsertHintForPerm(perm) {
    const currentMin = this.minInsertMovesForPerm(perm);
    if (currentMin === 0) {
      return null;
    }

    let best = null;

    for (let fromIndex = 0; fromIndex < perm.length; fromIndex += 1) {
      for (let toIndex = 0; toIndex < perm.length; toIndex += 1) {
        if (fromIndex === toIndex) {
          continue;
        }

        const nextPerm = this.reorderPermCopy(perm, fromIndex, toIndex);
        const nextMin = this.minInsertMovesForPerm(nextPerm);
        const improvesBy = currentMin - nextMin;

        if (improvesBy <= 0) {
          continue;
        }

        const candidate = {
          fromIndex,
          toIndex,
          currentMin,
          nextMin,
          improvesBy,
          fixedPoints: this.countFixedPoints(nextPerm),
          displacement: this.countDisplacement(nextPerm)
        };

        if (!best || this.isBetterHintCandidate(candidate, best)) {
          best = candidate;
        }
      }
    }

    return best;
  }

  isBetterHintCandidate(a, b) {
    if (a.improvesBy !== b.improvesBy) {
      return a.improvesBy > b.improvesBy;
    }

    if (a.fixedPoints !== b.fixedPoints) {
      return a.fixedPoints > b.fixedPoints;
    }

    if (a.displacement !== b.displacement) {
      return a.displacement < b.displacement;
    }

    if (a.fromIndex !== b.fromIndex) {
      return a.fromIndex < b.fromIndex;
    }

    return a.toIndex < b.toIndex;
  }

  getOptimalInsertHint() {
    const mins = this.getMinimumInsertMoves();
    if (mins.total === 0) {
      return null;
    }

    const rowHint = this.findOptimalInsertHintForPerm(this.rowPerm);
    const colHint = this.findOptimalInsertHintForPerm(this.colPerm);

    if (!rowHint && !colHint) {
      return null;
    }

    const rowCandidate = rowHint
      ? {
          kind: "row",
          ...rowHint
        }
      : null;
    const colCandidate = colHint
      ? {
          kind: "col",
          ...colHint
        }
      : null;

    let chosen = rowCandidate ?? colCandidate;

    if (rowCandidate && colCandidate) {
      if (this.isBetterAxisHint(colCandidate, rowCandidate, mins)) {
        chosen = colCandidate;
      }
    }

    const rowMinAfter = chosen.kind === "row" ? chosen.nextMin : mins.rowMin;
    const colMinAfter = chosen.kind === "col" ? chosen.nextMin : mins.colMin;

    return {
      kind: chosen.kind,
      fromIndex: chosen.fromIndex,
      toIndex: chosen.toIndex,
      improvesBy: chosen.improvesBy,
      currentTotal: mins.total,
      nextTotal: rowMinAfter + colMinAfter,
      rowMinAfter,
      colMinAfter
    };
  }

  isBetterAxisHint(a, b, mins) {
    if (a.improvesBy !== b.improvesBy) {
      return a.improvesBy > b.improvesBy;
    }

    const aAxisMin = a.kind === "row" ? mins.rowMin : mins.colMin;
    const bAxisMin = b.kind === "row" ? mins.rowMin : mins.colMin;
    if (aAxisMin !== bAxisMin) {
      return aAxisMin > bAxisMin;
    }

    if (a.fixedPoints !== b.fixedPoints) {
      return a.fixedPoints > b.fixedPoints;
    }

    if (a.kind !== b.kind) {
      return a.kind === "row";
    }

    if (a.fromIndex !== b.fromIndex) {
      return a.fromIndex < b.fromIndex;
    }

    return a.toIndex < b.toIndex;
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
