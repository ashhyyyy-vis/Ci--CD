import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext);

  const menu = [
    { name: "Dashboard", path: "/home" },
    { name: "Attendance Report", path: "/report" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full bg-gray-300 shadow-lg transition-all duration-300 
        ${isOpen ? "w-64" : "w-16"}
        overflow-hidden
      `}
    >
      {/* NAVIGATION */}
      {isOpen && (
        <nav className="pt-20 px-3 space-y-2 text-gray-700">
          {/* Dynamic Items */}
          {menu.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                p-2 rounded cursor-pointer transition 
                ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white shadow-md"
                    : "hover:bg-gray-200"
                }
              `}
            >
              {item.name}
            </div>
          ))}

          {/* Logout */}
          <div
            onClick={handleLogout}
            className="cursor-pointer hover:bg-red-100 p-2 rounded text-red-600 font-semibold mt-4"
          >
            Logout
          </div>
        </nav>
      )}
    </aside>
  );
}
