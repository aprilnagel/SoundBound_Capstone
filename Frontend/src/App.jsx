import { Routes, Route } from "react-router-dom";
import './App.css';

//auth pages
import Signup from "./pages/Signup/Signup";
import Login from "./pages/Login/Login";

// User account Pages
import Me from "./pages/Me/Me";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import UpdateProfile from "./pages/UpdateProfile/UpdateProfile";

// Author Application Pages
import ApplyForAuthor from "./pages/UserAuthorApps/ApplyForAuthor/ApplyForAuthor";
import ApplicationHistory from "./pages/UserAuthorApps/ApplicationHistory/ApplicationHistory";
import CheckAppStatus from "./pages/UserAuthorApps/CheckAppStatus/CheckAppStatus";

// Book pages
import BookSearch from "./pages/BookSearch/BookSearch";
import BookDetails from "./pages/BookDetails/BookDetails";
import Library from "./pages/Library/Library";

// Playlist pages
import CreatePlaylist from "./pages/CreatePlaylist/CreatePlaylist";
import PlaylistDetails from "./pages/PlaylistDetails/PlaylistDetails";
import Playlists from "./pages/Playlists/Playlists";

//admin pages
import AdminDash from "./pages/AdminDash/AdminDash";
import AdminAppList from "./pages/AdminDash/AdminAppList/AdminAppList";
import AdminAppDetails from "./pages/AdminDash/AdminAppDetails/AdminAppDetails";
import AdminPending from "./pages/AdminDash/AdminPending/AdminPending";


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
        <Route path="/application-status" element={<CheckAppStatus />} />
        
        <Route path="/book-search" element={<BookSearch />} />
        <Route path="/book-details/:id" element={<BookDetails />} />
        <Route path="/library" element={<Library />} />

        <Route path="/create-playlist" element={<CreatePlaylist />} />
        <Route path="/playlist-details/:id" element={<PlaylistDetails />} />
        <Route path="/playlists" element={<Playlists />} />

        <Route path="/admin/apps" element={<AdminDash />} />
        <Route path="/admin/apps/all" element={<AdminAppList />} />
        <Route path="/admin/apps/:id" element={<AdminAppDetails />} />
        <Route path="/admin/apps/pending" element={<AdminPending />} />

      </Routes>
    </>
  )
}

export default App
