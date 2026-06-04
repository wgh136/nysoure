import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { MdArrowUpward, MdClose, MdCloudUpload, MdMenu, MdOutlinePerson, MdOutlinePublish, MdShuffle, MdTimeline, MdInfoOutline, MdOutlineLabel, MdSearch, MdLogout, MdNotifications, MdOutlineSettings } from "react-icons/md";
import { useTranslation } from "./hook/i18n.js";
import { useConfig } from "./hook/config.js";
import { Permission } from "./network/models.ts";
import { ThemeSwitcher } from "./components/theme_switcher.js";
import { network } from "./network/network.js";
import { Background } from "./components/background.js";
import { uploadingManager, UploadingTask, UploadingStatus } from "./network/uploading.js";
import { Debounce } from "./utils/debounce.js";

export default function Layout() {
  const { server_name } = useConfig();

  return (
    <Background>
      <Navigator appName={server_name} />
      <div className="pt-20 max-w-8xl mx-auto px-2">
        <Outlet />
      </div>
    </Background>
  )
}

function Navigator({ appName }: { appName: string }) {
  const { t } = useTranslation();

  return (
      <div
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <FloatingToTopButton />
        <div className="z-3 fixed top-2 left-2 right-2 backdrop-blur-xs h-16 rounded-box max-w-8xl mx-auto" />
        <div className="z-4 fixed top-2 left-2 right-2 h-16 bg-base-100/90 rounded-box max-w-8xl mx-auto" />
        <div
          className="shadow-lg fixed top-2 left-2 right-2 z-5 lg:z-10 bg-transparent h-16 rounded-box px-2 lg:px-4 flex items-center max-w-8xl mx-auto"
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
                className="menu menu-md dropdown-content bg-base-100 rounded-box z-2 mt-3 w-52 p-2 shadow"
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
              <UploadingButton />
              <PublishButton />
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
    <>
      <button
        type="button"
        className="btn btn-primary hidden lg:flex"
        onClick={() => navigate("/publish?source=vndb")}
      >
        <MdOutlinePublish size={24} />
        <span>{t("Publish")}</span>
      </button>
      <button
        type="button"
        className="btn btn-primary btn-square lg:hidden"
        onClick={() => navigate("/publish?source=vndb")}
      >
        <MdOutlinePublish size={24} />
      </button>
    </>
  )
}

function UserButton() {
  const config = useConfig();
  const location = useLocation();
  const { t } = useTranslation();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!config.isLoggedIn) {
        return;
      }
      const res = await network.getUserNotificationsCount();
      if (res.success && res.data !== undefined) {
        setNotificationCount(res.data);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 60000); // 每分钟请求一次

    return () => clearInterval(interval);
  }, [config.isLoggedIn]);

  // Clear notification count when entering notifications page
  useEffect(() => {
    if (config.isLoggedIn) {
      if (location.pathname === '/notifications') {
        // Immediately clear the count when entering notifications page
        setNotificationCount(0);
      } else {
        // Fetch fresh count when on other pages
        const fetchCount = async () => {
          const res = await network.getUserNotificationsCount();
          if (res.success && res.data !== undefined) {
            setNotificationCount(res.data);
          }
        };
        fetchCount();
      }
    }
  }, [location.pathname, config.isLoggedIn]);

  if (!config.user) {
    return <NavLink
      to="/login"
      className="btn btn-primary btn-square btn-soft"
    >
      <MdOutlinePerson size={24} />
    </NavLink>
  }

  const handleLogout = async () => {
    const result = await network.logout();
    if (result.success) {
      // 退出成功，跳转到首页并刷新
      window.location.replace("/");
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <div className="indicator">
        {notificationCount > 0 && (
          <span className="indicator-item w-2 h-2 bg-error rounded-full"></span>
        )}
        <div
          tabIndex={0}
          role="button"
          className="btn btn-square avatar overflow-clip"
          onMouseDown={(e) => {
            const target = e.currentTarget;
            // 如果已经有焦点（菜单已打开），则阻止默认行为并手动关闭
            if (document.activeElement === target) {
              e.preventDefault();
              target.blur();
            }
          }}
        >
          <img alt="Avatar" className="w-10 object-cover" src={network.getUserAvatar(config.user!)} />
        </div>
      </div>
      <ul
        tabIndex={0}
        className="menu menu-md dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
      >
        <li
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          <NavLink to={`/user/${encodeURIComponent(config.user!.username)}`}>
            <MdOutlinePerson size={18} />
            {t("My Profile")}
          </NavLink>
        </li>
        {config.user?.permission === Permission.Admin && (
          <li
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            <NavLink to="/manage/tasks">
              <MdTimeline size={18} />
              {t("Server Tasks")}
            </NavLink>
          </li>
        )}
        <li
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          <NavLink to="/notifications">
            <MdNotifications size={18} />
            {t("Notifications")}
            {notificationCount > 0 && (
              <span className="badge badge-error badge-sm ml-auto">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </NavLink>
        </li>
        <li
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          <NavLink to="/manage/me">
            <MdOutlineSettings size={18} />
            {t("Settings")}
          </NavLink>
        </li>
        <li
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            handleLogout();
          }}
        >
          <a>
            <MdLogout size={18} />
            {t("Log out")}
          </a>
        </li>
      </ul>
    </div>
  )
}

function UploadingButton() {
  const [hasTasks, setHasTasks] = useState(uploadingManager.hasTasks());
  const [panelOpen, setPanelOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const update = () => setHasTasks(uploadingManager.hasTasks());
    uploadingManager.addListener(update);
    return () => uploadingManager.removeListener(update);
  }, []);

  useEffect(() => {
    if (!hasTasks) {
      setPanelOpen(false);
    }
  }, [hasTasks]);

  if (!hasTasks) return null;

  return (
    <>
      <button
        type="button"
        className="btn btn-square btn-soft"
        title={t("Uploading")}
        onClick={() => setPanelOpen(true)}
      >
        <MdCloudUpload size={24} className="animate-pulse" />
      </button>
      {panelOpen && (
        <UploadingPanel onClose={() => setPanelOpen(false)} />
      )}
    </>
  );
}

function UploadingPanel({ onClose }: { onClose: () => void }) {
  const [tasks, setTasks] = useState(() => uploadingManager.getTasks());
  const { t } = useTranslation();

  useEffect(() => {
    const update = () => setTasks(uploadingManager.getTasks());
    uploadingManager.addListener(update);
    return () => uploadingManager.removeListener(update);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-80 bg-base-100 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center gap-2">
            <MdCloudUpload size={20} className="animate-pulse text-primary" />
            <h2 className="text-lg font-bold">{t("Uploading")}</h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <MdClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-base-content/50 text-center mt-8">
              {t("No uploading tasks")}
            </p>
          ) : (
            tasks.map((task) => (
              <UploadingTaskTile key={task.id} task={task} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function UploadingTaskTile({ task }: { task: UploadingTask }) {
  const [, forceUpdate] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    task.addListener(update);
    return () => task.removeListener(update);
  }, [task]);

  const progressPercent = Math.round(task.progress * 100);

  const statusLabel = () => {
    if (task.status === UploadingStatus.UPLOADING) return `${progressPercent}%`;
    if (task.status === UploadingStatus.DONE) return t("Done");
    if (task.status === UploadingStatus.ERROR) return task.errorMessage || t("Error");
    return t("Pending");
  };

  const progressClass = () => {
    if (task.status === UploadingStatus.ERROR) return "progress progress-error w-full";
    if (task.status === UploadingStatus.DONE) return "progress progress-success w-full";
    return "progress progress-primary w-full";
  };

  return (
    <div className="card bg-base-200 p-3 gap-2">
      <div className="text-sm font-medium truncate" title={task.filename}>
        {task.filename}
      </div>
      <progress
        className={progressClass()}
        value={task.progress}
        max={1}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-base-content/60">{statusLabel()}</span>
        {task.status === UploadingStatus.UPLOADING && (
          <button
            type="button"
            className="btn btn-xs btn-ghost text-error"
            onClick={() => task.cancel()}
          >
            {t("Cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounce = useRef(new Debounce(250));
  const requestId = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    return () => debounce.current.cancel();
  }, []);

  const closeSearchDialog = () => {
    const dialog = document.getElementById(
      "search_dialog",
    ) as HTMLDialogElement | null;
    if (dialog) {
      dialog.close();
    }
  };

  const doSearch = (keyword = search) => {
    const trimmed = keyword.trim();
    if (trimmed.length === 0) {
      return;
    }
    closeSearchDialog();
    setSuggestions([]);
    setIsFocused(false);
    const replace = window.location.pathname === "/search";
    navigate(`/search?keyword=${encodeURIComponent(trimmed)}`, { replace: replace });
  };

  const updateSuggestions = (keyword: string) => {
    const trimmed = keyword.trim();
    requestId.current += 1;
    const currentRequestId = requestId.current;
    if (trimmed.length === 0) {
      debounce.current.cancel();
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }
    setIsSuggesting(true);
    debounce.current.run(async () => {
      const res = await network.searchTagSuggestions(trimmed);
      if (currentRequestId !== requestId.current) {
        return;
      }
      setIsSuggesting(false);
      if (!res.success) {
        setSuggestions([]);
        return;
      }
      setSuggestions(res.data ?? []);
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateSuggestions(value);
  };

  const showSuggestions = isFocused && (suggestions.length > 0 || isSuggesting);

  const searchField = (
    <div className="relative w-full sm:w-64">
      <label className="input input-primary w-full bg-base-100/60! shadow-xs">
        <MdSearch className="opacity-50 shrink-0" size={18} />
        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            doSearch();
          }}
        >
          <input
            type="search"
            className="w-full"
            required
            autoComplete="off"
            placeholder={t("Search")}
            value={search}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </form>
      </label>
      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-box border border-base-300 bg-base-100 shadow-lg overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {isSuggesting ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/70">
              <span className="loading loading-spinner loading-xs" />
              <span>{t("Searching...")}</span>
            </div>
          ) : (
            <ul className="menu menu-sm p-1 w-full" style={{borderRadius: "4px"}}>
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-start gap-2"
                    onClick={() => {
                      setSearch(suggestion);
                      doSearch(suggestion);
                    }}
                  >
                    <MdOutlineLabel size={16} className="shrink-0 opacity-70" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: show search field directly */}
      <div className="hidden sm:block">
        {searchField}
      </div>

      {/* Mobile: show search button and dialog */}
      <div className="sm:hidden">
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
      </div>
    </>
  );
}
