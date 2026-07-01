// App root — providers + router. This is the top of the tree.
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import AppRoutes from "./routes/index.jsx";
import DevRoleSwitcher from "./components/DevRoleSwitcher.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <DevRoleSwitcher />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}