import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";

import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import BusinessCard from "./components/BusinessCard";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Profile from "./components/Profile";
import Admin from "./components/Admin";
import SuperAdminPanel from "./components/SuperAdminPanel";
import ExhibitionForm from "./components/ExhibitionForm";

import HeaderNav from "./components/HeaderNav";
import PrivateRoute from "./routes/PrivateRoute";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import ProtectedSuperAdminRoute from "./routes/ProtectedSuperAdminRoute";

import { getCurrentUser, checkAccess } from "./services/api";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const hideHeaderRoutes = ["/login", "/signup"];

  const [activeExhibition, setActiveExhibition] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      const currentToken = localStorage.getItem("token");
      const adminToken = localStorage.getItem("adminToken");
      const isSuperAdmin = localStorage.getItem("superAdmin") === "true";

      if (currentToken) {
        try {
          const res = await getCurrentUser();
          setUserName(res.data?.name || null);
        } catch {
          setUserName(null);
        }
      } else if (adminToken) {
        setUserName(isSuperAdmin ? "Super Admin" : "Admin");
      } else {
        setUserName(null);
      }
    };

    loadUserInfo();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("superAdmin");

    setToken(null);
    setUserName(null);

    navigate("/login");
  };

  const handleLogin = async (newToken, role, email) => {
    if (role === "admin") {
      localStorage.setItem("adminToken", newToken);

      if (email === "superadmin@bizcard.com") {
        localStorage.setItem("superAdmin", "true");
        setUserName("Super Admin");
        navigate("/super-admin");
      } else {
        localStorage.removeItem("superAdmin");
        setUserName("Admin");
        navigate("/admin");
      }

      return;
    }

    localStorage.setItem("token", newToken);
    setToken(newToken);

    try {
      const res = await getCurrentUser();
      setUserName(res.data?.name || null);
    } catch {
      setUserName(null);
    }

    try {
      const res = await checkAccess();
      if (res.hasAccess) {
        navigate("/");
      } else {
        navigate("/");
      }
    } catch {
      navigate("/");
    }
  };

  return (
    <div className="page">
      {!hideHeaderRoutes.includes(location.pathname) && (
        <header className="header">
          <HeaderNav
            token={token}
            handleLogout={handleLogout}
            activeExhibition={activeExhibition}
            userName={userName}
          />
        </header>
      )}

      <main className="container">
        <Routes>

          <Route
            path="/login"
            element={<Login onLogin={handleLogin} />}
          />

          <Route
            path="/signup"
            element={<Signup onSignup={handleLogin} />}
          />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home
                  setActiveExhibition={setActiveExhibition}
                  userName={userName}
                />
              </PrivateRoute>
            }
          />

          <Route
            path="/scan"
            element={
              <PrivateRoute>
                <BusinessCard activeExhibition={activeExhibition} />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard activeExhibition={activeExhibition} />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile userName={userName} />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Admin />
              </ProtectedAdminRoute>
            }
          />

          <Route
            path="/super-admin"
            element={
              <ProtectedSuperAdminRoute>
                <SuperAdminPanel />
              </ProtectedSuperAdminRoute>
            }
          />

          <Route
            path="/exhibition-form/:id?"
            element={
              <PrivateRoute>
                <ExhibitionForm />
              </PrivateRoute>
            }
          />

        </Routes>
      </main>

     
    </div>
  );
}