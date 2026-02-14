import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";
import { useContext } from "react";
import { AuthContext } from "../../contexts/Auth";

export default function Home() {
    const { user } = useContext(AuthContext);

    return (
        <div className="home-page">
            <Navbar />

            <div className="home-content">
                <h1>
                    Welcome to SoundBound{user?.name ? `, ${user.name}` : ""}!
                </h1>
                <p>Your gateway to books, music, and creativity.</p>
            </div>
        </div>
    );
}