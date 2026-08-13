// Hook — debounce a fast-changing value (search inputs).
// Returns the value only after it has stopped changing for `delay` ms,
// so a keystroke-per-request search settles into one request.
import { useEffect, useState } from "react";

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
