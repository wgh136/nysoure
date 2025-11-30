import { BrowserRouter, Route, Routes } from "react-router";
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
import EditResourcePage from "./pages/edit_resource_page.tsx";
import AboutPage from "./pages/about_page.tsx";
import TagsPage from "./pages/tags_page.tsx";
import RandomPage from "./pages/random_page.tsx";
import ActivitiesPage from "./pages/activities_page.tsx";
import CommentPage from "./pages/comment_page.tsx";
import CreateCollectionPage from "./pages/create_collection_page.tsx";
import CollectionPage from "./pages/collection_page.tsx";
import { i18nData } from "./i18n.ts";
import { i18nContext } from "./utils/i18n.ts";
import NotificationPage from "./pages/notification_page.tsx";

export default function App() {
  return (
    <i18nContext.Provider value={i18nData}>
      <BrowserRouter>
        <Routes>
          <Route path={"/login"} element={<LoginPage />} />
          <Route path={"/register"} element={<RegisterPage />} />
          <Route element={<Navigator />}>
            <Route path={"/"} element={<HomePage />} />
            <Route path={"/publish"} element={<PublishPage />} />
            <Route path={"/search"} element={<SearchPage />} />
            <Route path={"/resources/:id"} element={<ResourcePage />} />
            <Route path={"/manage"} element={<ManagePage />} />
            <Route path={"/tag/:tag"} element={<TaggedResourcesPage />} />
            <Route path={"/user/:username"} element={<UserPage />} />
            <Route
              path={"/resource/edit/:rid"}
              element={<EditResourcePage />}
            />
            <Route path={"/about"} element={<AboutPage />} />
            <Route path={"/tags"} element={<TagsPage />} />
            <Route path={"/random"} element={<RandomPage />} />
            <Route path={"/activity"} element={<ActivitiesPage />} />
            <Route path={"/comments/:id"} element={<CommentPage />} />
            <Route
              path={"/create-collection"}
              element={<CreateCollectionPage />}
            />
            <Route path={"/collection/:id"} element={<CollectionPage />} />
            <Route path={"/notifications"} element={<NotificationPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </i18nContext.Provider>
  );
}
