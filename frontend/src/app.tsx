import {BrowserRouter, Route, Routes} from "react-router";
import LoginPage from "./pages/login_page.tsx";
import RegisterPage from "./pages/register_page.tsx";
import Navigator from "./components/navigator.tsx";
import HomePage from "./pages/home_page.tsx";
import PublishPage from "./pages/publish_page.tsx";
import SearchPage from "./pages/search_page.tsx";
import ResourcePage from "./pages/resource_details_page.tsx";
import ManagePage from "./pages/manage_page.tsx";
import TaggedResourcesPage from "./pages/tagged_resources_page.tsx";
import UserPage from "./pages/user_page.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/login"} element={<LoginPage/>}/>
        <Route path={"/register"} element={<RegisterPage/>}/>
        <Route element={<Navigator/>}>
          <Route path={"/"} element={<HomePage/>}/>
          <Route path={"/publish"} element={<PublishPage/>} />
          <Route path={"/search"} element={<SearchPage/>} />
          <Route path={"/resources/:id"} element={<ResourcePage/>}/>
          <Route path={"/manage"} element={<ManagePage/>}/>
          <Route path={"/tag/:tag"} element={<TaggedResourcesPage/>}/>
          <Route path={"/user/:username"} element={<UserPage/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
