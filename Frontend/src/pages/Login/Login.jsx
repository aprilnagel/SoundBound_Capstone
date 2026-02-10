import { useState, useContext } from "react";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/Auth";
import AuthHeader from "../../components/AuthHeader/AuthHeader";
import "./Login.css";

export default function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            console.log("Login response:", data);

            if (!res.ok) {
                setError(data.error || "Login failed. Please try again.");
                return;
            }

            login(data.token, data.user);
            navigate("/auth/me"); // Redirect to home or dashboard after login
        } catch (err) {
            console.error("Login error:", err);
            setError("An error occurred. Please try again.");
        }

    };

    return (
        <div className="login-page">
            <AuthHeader />
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Login</h2>
                {error && <p style={{ color:"red" }}>{error}</p>}

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />
                <div className="login-actions">
                    <button className="login-button" type="submit">Login</button>
                    <button className="signup-button" type="button" onClick={() => navigate("/auth/signup")}>
                        Sign Up
                    </button>
                </div>
            </form>
        </div>
    );
}