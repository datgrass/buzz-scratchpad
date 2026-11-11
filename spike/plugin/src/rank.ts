/*
 * MIT License
 * 
 * Copyright (c) 2026 oloapiu
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Fractional ranking: base-36 strings ordered lexicographically. Inserting
// between two ranks never renumbers neighbors. "" means unbounded on that
// side, so rankBetween("", "") seeds the first rank.

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function rankBetween(a: string, b: string): string {
  let result = "";
  let low = a;
  let high = b;
  let i = 0;
  for (;;) {
    const da = i < low.length ? DIGITS.indexOf(low[i]) : 0;
    const db = i < high.length ? DIGITS.indexOf(high[i]) : DIGITS.length;
    if (da === db) {
      result += DIGITS[da];
      i++;
      continue;
    }
    const mid = Math.floor((da + db) / 2);
    if (mid > da) {
      return result + DIGITS[mid];
    }
    // adjacent digits: take the low digit; from here only the low tail
    // constrains us (prefix is already strictly below the high bound)
    result += DIGITS[da];
    high = "";
    i++;
  }
}
