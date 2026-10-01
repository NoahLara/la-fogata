export interface Debounced {
  /** Runs the function `wait` ms after the last call. */
  (): void;
  cancel(): void;
}

/** Trailing debounce: a burst of calls runs `fn` once, after the burst has been quiet for `wait` ms. */
export function debounce(fn: () => void, wait: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn();
    }, wait);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}
