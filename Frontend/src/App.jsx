import { Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup/Signup";
import Login from "./pages/Login/Login";
import './App.css'
import Me from "./pages/Me/Me";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import UpdateProfile from "./pages/UpdateProfile/UpdateProfile";
import ApplyForAuthor from "./pages/ApplyForAuthor/ApplyForAuthor";
import ApplicationHistory from "./pages/ApplicationHistory/ApplicationHistory";
import ApplicationDetails from "./pages/ApplicationDetails/ApplicationDetails";
import BookSearch from "./pages/BookSearch/BookSearch";
import BookDetails from "./pages/BookDetails/BookDetails";
import Library from "./pages/Library/Library";
import CreatePlaylist from "./pages/CreatePlaylist/CreatePlaylist";
import PlaylistDetails from "./pages/PlaylistDetails/PlaylistDetails";

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/me" element={<Me />} />
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<UpdateProfile />} />
        <Route path="/apply-for-author" element={<ApplyForAuthor />} />
        <Route path="/application-history" element={<ApplicationHistory />} />
        <Route path="/application-details" element={<ApplicationDetails />} />
        <Route path="/book-search" element={<BookSearch />} />
        <Route path="/book-details/:id" element={<BookDetails />} />
        <Route path="/library" element={<Library />} />
        <Route path="/create-playlist" element={<CreatePlaylist />} />
        <Route path="/playlist-details/:id" element={<PlaylistDetails />} />
      </Routes>
    </>
  )
}

export default App
