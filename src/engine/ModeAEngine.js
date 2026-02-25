import { PuzzleBase } from "./PuzzleBase.js";

export class ModeAEngine extends PuzzleBase {
  constructor(puzzle) {
    super(puzzle);
    this.solutionRows = [...puzzle.solutionRows];
    this.solutionGrid = this.solutionRows.map((word) => word.split(""));
  }

  getLetter(r, c) {
    return this.solutionGrid[this.rowPerm[r]][this.colPerm[c]];
  }

  isCellCorrect(r, c) {
    return this.getLetter(r, c) === this.solutionGrid[r][c];
  }

  getCellRenderData(r, c) {
    return {
      mode: "single",
      letter: this.getLetter(r, c),
      isMatch: this.isCellCorrect(r, c)
    };
  }

  getProgressMetrics() {
    let correctCells = 0;

    for (let r = 0; r < this.n; r += 1) {
      for (let c = 0; c < this.n; c += 1) {
        if (this.isCellCorrect(r, c)) {
          correctCells += 1;
        }
      }
    }

    const total = this.n * this.n;

    return {
      correctCells,
      mismatchCount: total - correctCells,
      total
    };
  }

  isSolved() {
    return this.isIdentityPerm(this.rowPerm) && this.isIdentityPerm(this.colPerm);
  }
}
