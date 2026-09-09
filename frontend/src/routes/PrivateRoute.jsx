import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AccessDenied from "../components/AccessDenied";
import { checkAccess } from "../services/api";

export default function PrivateRoute({ children }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");

  useEffect(() => {
    let mounted = true;

    if (adminToken) {
      setHasAccess(true);
      setLoading(false);
      return;
    }

    if (!token) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const verifyAccess = async () => {
      try {
        const res = await checkAccess();
        if (!mounted) return;
        setHasAccess(res.hasAccess || false);
      } catch {
        if (!mounted) return;
        setHasAccess(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    verifyAccess();

    return () => {
      mounted = false;
    };
  }, [token, adminToken]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "40px" }}>
        <div className="loader" />
      </div>
    );
  }

  if (!token && !adminToken) {
    return <Navigate to="/login" />;
  }

  if (hasAccess === false && !adminToken) {
    return <AccessDenied />;
  }

  return children;
}