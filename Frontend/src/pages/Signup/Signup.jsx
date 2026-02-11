import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import AuthHeader from "../../components/AuthHeader/AuthHeader";
import "./Signup.css";

export default function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
    });

    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [signUpSuccess, setSignupSuccess] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value});
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setIsError(false);
        setSignupSuccess(false);
        setForm({
            first_name: "",
            last_name: "",
            username: "",
            email: "",
            password: "",
        });

        try {
            const res = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            console.log("Signup response:", data);

            if (!res.ok) {
                setIsError(true);
                setMessage(data.error || "Signup failed. Please try again.");
                return;
            }
            //success pop up
            setSignupSuccess(true);
            setMessage("Signup successful! Redirecting to login...");
        } catch (err) {
            console.error("Signup error:", err);
            setIsError(true);
            setMessage("An error occurred. Please try again.");
        }
    };

    return (
        <div className="signup-page">
            <AuthHeader />
            <form className="signup-form" onSubmit={handleSubmit}>
                
                <h2>Sign Up!</h2>

                {/* Display success or error message */}
                {isError && 
                <p className="error-message" 
                style={{ color: "red" }}>
                    {message}
                </p>
                }

                <input 
                    name="first_name"
                    placeholder="First Name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                />
                <input
                    name="last_name"
                    placeholder="Last Name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                />
                <input
                    name="username"
                    placeholder="Username"
                    value={form.username}
                    onChange={handleChange}
                    required
                />
                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />
                <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />

                <button className="signuppage-button" type="submit">
                    Start Listening!
                </button>
                <button className="backtologin-button" type="button" onClick={() => navigate("/login")}>
                    Back to Login
                </button>
            </form>

            {/* SUCCESS MESSAGE POP UP */}
            {signUpSuccess && (
                <div className="success-popup">
                    <div className="success-box">
                        <div className="success-icon">✓</div>
                        <h2>Signup Successful!</h2>
                        <p>You will be redirected to the login page shortly.</p>

                        <button onClick={() => navigate("/login")}>Go to Login</button>
                    </div>
                </div>
            )}
        </div>
    );
}





