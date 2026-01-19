import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { MdArrowUpward, MdOutlinePerson, MdOutlinePublish } from "react-icons/md";
import { useTranslation } from "./hook/i18n.js";
import { useConfig } from "./hook/config.js";
import { ThemeSwitcher } from "./components/theme_switcher.js";
import { network } from "./network/network.js";

export default function Layout() {
  const { server_name } = useConfig();

  return (
    <>
      <Navigator appName={server_name} />
      <Outlet />
    </>
  )
}

function Navigator({appName}: {appName: string}) {
  const navigate = useNavigate();

  const { t } = useTranslation();

  return (
    <div
    style={{
      position: "relative",
      zIndex: 1,
    }}
  >
    <FloatingToTopButton />
    <div className="z-1 fixed top-0 w-full backdrop-blur h-16" />
    <div className="z-2 fixed top-0 w-full h-16 bg-base-100 opacity-80" />
    <div
      className="navbar shadow-sm fixed top-0 z-3 lg:z-10 bg-transparent h-16"
    >
      <div className={"flex-1 max-w-7xl mx-auto flex items-center"}>
        <div className="dropdown">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
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
                navigate("/tags");
              }}
            >
              <a>{t("Tags")}</a>
            </li>
            <li>
              <a
                onClick={() => {
                  const menu = document.getElementById(
                    "navi_menu",
                  ) as HTMLElement;
                  menu.blur();
                  navigate("/activity");
                }}
              >
                {t("Activity")}
              </a>
            </li>
            <li
              onClick={() => {
                const menu = document.getElementById(
                  "navi_menu",
                ) as HTMLElement;
                menu.blur();
                navigate("/random");
              }}
            >
              <a>{t("Random")}</a>
            </li>
            <li
              onClick={() => {
                const menu = document.getElementById(
                  "navi_menu",
                ) as HTMLElement;
                menu.blur();
                navigate("/about");
              }}
            >
              <a>{t("About")}</a>
            </li>
          </ul>
        </div>
        <div>
          <button
            className="btn btn-ghost text-xl"
            onClick={() => {
              navigate(`/`, { replace: true });
            }}
          >
            {appName}
          </button>
        </div>
        <div className="hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li
              onClick={() => {
                navigate("/tags");
              }}
            >
              <a>{t("Tags")}</a>
            </li>
            <li
              onClick={() => {
                navigate("/random");
              }}
            >
              <a>{t("Random")}</a>
            </li>
            <li
              onClick={() => {
                navigate("/activity");
              }}
            >
              <a>{t("Activity")}</a>
            </li>
            <li
              onClick={() => {
                navigate("/about");
              }}
            >
              <a>{t("About")}</a>
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
  const navigate = useNavigate();
  const { t } = useTranslation();
  if (!config.isLoggedIn) {
    return <></>
  }

  return (
    <button
      className="btn btn-primary btn-soft"
      onClick={() => {
        navigate("/publish");
      }}
    >
      <MdOutlinePublish size={24} />
      <span className="hidden lg:block">{t("Publish")}</span>
    </button>
  )
}

function UserButton() {
  const config = useConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();
  if (!config.user) {
    return <button
      className="btn btn-primary btn-circle btn-soft"
      onClick={() => {
        navigate("/login");
      }}
    >
      <MdOutlinePerson size={24} />
    </button>
  }

  return (
    <button
      className="btn btn-ghost btn-circle avatar"
      onClick={() => {
        navigate(`/user/${encodeURIComponent(config.user!.username)}`);
      }}
    >
      <div className="w-10 rounded-full">
        <img alt="Avatar" src={network.getUserAvatar(config.user!)} />
      </div>
    </button>
  )
}