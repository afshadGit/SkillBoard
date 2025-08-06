// src/pages/LoginPage.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If token exists, redirect to homepage
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login submitted");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      });

      if (!response.ok) {
        let errorText = "Login failed";
        try {
          const errorData = await response.json();
          errorText = errorData.detail || errorText;
        } catch {
          const text = await response.text();
          errorText = text || errorText;
        }
        setError(errorText);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("🔐 Token received:", data.access_token);

      localStorage.setItem("token", data.access_token);
      navigate("/"); // ✅ Redirect to home on success
    } catch (err) {
      if (err.name === "TypeError") {
        setError("Backend is unreachable. Is the server running?");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow p-6 rounded w-full max-w-sm"
      >
        <h2 className="text-xl font-bold mb-4 text-center">
          Login to SkillBoard
        </h2>
        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 mb-3 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white p-2 rounded transition ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

// // src/pages/LoginPage.js
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// const LoginPage = () => {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (localStorage.getItem("token")) {
//       navigate("/"); // Already logged in, redirect
//     }
//   }, [navigate]);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     console.log("Login submitted");
//     setError("");
//     setLoading(true);

//     try {
//       const response = await fetch("http://localhost:8000/auth/login", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: new URLSearchParams({ username, password }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         setError(data.detail || "Login failed");
//         setLoading(false);
//         return;
//       }

//       const data = await response.json();
//       localStorage.setItem("token", data.access_token);
//       navigate("/"); // Redirect after login
//     } catch (err) {
//       if (err.name === "TypeError") {
//         setError("Backend is unreachable. Is the server running?");
//       } else {
//         setError("Something went wrong. Try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <form
//         onSubmit={handleLogin}
//         className="bg-white shadow p-6 rounded w-full max-w-sm"
//       >
//         <h2 className="text-xl font-bold mb-4 text-center">
//           Login to SkillBoard
//         </h2>
//         <input
//           type="text"
//           placeholder="Username"
//           className="w-full border p-2 mb-3 rounded"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           required
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           className="w-full border p-2 mb-3 rounded"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />
//         {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
//         <button
//           type="submit"
//           disabled={loading}
//           className={`w-full text-white p-2 rounded transition ${
//             loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
//           }`}
//         >
//           {loading ? "Logging in..." : "Login"}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default LoginPage;

