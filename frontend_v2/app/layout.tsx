import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
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
  const navigate = useNavigate();

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
                  navigate("/tags");
                }}
              >
                <a>
                  <MdOutlineLabel size={18} />
                  {t("Tags")}
                </a>
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
                  <MdTimeline size={18} />
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
                <a>
                  <MdShuffle size={18} />
                  {t("Random")}
                </a>
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
                <a>
                  <MdInfoOutline size={18} />
                  {t("About")}
                </a>
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
                <a>
                  <MdOutlineLabel size={18} />
                  {t("Tags")}
                </a>
              </li>
              <li
                onClick={() => {
                  navigate("/random");
                }}
              >
                <a>
                  <MdShuffle size={18} />
                  {t("Random")}
                </a>
              </li>
              <li
                onClick={() => {
                  navigate("/activity");
                }}
              >
                <a>
                  <MdTimeline size={18} />
                  {t("Activity")}
                </a>
              </li>
              <li
                onClick={() => {
                  navigate("/about");
                }}
              >
                <a>
                  <MdInfoOutline size={18} />
                  {t("About")}
                </a>
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
      className="btn btn-primary btn-square btn-soft"
      onClick={() => {
        navigate("/login");
      }}
    >
      <MdOutlinePerson size={24} />
    </button>
  }

  return (
    <button
      className="btn btn-ghost btn-square avatar"
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
