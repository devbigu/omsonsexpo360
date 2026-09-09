import { Navigate } from "react-router-dom";

export default function ProtectedSuperAdminRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  const isSuperAdmin = localStorage.getItem("superAdmin") === "true";

  if (!token || !isSuperAdmin) {
    return <Navigate to="/login" />;
  }

  return children;
}