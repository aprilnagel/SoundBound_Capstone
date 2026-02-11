import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";

export default function Home() {
    return (
        <div className="home-page">
            <Navbar />

            <div className="home-content">
                <h1>Welcome to SoundBound!</h1>
                <p>Your gateway to books, music, and creativity.</p>
            </div>
        </div>
    );
}