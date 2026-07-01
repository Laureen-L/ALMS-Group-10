// Theme context placeholder. Tokens live in CSS variables (styles/tokens.css),
// so this only needs to exist if/when you add a dark mode toggle.
import { createContext, useContext } from "react";

const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={{ theme: "light" }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
