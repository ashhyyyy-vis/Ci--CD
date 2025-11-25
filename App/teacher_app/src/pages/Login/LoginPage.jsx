import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login/", {
        email,
        password,
        role: "teacher",
      });

      if (res.data.success) {
        const { token, user } = res.data.data;
        const serverTime = res.data.serverTime;
        login(user, token, serverTime);
        navigate("/home");
      } else {
        setError("Invalid login");
      }
    } catch (err) {
      console.log(err);
      setError("Incorrect email or password");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#dbeafe] via-[#bfdbfe] to-[#93c5fd]">
      <div className="bg-gray-200/80 backdrop-blur-md p-10 rounded-xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/src/assets/logo.png"
            alt="Institute Logo"
            className="h-20"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-center mb-6">
          Teacher Login
        </h1>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="user@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Login Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
