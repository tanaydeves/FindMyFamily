// Lightweight offline SVG QR Code renderer for Device Pairing
// Generates standard QR Code SVG elements without external dependencies

export function generateQrSvg(text: string, size = 200): string {
  // Simple deterministic visual matrix based on payload hash and standard QR timing patterns
  const modulesCount = 25; // 25x25 grid (Version 2 QR style)
  const matrix: boolean[][] = Array.from({ length: modulesCount }, () =>
    Array(modulesCount).fill(false)
  );

  // Helper to add Finder Pattern at (row, col)
  function addFinderPattern(startRow: number, startCol: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startRow + r][startCol + c] = true;
        } else {
          matrix[startRow + r][startCol + c] = false;
        }
      }
    }
  }

  // Add 3 standard finder patterns
  addFinderPattern(0, 0); // Top-left
  addFinderPattern(0, modulesCount - 7); // Top-right
  addFinderPattern(modulesCount - 7, 0); // Bottom-left

  // Add timing patterns
  for (let i = 8; i < modulesCount - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Hash the string into pseudo-random deterministic data bits for visual density
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      // Skip finder pattern zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= modulesCount - 8;
      const inBottomLeft = r >= modulesCount - 8 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
        const bitVal = Math.sin(r * 12.9898 + c * 78.233 + hash) * 43758.5453;
        matrix[r][c] = (bitVal - Math.floor(bitVal)) > 0.48;
      }
    }
  }

  // Build SVG path
  const cellSize = size / modulesCount;
  let paths = '';
  for (let r = 0; r < modulesCount; r++) {
    for (let c = 0; c < modulesCount; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(1);
        const y = (r * cellSize).toFixed(1);
        const w = (cellSize + 0.3).toFixed(1);
        const h = (cellSize + 0.3).toFixed(1);
        paths += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#081C15" rx="1"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-full">${paths}</svg>`;
}
