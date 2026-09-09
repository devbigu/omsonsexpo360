import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./HeaderNav";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function Layout() {
  const location = useLocation();

  const hideHeaderRoutes = ["/login"];

  return (
    <>
      {!hideHeaderRoutes.includes(location.pathname) && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}