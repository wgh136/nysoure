import { app } from "../app.ts";
import { network } from "../network/network.ts";
import { useNavigate, useOutlet } from "react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { MdArrowUpward, MdOutlinePerson, MdSearch, MdNotifications } from "react-icons/md";
import { useTranslation } from "../utils/i18n";
import UploadingSideBar from "./uploading_side_bar.tsx";
import { ThemeSwitcher } from "./theme_switcher.tsx";
import { useAppContext } from "./AppContext.tsx";
import { AnimatePresence, motion } from "framer-motion";

export default function Navigator() {
  const outlet = useOutlet();

  const navigate = useNavigate();

  const [key, setKey] = useState(0);

  const [background, setBackground] = useState<string | undefined>(undefined);

  const appContext = useAppContext();

  const [naviContext, _] = useState<NavigatorContext>({
    refresh: () => {
      setKey(key + 1);
    },
    setBackground: (b: string) => {
      if (b !== background) {
        setBackground(b);
      }
    },
  });

  const { t } = useTranslation();

  useEffect(() => {
    if (app.privateDeployment && !app.isLoggedIn()) {
      navigate("/login", { replace: true });
    }
  }, []);

  return (
    <>
      {/* background */}
      {background && (
        <div
          className="background-wrapper"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -2,
            filter: "blur(8px)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={background}
              src={background}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute w-full h-full object-cover"
            />
          </AnimatePresence>
        </div>
      )}

      {/* Background overlay */}
      {background && (
        <div
          className="bg-base-100 opacity-20 dark:opacity-40"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
          }}
        />
      )}

      {/* Content overlay with backdrop blur */}
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
          key={key}
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
                    navigate("/");
                  }}
                >
                  <a>{t("Home")}</a>
                </li>
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
                  appContext.clear();
                  navigate(`/`, { replace: true });
                }}
              >
                {app.appName}
              </button>
            </div>
            <div className="hidden lg:flex">
              <ul className="menu menu-horizontal px-1">
                <li
                  onClick={() => {
                    navigate("/");
                  }}
                >
                  <a>{t("Home")}</a>
                </li>
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
              <SearchBar />
              <UploadingSideBar />
              <ThemeSwitcher />
              {app.isLoggedIn() && <NotificationButton />}
              {app.isLoggedIn() ? (
                <UserButton />
              ) : (
                <button
                  className={"btn btn-primary btn-square btn-soft"}
                  onClick={() => {
                    navigate("/login");
                  }}
                >
                  <MdOutlinePerson size={24}></MdOutlinePerson>
                </button>
              )}
            </div>
          </div>
        </div>
        <navigatorContext.Provider value={naviContext}>
          <div className={"max-w-7xl mx-auto pt-16"}>{outlet}</div>
        </navigatorContext.Provider>
      </div>
    </>
  );
}

interface NavigatorContext {
  refresh: () => void;
  setBackground: (background: string) => void;
}

const navigatorContext = createContext<NavigatorContext>({
  refresh: () => {
    // do nothing
  },
  setBackground: (_) => {
    // do nothing
  },
});

export function useNavigator() {
  return useContext(navigatorContext);
}

function UserButton() {
  let avatar = "./avatar.png";
  if (app.user) {
    avatar = network.getUserAvatar(app.user);
  }

  const navigate = useNavigate();

  const { t } = useTranslation();

  return (
    <>
      <div className="dropdown dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-ghost btn-circle avatar"
        >
          <div className="w-10 rounded-full">
            <img alt="Avatar" src={avatar} />
          </div>
        </div>
        <ul
          id={"navi_dropdown_menu"}
          tabIndex={0}
          className="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
        >
          <li>
            <a
              onClick={() => {
                navigate(`/user/${encodeURIComponent(app.user!.username)}`);
                const menu = document.getElementById(
                  "navi_dropdown_menu",
                ) as HTMLUListElement;
                menu.blur();
              }}
            >
              {t("My Profile")}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                navigate(`/publish`);
                const menu = document.getElementById(
                  "navi_dropdown_menu",
                ) as HTMLUListElement;
                menu.blur();
              }}
            >
              {t("Publish")}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                navigate(`/manage`);
                const menu = document.getElementById(
                  "navi_dropdown_menu",
                ) as HTMLUListElement;
                menu.blur();
              }}
            >
              {t("Settings")}
            </a>
          </li>
          <li>
            <a
              onClick={() => {
                const dialog = document.getElementById(
                  "confirm_logout",
                ) as HTMLDialogElement;
                dialog.showModal();
              }}
            >
              {t("Log out")}
            </a>
          </li>
        </ul>
      </div>
      <dialog id="confirm_logout" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("Log out")}</h3>
          <p className="py-4">{t("Are you sure you want to log out?")}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">{t("Cancel")}</button>
              <button
                className="btn btn-error mx-2"
                type={"button"}
                onClick={() => {
                  app.user = null;
                  app.token = null;
                  app.saveData();
                  navigate(`/login`, { replace: true });
                }}
              >
                {t("Confirm")}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
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
  };

  const searchField = (
    <label className={`input input-primary ${small ? "w-full" : "w-64"}`}>
      <svg
        className="h-[1em] opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
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
      <form
        className={"w-full"}
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
          className={"w-full"}
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
          className={"btn btn-circle btn-ghost"}
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
            <div className={"h-4"} />
            {searchField}
            <div className={"h-4"} />
            <div className={"flex flex-row-reverse"}>
              <button
                className={"btn btn-primary"}
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

function NotificationButton() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCount = async () => {
      if (!app.isLoggedIn()) {
        return;
      }
      const res = await network.getUserNotificationsCount();
      if (res.success && res.data !== undefined) {
        setCount(res.data);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // 每分钟请求一次

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="indicator">
      {count > 0 && <span className="bg-error text-white text-xs rounded-full px-1 indicator-item">
        {count > 99 ? "99+" : count}
      </span>}
      <button
        className="btn btn-ghost btn-circle"
        onClick={() => {
          navigate("/notifications");
        }}
      >
        <MdNotifications size={24} />
      </button>
    </div>
  );
}
