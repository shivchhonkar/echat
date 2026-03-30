import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import WidgetPage from "./pages/WidgetPage";
import AdminPage from "./pages/AdminPage";
import TenantSignupPage from "./pages/TenantSignupPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import HomePage from "./pages/HomePage";
import ToastContainer from "./components/ToastContainer";

function RootEntry() {
  const location = useLocation();
  const isEmbedMode = new URLSearchParams(location.search).get("embed") === "1";
  return isEmbedMode ? <WidgetPage /> : <HomePage />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/widget" element={<WidgetPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/signup" element={<TenantSignupPage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
