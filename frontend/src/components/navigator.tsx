import { app } from "../app.ts";
import { network } from "../network/network.ts";
import { useNavigate, useOutlet } from "react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { MdOutlinePerson, MdSearch, MdSettings } from "react-icons/md";
import { useTranslation } from "react-i18next";
import UploadingSideBar from "./uploading_side_bar.tsx";
import { IoLogoGithub } from "react-icons/io";

export default function Navigator() {
  const outlet = useOutlet()

  const navigate = useNavigate()

  const [key, setKey] = useState(0);

  const [naviContext, _] = useState<NavigatorContext>({
    refresh: () => {
      setKey(key + 1);
    },
  });

  return <>
    <div className="navbar bg-base-100 shadow-sm fixed top-0 z-1 lg:z-10" key={key}>
      <div className={"flex-1 max-w-7xl mx-auto flex"}>
        <div className="flex-1">
          <button className="btn btn-ghost text-xl" onClick={() => {
            navigate(`/`);
          }}>{app.appName}</button>
        </div>
        <div className="flex gap-2">
          <SearchBar />
          <UploadingSideBar />
          {
            app.isLoggedIn() && <button className={"btn btn-circle btn-ghost"} onClick={() => {
              navigate("/manage");
            }}>
              <MdSettings size={24} />
            </button>
          }
          <button className={"btn btn-circle btn-ghost"} onClick={() => {
            window.open("https://github.com/wgh136/nysoure", "_blank");
          }}>
            <IoLogoGithub size={24} />
          </button>
          {
            app.isLoggedIn() ? <UserButton /> : <button className={"btn btn-primary btn-square btn-soft"} onClick={() => {
              navigate("/login");
            }}>
              <MdOutlinePerson size={24}></MdOutlinePerson>
            </button>
          }
        </div>
      </div>
    </div>
    <navigatorContext.Provider value={naviContext}>
      <div className={"max-w-7xl mx-auto pt-16"}>
        {outlet}
      </div>
    </navigatorContext.Provider>
  </>
}

interface NavigatorContext {
  refresh: () => void;
}

const navigatorContext = createContext<NavigatorContext>({
  refresh: () => {
    // do nothing
  }
})

export function useNavigator() {
  return useContext(navigatorContext);
}

function UserButton() {
  let avatar = "./avatar.png";
  if (app.user) {
    avatar = network.getUserAvatar(app.user)
  }

  const navigate = useNavigate()

  const { t } = useTranslation()

  return <>
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Avatar"
            src={avatar} />
        </div>
      </div>
      <ul
        id={"navi_dropdown_menu"}
        tabIndex={0}
        className="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
        <li><a onClick={() => {
          navigate(`/user/${app.user?.username}`);
          const menu = document.getElementById("navi_dropdown_menu") as HTMLUListElement;
          menu.blur();
        }}>{t("My Profile")}</a></li>
        <li><a onClick={() => {
          navigate(`/publish`);
          const menu = document.getElementById("navi_dropdown_menu") as HTMLUListElement;
          menu.blur();
        }}>{t("Publish")}</a></li>
        <li><a onClick={() => {
          const dialog = document.getElementById("confirm_logout") as HTMLDialogElement;
          dialog.showModal();
        }}>{t("Log out")}</a></li>
      </ul>
    </div>
    <dialog id="confirm_logout" className="modal">
      <div className="modal-box">
        <h3 className="text-lg font-bold">{t("Log out")}</h3>
        <p className="py-4">{t("Are you sure you want to log out?")}</p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">{t('Cancel')}</button>
            <button className="btn btn-error mx-2" type={"button"} onClick={() => {
              app.user = null;
              app.token = null;
              app.saveData();
              navigate(`/login`, { replace: true });
            }}>{t('Confirm')}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  </>
}

function SearchBar() {
  const [small, setSmall] = useState(window.innerWidth < 640);

  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const { t } = useTranslation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSmall(true);
      } else {
        setSmall(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const doSearch = () => {
    if (search.length === 0) {
      return;
    }
    const replace = window.location.pathname === "/search";
    navigate(`/search?keyword=${search}`, { replace: replace });
  }

  const searchField = <label className={`input input-primary ${small ? "w-full" : "w-64"}`}>
    <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-width="2.5"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </g>
    </svg>
    <form className={"w-full"} onSubmit={(e) => {
      e.preventDefault();
      doSearch();
    }}>
      <input type="search" className={"w-full"} required placeholder={t("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
    </form>
  </label>

  if (small) {
    return <>
      <button className={"btn btn-circle btn-ghost"} onClick={() => {
        const dialog = document.getElementById("search_dialog") as HTMLDialogElement;
        dialog.showModal();
      }}>
        <MdSearch size={24} />
      </button>
      <dialog id="search_dialog" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="text-lg font-bold">{t("Search")}</h3>
          <div className={"h-4"} />
          {searchField}
          <div className={"h-4"} />
          <div className={"flex flex-row-reverse"}>
            <button className={"btn btn-primary"} onClick={() => {
              if (search.length === 0) {
                return;
              }
              const dialog = document.getElementById("search_dialog") as HTMLDialogElement;
              dialog.close();
              doSearch();
            }}>
              {t("Search")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  }

  return searchField
}
