import { useState, useEffect } from "react";
import { FiUser, FiLogOut, FiChevronDown } from "react-icons/fi";

export default function UserDropdown({ userName, handleLogout, navigate, isAdmin }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSuperAdmin = localStorage.getItem("superAdmin") === "true";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".user-dropdown")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="user-dropdown">
      <button onClick={() => setIsOpen(!isOpen)}>
        <FiUser /> {userName} <FiChevronDown />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <button onClick={() => navigate("/profile")}>View Profile</button>

          {isAdmin && !isSuperAdmin && (
            <button onClick={() => navigate("/admin")}>Admin Panel</button>
          )}

          {isSuperAdmin && (
            <button onClick={() => navigate("/super-admin")}>
              Super Admin Panel
            </button>
          )}

          <button onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      )}
    </div>
  );
}