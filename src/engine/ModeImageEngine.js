import { PuzzleBase } from "./PuzzleBase.js";

export class ModeImageEngine extends PuzzleBase {
  constructor(puzzle, imageSource) {
    super(puzzle);
    this.imageSource = imageSource;
  }

  setImageSource(imageSource) {
    this.imageSource = imageSource;
  }

  getCellRenderData(r, c) {
    return {
      mode: "image",
      srcRow: this.rowPerm[r],
      srcCol: this.colPerm[c],
      n: this.n,
      imageSource: this.imageSource,
      isMatch: this.rowPerm[r] === r && this.colPerm[c] === c
    };
  }

  getProgressMetrics() {
    let correctCells = 0;

    for (let r = 0; r < this.n; r += 1) {
      for (let c = 0; c < this.n; c += 1) {
        if (this.rowPerm[r] === r && this.colPerm[c] === c) {
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
