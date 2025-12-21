import React, { useState } from "react";
import "./Login.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!username || !password) {
      alert("Please enter both username and password.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UserName: username, Password: password }),
      });

      const data = await res.json();
      console.log("Login response:", data);

      if (res.ok) {
        let sessionId = null;
        const cookies = document.cookie.split("; ");
        for (let c of cookies) {
          if (c.startsWith("sessionid=")) {
            sessionId = c.split("=")[1];
            break;
          }
        }
        
        onLogin({
          user: data.user,
          sessionId,
        });

      } else {
        // Hiển thị thông báo lỗi bằng alert
        if (res.status === 401) {
          alert("Invalid username or password. Please try again.");
        } else if (res.status === 404) {
          alert("Account not found. Please check your username.");
        } else if (res.status === 403) {
          alert("Account is locked or inactive. Please contact administrator.");
        } else {
          alert(data.message || "Login failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Unable to connect to server. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap"
      />
      <div className="login-container">
        <div className="form-section">
          <div className="form-container">
            <h2 className="welcome-title">Welcome Back</h2>
            <p className="welcome-subtitle">
              Data Security Posture Management Project
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="form-input"
                    placeholder="************"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <svg
                      width="22"
                      height="17"
                      viewBox="0 0 23 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="eye-icon"
                    >
                      <path
                        d="M11.4682 14.3236C8.91401 14.3236 6.84638 12.3461 6.65612 9.84014L3.12363 7.10952C2.65925 7.69222 2.23192 8.30827 1.88709 8.98192C1.81006 9.13433 1.76992 9.30272 1.76992 9.47351C1.76992 9.64429 1.81006 9.81269 1.88709 9.9651C3.71328 13.529 7.3286 15.9403 11.4682 15.9403C12.3744 15.9403 13.2486 15.8056 14.0912 15.588L12.3438 14.2357C12.0552 14.2914 11.7622 14.3209 11.4682 14.3236ZM22.0361 16.2805L18.3133 13.4027C19.4442 12.4495 20.3742 11.2808 21.0494 9.96476C21.1264 9.81235 21.1666 9.64396 21.1666 9.47317C21.1666 9.30239 21.1264 9.13399 21.0494 8.98158C19.2232 5.41766 15.6079 3.00634 11.4682 3.00634C9.7345 3.00844 8.02891 3.44501 6.50727 4.27616L2.22317 0.964184C2.1673 0.920702 2.10342 0.888658 2.03516 0.869882C1.96691 0.851105 1.89563 0.845965 1.82539 0.854755C1.75515 0.863545 1.68733 0.886092 1.62581 0.921108C1.56429 0.956124 1.51026 1.00292 1.46683 1.05883L0.805794 1.90998C0.718104 2.02281 0.678811 2.16586 0.696557 2.30767C0.714302 2.44947 0.787632 2.57842 0.90042 2.66615L20.7133 17.9825C20.7692 18.026 20.8331 18.058 20.9013 18.0768C20.9696 18.0956 21.0409 18.1007 21.1111 18.0919C21.1813 18.0831 21.2492 18.0606 21.3107 18.0256C21.3722 17.9906 21.4262 17.9438 21.4697 17.8878L22.131 17.0367C22.2187 16.9238 22.2579 16.7808 22.2401 16.6389C22.2223 16.4971 22.1489 16.3682 22.0361 16.2805ZM15.8493 11.4976L14.5259 10.4744C14.6374 10.1522 14.6965 9.81423 14.701 9.47334C14.7076 8.97426 14.5971 8.48059 14.3783 8.03199C14.1595 7.58339 13.8386 7.19236 13.4413 6.89032C13.044 6.58827 12.5815 6.38363 12.0908 6.29283C11.6001 6.20203 11.0949 6.22761 10.6159 6.3675C10.819 6.64271 10.9288 6.97562 10.9294 7.31767C10.9244 7.4315 10.907 7.54444 10.8776 7.6545L8.39879 5.73831C9.25984 5.01859 10.3461 4.62392 11.4682 4.62309C12.1051 4.62274 12.7359 4.74795 13.3244 4.99157C13.9128 5.23519 14.4476 5.59245 14.8979 6.04291C15.3483 6.49336 15.7054 7.02819 15.949 7.61681C16.1926 8.20543 16.3178 8.8363 16.3174 9.47334C16.3174 10.2019 16.1393 10.8809 15.8493 11.498V11.4976Z"
                        fill="#B1A8B9"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="form-footer">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-label">Remember Me</span>
                </label>

                <a href="#forgot-password" className="forgot-password-link">
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? (
                  <div className="login-button-loading">
                    <div className="spinner"></div>
                    <span className="login-button-text">Logging in...</span>
                  </div>
                ) : (
                  <span className="login-button-text">Login</span>
                )}
              </button>
            </form>

            <div className="signup-section">
              <span className="signup-text">Don't have an account?</span>
              <a href="#signup" className="signup-link">
                Create an Account
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;