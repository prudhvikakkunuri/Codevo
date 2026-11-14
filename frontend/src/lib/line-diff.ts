/**
 * Computes 1-indexed line numbers in currentText that differ from baselineText.
 * Uses a standard Longest Common Subsequence (LCS) algorithm on lines.
 */
export function computeChangedLineNumbers(baselineText: string, currentText: string): number[] {
  if (baselineText === currentText) {
    return [];
  }

  const baseLines = baselineText.split(/\r?\n/);
  const currLines = currentText.split(/\r?\n/);

  const n = baseLines.length;
  const m = currLines.length;

  if (n === 0) {
    return Array.from({ length: m }, (_, i) => i + 1);
  }
  if (m === 0) {
    return [];
  }

  // Optimize for simple prefix and suffix matching
  let prefixMatch = 0;
  while (prefixMatch < n && prefixMatch < m && baseLines[prefixMatch] === currLines[prefixMatch]) {
    prefixMatch++;
  }

  let suffixMatch = 0;
  while (
    suffixMatch < n - prefixMatch &&
    suffixMatch < m - prefixMatch &&
    baseLines[n - 1 - suffixMatch] === currLines[m - 1 - suffixMatch]
  ) {
    suffixMatch++;
  }

  const middleBase = baseLines.slice(prefixMatch, n - suffixMatch);
  const middleCurr = currLines.slice(prefixMatch, m - suffixMatch);

  const subN = middleBase.length;
  const subM = middleCurr.length;

  if (subN === 0) {
    // All middleCurr lines are newly inserted
    const changed: number[] = [];
    for (let i = 0; i < subM; i++) {
      changed.push(prefixMatch + i + 1);
    }
    return changed;
  }

  if (subM === 0) {
    // Lines deleted; mark the line right before or at prefixMatch
    return prefixMatch > 0 ? [prefixMatch] : [1];
  }

  // 2D LCS table for the differing middle block
  const dp: number[][] = Array.from({ length: subN + 1 }, () => new Array(subM + 1).fill(0));

  for (let i = 1; i <= subN; i++) {
    for (let j = 1; j <= subM; j++) {
      if (middleBase[i - 1] === middleCurr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to identify which lines in middleCurr were kept
  const keptInCurr = new Set<number>();
  let i = subN;
  let j = subM;

  while (i > 0 && j > 0) {
    if (middleBase[i - 1] === middleCurr[j - 1]) {
      keptInCurr.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const changedLines: number[] = [];
  for (let k = 0; k < subM; k++) {
    if (!keptInCurr.has(k)) {
      changedLines.push(prefixMatch + k + 1);
    }
  }

  // If only deletions occurred in middle block, indicate the boundary line
  if (changedLines.length === 0 && subN > 0) {
    const boundary = prefixMatch + 1;
    changedLines.push(boundary <= m ? boundary : m);
  }

  return changedLines;
}

