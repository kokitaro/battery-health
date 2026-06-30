import { Routes, Route, Navigate } from "react-router-dom";
import { Landing } from "./Landing";
import { Workspace } from "./Workspace";

// Two-route shell:
//   /     → premium marketing Landing
//   /app  → the diagnostics Workspace (formerly the single-page app)
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
