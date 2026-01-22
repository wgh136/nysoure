import {
  MdMenu,
  MdOutlineBadge,
  MdOutlinePerson,
  MdOutlineStorage,
  MdOutlineSettings,
} from "react-icons/md";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "~/hook/i18n";
import { Outlet, useLocation, useNavigate } from "react-router";
import { configFromMatches } from "~/hook/config";
import type { Route } from "./+types/manage";

export function meta({ matches}: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export default function ManagePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [lg, setLg] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);

  // Determine current page from URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes("/manage/storage")) return 1;
    if (path.includes("/manage/users")) return 2;
    if (path.includes("/manage/config")) return 3;
    return 0; // default to "My Info"
  };

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(getCurrentPage());
  }, [location.pathname]);

  // Redirect to /manage/me if on /manage
  useEffect(() => {
    if (location.pathname === "/manage" || location.pathname === "/manage/") {
      navigate("/manage/me", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setLg(window.innerWidth >= 1024);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  const buildItem = (title: string, icon: ReactNode, p: number, path: string) => {
    return (
      <li
        key={title}
        onClick={() => {
          setPage(p);
          navigate(path);
          const checkbox = document.getElementById(
            "my-drawer-2",
          ) as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = false;
          }
        }}
        className={"my-1"}
      >
        <a
          className={`flex items-center h-9 px-4 ${page === p && "bg-primary text-primary-content"}`}
        >
          {icon}
          <span className={"text"}>{title}</span>
        </a>
      </li>
    );
  };

  const pageNames = [t("My Info"), t("Storage"), t("Users"), t("Server")];

  return (
    <div className="drawer lg:drawer-open lg:pl-4">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content overflow-y-auto bg-base-100/80 backdrop-blur-sm lg:m-4 rounded-md lg:p-2 h-[calc(100vh-64px)] lg:h-[calc(100vh-96px)]">
        <div className={"flex w-full h-14 items-center gap-2 px-4"}>
          <label
            className={"btn btn-square btn-ghost lg:hidden"}
            htmlFor="my-drawer-2"
          >
            <MdMenu size={24} />
          </label>
          <h1 className={"text-xl font-bold"}>{pageNames[page]}</h1>
        </div>
        <div>
          <Outlet />
        </div>
      </div>
      <div
        className="drawer-side"
        style={{
          height: lg ? "calc(100vh - 64px)" : "100vh",
          zIndex: 10,
        }}
      >
        <label
          htmlFor="my-drawer-2"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <ul className="menu bg-base-100 lg:bg-base-100-tr82 min-h-full lg:min-h-0 lg:h-[calc(100%-32px)] lg:overflow-y-auto lg:my-4 w-72 px-4 lg:rounded-md">
          <h2 className={"text-lg font-bold p-4"}>{t("Manage")}</h2>
          {buildItem(t("My Info"), <MdOutlineBadge className={"text-xl"} />, 0, "/manage/me")}
          {buildItem(
            t("Storage"),
            <MdOutlineStorage className={"text-xl"} />,
            1,
            "/manage/storage"
          )}
          {buildItem(t("Users"), <MdOutlinePerson className={"text-xl"} />, 2, "/manage/users")}
          {buildItem(
            t("Server"),
            <MdOutlineSettings className={"text-xl"} />,
            3,
            "/manage/config"
          )}
        </ul>
      </div>
    </div>
  );
}
