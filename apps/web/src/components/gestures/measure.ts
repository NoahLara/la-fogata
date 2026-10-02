/** The sheet and its writing area as they are on screen: what the folding paper needs to look the same. All in CSS pixels. */
export interface PaperMeasure {
  /** The sheet's size before it was tilted. */
  width: number;
  height: number;
  /** The writing area, from the sheet's top left. */
  text: {
    left: number;
    top: number;
    width: number;
    height: number;
    /** How far the writing has scrolled up inside the area. */
    scrollTop: number;
    fontPx: number;
    lineHeightPx: number;
  };
}

export function measurePaper(paper: HTMLElement, field: HTMLTextAreaElement): PaperMeasure {
  const style = getComputedStyle(field);
  return {
    width: paper.offsetWidth,
    height: paper.offsetHeight,
    text: {
      left: field.offsetLeft,
      top: field.offsetTop,
      width: field.clientWidth,
      height: field.clientHeight,
      scrollTop: field.scrollTop,
      fontPx: parseFloat(style.fontSize),
      lineHeightPx: parseFloat(style.lineHeight),
    },
  };
}
