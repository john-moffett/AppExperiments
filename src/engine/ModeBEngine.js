import { PuzzleBase } from "./PuzzleBase.js";

export class ModeBEngine extends PuzzleBase {
  constructor(puzzle) {
    super(puzzle);
    this.rowWords = [...puzzle.rowWords];
    this.colWords = [...puzzle.colWords];
    this.progressOnlySwaps = Boolean(puzzle.progressOnlySwaps);
  }

  getRowLetter(r, c) {
    return this.rowWords[this.rowPerm[r]][c];
  }

  getColLetter(r, c) {
    return this.colWords[this.colPerm[c]][r];
  }

  isMatch(r, c) {
    return this.getRowLetter(r, c) === this.getColLetter(r, c);
  }

  getCellRenderData(r, c) {
    const rowLetter = this.getRowLetter(r, c);
    const colLetter = this.getColLetter(r, c);
    const match = rowLetter === colLetter;

    if (match) {
      return {
        mode: "single",
        letter: rowLetter,
        isMatch: true
      };
    }

    return {
      mode: "split",
      rowLetter,
      colLetter,
      isMatch: false
    };
  }

  getProgressMetrics() {
    let mismatchCount = 0;

    for (let r = 0; r < this.n; r += 1) {
      for (let c = 0; c < this.n; c += 1) {
        if (!this.isMatch(r, c)) {
          mismatchCount += 1;
        }
      }
    }

    const total = this.n * this.n;

    return {
      mismatchCount,
      matchedCount: total - mismatchCount,
      splitTilesCount: mismatchCount,
      total
    };
  }

  applySwap(type, i, j) {
    if (!this.canSwap(type, i, j)) {
      return false;
    }

    const snapshot = this.createSnapshot();
    const before = this.getProgressMetrics().mismatchCount;

    this.swapPerm(type, i, j);

    if (this.progressOnlySwaps) {
      const after = this.getProgressMetrics().mismatchCount;
      if (after >= before) {
        this.restoreSnapshot(snapshot);
        return false;
      }
    }

    this.historyStack.push(snapshot);
    this.moveCount += 1;
    return true;
  }

  isSolved() {
    return this.getProgressMetrics().mismatchCount === 0;
  }
}
