import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiCamera,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiHome,
  FiSettings,
} from "react-icons/fi";
import { useState } from "react";
import { HiHome } from "react-icons/hi";

export default function HeaderNav({
  token,
  handleLogout,
  activeExhibition,
  userName,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const adminToken = localStorage.getItem("adminToken");
  const isAdmin = !!adminToken;

  const showDashboard = location.pathname === "/scan";
  const showScanCard =
    location.pathname === "/dashboard" &&
    activeExhibition &&
    activeExhibition.isLive;

  const hideHeaderRoutes = ["/login", "/signup", "/admin/login"];
  if (hideHeaderRoutes.includes(location.pathname)) return null;

  const isLoggedIn = token || adminToken;

  return (
    <>
      <header className="sticky top-0 z-40 bg-blue-600 border-b border-gray-200 lg:border-gray-100 ">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex">
              <img
                src="/logo.png"
                alt="OMSONS GERMANY"
                className="h-12 w-auto mx-auto drop-shadow-lg"
              />
            </div>
          </Link>

          {isLoggedIn && (
            <nav className="hidden lg:flex items-center gap-8">
              {showDashboard && (
                <Link
                  to="/dashboard"
                  className={`font-medium transition text-sm text-black ${
                    location.pathname === "/dashboard"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  Dashboard
                </Link>
              )}

              {showScanCard && (
                <Link
                  to="/scan"
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-blue-600 transition text-sm"
                >
                  <FiCamera size={16} />
                  Scan Card
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative">
                {/* User Avatar Button - Minimal on Mobile */}
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  {/* Desktop: Show Name + Avatar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">
                        {userName || "User"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FiUser className="text-blue-600 text-sm" />
                    </div>
                  </div>

                  {/* Mobile: Show Avatar Only */}
                  <div className="sm:hidden w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiUser className="text-blue-600 text-sm" />
                  </div>

                  {/* Chevron Icon */}
                  <FiChevronDown
                    size={16}
                    className={`text-gray-600 transition duration-200 ${userDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 overflow-hidden">
                    {/* User Info Section */}
                    {userName && (
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-evenly">
                        
                        <p className="text-sm font-bold text-gray-900 truncate mb-1">
                         @{userName}
                        </p>
                      </div>
                    )}

                    <div className="w-full px-4.5 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition font-medium text-sm">
                      <FiHome/>
                      <Link
                        to="/"
                        className={`font-medium transition text-sm ${
                          location.pathname === "/"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-700 hover:text-blue-600"
                        }`}
                      >
                        Home
                      </Link>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition font-medium text-sm"
                    >
                      <FiUser
                        size={16}
                        className="text-gray-600 flex-shrink-0"
                      />
                      <span>My Profile</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          navigate("/admin");
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition font-medium text-sm"
                      >
                        <FiSettings
                          size={16}
                          className="text-gray-600 flex-shrink-0"
                        />
                        <span>Admin Panel</span>
                      </button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={() => {
                        handleLogout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition font-medium text-sm"
                    >
                      <FiLogOut
                        size={16}
                        className="text-red-600 flex-shrink-0"
                      />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-gray-700 font-medium hover:text-blue-600 transition text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200">
          <div className="flex items-center justify-around h-16 px-1 max-w-7xl mx-auto w-full">
            {/* Home */}
            <Link
              to="/"
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                location.pathname === "/"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              title="Home"
            >
              <FiHome size={22} className="mb-1" />
              <span className="text-xs font-semibold">Home</span>
            </Link>

            {/* Dashboard - Conditionally Shown */}
            {showDashboard && (
              <Link
                to="/dashboard"
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                  location.pathname === "/dashboard"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title="Dashboard"
              >
                <FiSettings size={22} className="mb-1" />
                <span className="text-xs font-semibold">Dashboard</span>
              </Link>
            )}

            {/* Scan Card - Conditionally Shown */}
            {showScanCard && (
              <Link
                to="/scan"
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                  location.pathname === "/scan"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title="Scan Card"
              >
                <FiCamera size={22} className="mb-1" />
                <span className="text-xs font-semibold">Scan</span>
              </Link>
            )}

            {/* Profile */}
            <button
              onClick={() => navigate("/profile")}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                location.pathname === "/profile"
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              title="Profile"
            >
              <FiUser size={22} className="mb-1" />
              <span className="text-xs font-semibold">Profile</span>
            </button>

            {/* Admin Panel - Only for Admins */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${
                  location.pathname === "/admin"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                title="Admin Panel"
              >
                <FiSettings size={22} className="mb-1" />
                <span className="text-xs font-semibold">Admin</span>
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Spacer for Mobile Bottom Nav - Prevents Content Overlap */}
      {isLoggedIn && <div className="h-16 lg:h-0"></div>}
    </>
  );
}
