import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { MdArrowUpward, MdMenu, MdOutlinePerson, MdOutlinePublish, MdShuffle, MdTimeline, MdInfoOutline, MdOutlineLabel, MdSearch } from "react-icons/md";
import { useTranslation } from "./hook/i18n.js";
import { useConfig } from "./hook/config.js";
import { ThemeSwitcher } from "./components/theme_switcher.js";
import { network } from "./network/network.js";
import { Background } from "./components/background.js";

export default function Layout() {
  const { server_name } = useConfig();

  return (
    <>
      <Navigator appName={server_name} />
      <div className="pt-20 max-w-8xl mx-auto px-2">
        <Outlet />
      </div>
    </>
  )
}

function Navigator({appName}: {appName: string}) {
  const { t } = useTranslation();

  return (
    <Background>
      <div
      style={{
        position: "relative",
        zIndex: 1,
      }}
    >
      <FloatingToTopButton />
      <div className="z-1 fixed top-2 left-2 right-2 backdrop-blur-xs h-16 rounded-box max-w-8xl mx-auto" />
      <div className="z-2 fixed top-2 left-2 right-2 h-16 bg-base-100/90 rounded-box max-w-8xl mx-auto" />
      <div
        className="shadow-lg fixed top-2 left-2 right-2 z-3 lg:z-10 bg-transparent h-16 rounded-box px-2 lg:px-4 flex items-center max-w-8xl mx-auto"
      >
        <div className={"flex-1 flex items-center w-full"}>
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle lg:hidden"
            >
              <MdMenu size={24} />
            </div>
            <ul
              tabIndex={0}
              className="menu menu-md dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              <li
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                <NavLink to="/tags">
                  <MdOutlineLabel size={18} />
                  {t("Tags")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                <NavLink to="/activity">
                  <MdTimeline size={18} />
                  {t("Activity")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                <NavLink to="/random">
                  <MdShuffle size={18} />
                  {t("Random")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                }}
              >
                <NavLink to="/about">
                  <MdInfoOutline size={18} />
                  {t("About")}
                </NavLink>
              </li>
            </ul>
          </div>
          <div>
            <NavLink
              to="/"
              replace
              className="btn btn-ghost text-xl"
            >
              {appName}
            </NavLink>
          </div>
          <div className="hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <NavLink to="/tags">
                  <MdOutlineLabel size={18} />
                  {t("Tags")}
                </NavLink>
              </li>
              <li>
                <NavLink to="/random">
                  <MdShuffle size={18} />
                  {t("Random")}
                </NavLink>
              </li>
              <li>
                <NavLink to="/activity">
                  <MdTimeline size={18} />
                  {t("Activity")}
                </NavLink>
              </li>
              <li>
                <NavLink to="/about">
                  <MdInfoOutline size={18} />
                  {t("About")}
                </NavLink>
              </li>
            </ul>
          </div>
          <div className={"flex-1"}></div>
          <div className="flex gap-2">
            <SearchBar />
            <ThemeSwitcher />
            <PublishButton />
            <UserButton />
          </div>
        </div>
      </div>
      </div>
    </Background>
  )
}

function FloatingToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const isScrollingUp = window.scrollY < lastScrollY;
      const isAboveThreshold = window.scrollY > 200;

      setVisible(isScrollingUp && isAboveThreshold);
      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      className={`btn btn-circle btn-soft btn-secondary border shadow-lg btn-lg fixed right-4 ${visible ? "bottom-4" : "-bottom-12"} transition-all z-50`}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <MdArrowUpward size={20} />
    </button>
  );
}

function PublishButton() {
  const config = useConfig();
  const { t } = useTranslation();
  if (!config.isLoggedIn) {
    return <></>
  }

  return (
    <>
    <NavLink
      to="/publish"
      className="btn btn-primary hidden lg:flex"
    >
      <MdOutlinePublish size={24} />
      <span>{t("Publish")}</span>
    </NavLink>
    <NavLink
      to="/publish"
      className="btn btn-primary btn-square lg:hidden"
    >
      <MdOutlinePublish size={24} />
    </NavLink>
    </>
  )
}

function UserButton() {
  const config = useConfig();
  if (!config.user) {
    return <NavLink
      to="/login"
      className="btn btn-primary btn-square btn-soft"
    >
      <MdOutlinePerson size={24} />
    </NavLink>
  }

  return (
    <NavLink
      to={`/user/${encodeURIComponent(config.user!.username)}`}
      className="btn btn-ghost btn-square avatar"
    >
      <div className="w-10 rounded-full">
        <img alt="Avatar" src={network.getUserAvatar(config.user!)} />
      </div>
    </NavLink>
  )
}

function SearchBar() {
  const [small, setSmall] = useState(false);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const handleResize = () => {
      setSmall(window.innerWidth < 640);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const doSearch = () => {
    if (search.length === 0) {
      return;
    }
    const replace = window.location.pathname === "/search";
    navigate(`/search?keyword=${search}`, { replace: replace });
  };

  const searchField = (
    <label className={`input input-primary ${small ? "w-full" : "w-64"} bg-base-100/60! shadow-xs`}>
      <svg
        className="h-[1em] opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="2.5"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </g>
      </svg>
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (search.length === 0) {
            return;
          }
          const dialog = document.getElementById(
            "search_dialog",
          ) as HTMLDialogElement;
          if (dialog) {
            dialog.close();
          }
          doSearch();
        }}
      >
        <input
          type="search"
          className="w-full"
          required
          placeholder={t("Search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
    </label>
  );

  if (small) {
    return (
      <>
        <button
          className="btn btn-circle btn-ghost"
          onClick={() => {
            const dialog = document.getElementById(
              "search_dialog",
            ) as HTMLDialogElement;
            dialog.showModal();
          }}
        >
          <MdSearch size={24} />
        </button>
        <dialog id="search_dialog" className="modal">
          <div className="modal-box">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="text-lg font-bold">{t("Search")}</h3>
            <div className="h-4" />
            {searchField}
            <div className="h-4" />
            <div className="flex flex-row-reverse">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (search.length === 0) {
                    return;
                  }
                  const dialog = document.getElementById(
                    "search_dialog",
                  ) as HTMLDialogElement;
                  dialog.close();
                  doSearch();
                }}
              >
                {t("Search")}
              </button>
            </div>
          </div>
        </dialog>
      </>
    );
  }

  return searchField;
}
