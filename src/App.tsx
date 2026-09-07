import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Explorer from "./pages/Explorer";
import RequireAuth from "./components/RequireAuth";
import PublicLayout from "./components/layout/PublicLayout";
import Legal from "./pages/Legal";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy-policy" element={<Legal kind="privacy" />} />
          <Route path="/terms-of-service" element={<Legal kind="terms" />} />
        </Route>
        <Route
          path="/explorer"
          element={
            <RequireAuth>
              <Explorer />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
