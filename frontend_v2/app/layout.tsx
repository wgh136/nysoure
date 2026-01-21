import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router";
import { MdArrowUpward, MdMenu, MdOutlinePerson, MdOutlinePublish, MdShuffle, MdTimeline, MdInfoOutline, MdOutlineLabel } from "react-icons/md";
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
      <div className="z-2 fixed top-2 left-2 right-2 h-16 bg-base-100 opacity-60 rounded-box max-w-8xl mx-auto" />
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
              id={"navi_menu"}
              tabIndex={0}
              className="menu menu-md dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              <li
                onClick={() => {
                  const menu = document.getElementById(
                    "navi_menu",
                  ) as HTMLElement;
                  menu.blur();
                }}
              >
                <NavLink to="/tags">
                  <MdOutlineLabel size={18} />
                  {t("Tags")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  const menu = document.getElementById(
                    "navi_menu",
                  ) as HTMLElement;
                  menu.blur();
                }}
              >
                <NavLink to="/activity">
                  <MdTimeline size={18} />
                  {t("Activity")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  const menu = document.getElementById(
                    "navi_menu",
                  ) as HTMLElement;
                  menu.blur();
                }}
              >
                <NavLink to="/random">
                  <MdShuffle size={18} />
                  {t("Random")}
                </NavLink>
              </li>
              <li
                onClick={() => {
                  const menu = document.getElementById(
                    "navi_menu",
                  ) as HTMLElement;
                  menu.blur();
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
            <PublishButton />
            <ThemeSwitcher />
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
    <NavLink
      to="/publish"
      className="btn btn-primary btn-soft"
    >
      <MdOutlinePublish size={24} />
      <span className="hidden lg:block">{t("Publish")}</span>
    </NavLink>
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
