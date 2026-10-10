/** Characters as people count them: an emoji or an accented letter is one, not two. */
export function textLength(text: string): number {
  return Array.from(text).length;
}
