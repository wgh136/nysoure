import {
  MdMenu,
  MdOutlineBadge,
  MdOutlinePerson,
  MdOutlineStorage,
} from "react-icons/md";
import { ReactNode, useEffect, useState } from "react";
import StorageView from "./manage_storage_page.tsx";
import UserView from "./manage_user_page.tsx";
import { useTranslation } from "../utils/i18n";
import { ManageMePage } from "./manage_me_page.tsx";
import ManageServerConfigPage from "./manage_server_config_page.tsx";

export default function ManagePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const [lg, setLg] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setLg(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    document.title = t("Manage");
  }, []);

  const buildItem = (title: string, icon: ReactNode, p: number) => {
    return (
      <li
        key={title}
        onClick={() => {
          setPage(p);
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
          className={`flex items-center h-9 px-4 ${page == p && "bg-primary text-primary-content"}`}
        >
          {icon}
          <span className={"text"}>{title}</span>
        </a>
      </li>
    );
  };

  const pageNames = [t("My Info"), t("Storage"), t("Users"), t("Server")];

  const pageComponents = [
    <ManageMePage />,
    <StorageView />,
    <UserView />,
    <ManageServerConfigPage />,
  ];

  return (
    <div className="drawer lg:drawer-open lg:pl-4">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content overflow-y-auto bg-base-100-tr82 lg:m-4 rounded-md lg:p-2 h-[calc(100vh-64px)] lg:h-[calc(100vh-96px)]">
        <div className={"flex w-full h-14 items-center gap-2 px-4"}>
          <label
            className={"btn btn-square btn-ghost lg:hidden"}
            htmlFor="my-drawer-2"
          >
            <MdMenu size={24} />
          </label>
          <h1 className={"text-xl font-bold"}>{pageNames[page]}</h1>
        </div>
        <div>{pageComponents[page]}</div>
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
          {buildItem(t("My Info"), <MdOutlineBadge className={"text-xl"} />, 0)}
          {buildItem(
            t("Storage"),
            <MdOutlineStorage className={"text-xl"} />,
            1,
          )}
          {buildItem(t("Users"), <MdOutlinePerson className={"text-xl"} />, 2)}
          {buildItem(
            t("Server"),
            <MdOutlineStorage className={"text-xl"} />,
            3,
          )}
        </ul>
      </div>
    </div>
  );
}
