import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";

export default function HeaderBar({ toggleSidebar }) {
  const { offset } = useContext(AuthContext);
  const [time, setTime] = useState(Date.now() + offset);

  useEffect(() => {
    if (offset == null) return;

    const interval = setInterval(() => {
      setTime(Date.now() + offset);
    }, 1000);

    return () => clearInterval(interval);
  }, [offset]);

  const Wrapper = ({ children }) => (
    <div
      className="flex items-center justify-between px-6 py-4 
        bg-gray-300 backdrop-blur-sm shadow-sm border-b border-gray-300/40"
    >
      {children}
    </div>
  );

  if (offset == null) {
    return (
      <Wrapper>
        <button
          onClick={toggleSidebar}
          className="text-gray-700 text-xl px-3 py-1 rounded hover:bg-gray-300"
        >
          ☰
        </button>
        <span className="text-gray-700 font-medium">Fetching time...</span>
      </Wrapper>
    );
  }

  const dateObj = new Date(time);

  return (
    <Wrapper>
      <button
        onClick={toggleSidebar}
        className="text-gray-700 text-xl px-3 py-1 rounded hover:bg-gray-300 transition"
      >
        ☰
      </button>

      <div className="text-right">
        <p className="text-gray-800 font-semibold text-lg">
          {dateObj.toLocaleTimeString()}
        </p>
        <p className="text-xs text-gray-600">{dateObj.toLocaleDateString()}</p>
      </div>
    </Wrapper>
  );
}
