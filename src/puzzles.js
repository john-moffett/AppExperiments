const MODE_A_PUZZLE = {
  id: "modeA_demo_01",
  n: 5,
  solutionRows: ["MODEL", "OPERA", "DELAY", "ERASE", "LAYER"],
  startRowPerm: [2, 0, 4, 1, 3],
  startColPerm: [4, 1, 0, 3, 2],
  adjacentOnly: false
};

const MODE_B_PUZZLE = {
  id: "modeB_demo_01",
  n: 5,
  rowWords: ["SCROD", "ERASE", "LOGIA", "ANGEL", "HEART"],
  colWords: ["SELAH", "CRONE", "RAGGA", "OSIER", "DEALT"],
  startRowPerm: [3, 1, 4, 0, 2],
  startColPerm: [2, 4, 1, 3, 0],
  adjacentOnly: false,
  progressOnlySwaps: false
};

const MODE_IMAGE_PUZZLE = {
  id: "modeImage_demo_01",
  n: 5,
  startRowPerm: [2, 0, 4, 1, 3],
  startColPerm: [4, 1, 0, 3, 2],
  adjacentOnly: false
};

function clonePuzzle(puzzle) {
  return {
    ...puzzle,
    solutionRows: puzzle.solutionRows ? [...puzzle.solutionRows] : undefined,
    rowWords: puzzle.rowWords ? [...puzzle.rowWords] : undefined,
    colWords: puzzle.colWords ? [...puzzle.colWords] : undefined,
    startRowPerm: [...puzzle.startRowPerm],
    startColPerm: [...puzzle.startColPerm]
  };
}

export function getPuzzleForMode(mode) {
  if (mode === "B") {
    return clonePuzzle(MODE_B_PUZZLE);
  }

  if (mode === "I") {
    return clonePuzzle(MODE_IMAGE_PUZZLE);
  }

  return clonePuzzle(MODE_A_PUZZLE);
}
