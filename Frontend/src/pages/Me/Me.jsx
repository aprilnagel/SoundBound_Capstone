import { useEffect, useState, useContext, use } from "react";
import { API_BASE_URL } from "../../config";
import { AuthContext } from "../../contexts/Auth";
import AuthHeader from "../../components/AuthHeader/AuthHeader";
import { useNavigate } from "react-router-dom";
import "./Me.css";


export default function Me() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/auth/login");
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    localStorage.removeItem("token");
                    navigate("/auth/login");
                    return;
                }

                const data = await res.json();

                //save user data to context
                login(token, data);
                

                //keep loading screen visible for .8 seconds to prevent flash of content
                setTimeout(() => {
                    setLoading(false);
                    navigate("/"); // Redirect to home or dashboard after loading user data
                }, 1000);

            } catch (err) {
                console.error("Error loading user:", err);
                localStorage.removeItem("token");
                navigate("/auth/login");
            }
        }

        loadUser();
    }, [login, navigate]);

    if (loading) {
        return (
            <div className="loading-page">
                <AuthHeader />
                <p className="loading-content">Loading user data...</p>
            </div>
        );
    }

    return null; // This component doesn't render anything after loading user data
}



    
