import { Navigate, Route, Routes } from "react-router-dom";
import WidgetPage from "./pages/WidgetPage";
import AdminPage from "./pages/AdminPage";
import TenantSignupPage from "./pages/TenantSignupPage";
import SuperAdminPage from "./pages/SuperAdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WidgetPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/signup" element={<TenantSignupPage />} />
      <Route path="/super-admin" element={<SuperAdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
