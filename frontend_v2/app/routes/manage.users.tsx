import { createRef, useCallback, useEffect, useState } from "react";
import type { User } from "~/network/models";
import { network } from "~/network/network";
import showToast from "~/components/toast";
import Loading from "~/components/loading";
import { MdMoreHoriz, MdSearch } from "react-icons/md";
import Pagination from "~/components/pagination";
import showPopup, { PopupMenuItem } from "~/components/popup";
import { useTranslation } from "~/hook/i18n";
import { configFromMatches, useConfig, isAdmin } from "~/hook/config";
import { ErrorAlert } from "~/components/alert";
import type { Route } from "./+types/manage.users";
import { Permission } from "~/network/models";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export default function UserView() {
  const { t } = useTranslation();
  const config = useConfig();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "banned">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  if (!config.user) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not logged in. Please log in to access this page.")}
      />
    );
  }

  if (!isAdmin(config)) {
    return (
      <ErrorAlert
        className={"m-4"}
        message={t("You are not authorized to access this page.")}
      />
    );
  }

  return (
    <>
      <div className={"flex flex-col gap-4 mx-4 my-4"}>
        <div role="tablist" className="tabs tabs-lifted">
          <a
            role="tab"
            className={`tab ${activeTab === "all" ? "tab-active" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setPage(1);
              setSearchKeyword("");
            }}
          >
            {t("All Users")}
          </a>
          <a
            role="tab"
            className={`tab ${activeTab === "banned" ? "tab-active" : ""}`}
            onClick={() => {
              setActiveTab("banned");
              setPage(1);
              setSearchKeyword("");
            }}
          >
            {t("Banned Users")}
          </a>
        </div>

        {activeTab === "all" && (
          <form
            className={"flex flex-row gap-2 items-center w-64"}
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              const input = e.currentTarget.querySelector(
                "input[type=search]",
              ) as HTMLInputElement;
              setSearchKeyword(input.value);
            }}
          >
            <label className="input">
              <MdSearch size={20} className="opacity-50" />
              <input
                type="search"
                className="grow"
                placeholder={t("Search")}
                id="search"
              />
            </label>
          </form>
        )}
      </div>

      {activeTab === "all" ? (
        <UserTable
          page={page}
          searchKeyword={searchKeyword}
          key={`all-${page}&${searchKeyword}`}
          totalPagesCallback={setTotalPages}
        />
      ) : (
        <BannedUserTable
          page={page}
          key={`banned-${page}`}
          totalPagesCallback={setTotalPages}
        />
      )}

      <div className={"flex flex-row justify-center items-center my-4"}>
        {totalPages ? (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        ) : null}
      </div>
    </>
  );
}

function UserTable({
  page,
  searchKeyword,
  totalPagesCallback,
}: {
  page: number;
  searchKeyword: string;
  totalPagesCallback: (totalPages: number) => void;
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[] | null>(null);

  const fetchUsers = useCallback(() => {
    if (searchKeyword) {
      network.searchUsers(searchKeyword, page).then((response) => {
        if (response.success) {
          setUsers(response.data!);
          totalPagesCallback(response.totalPages!);
        } else {
          showToast({
            type: "error",
            message: response.message,
          });
        }
      });
    } else {
      network.listUsers(page).then((response) => {
        if (response.success) {
          setUsers(response.data!);
          totalPagesCallback(response.totalPages!);
        } else {
          showToast({
            type: "error",
            message: response.message,
          });
        }
      });
    }
  }, [page, searchKeyword, totalPagesCallback]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChanged = useCallback(async () => {
    setUsers(null);
    fetchUsers();
  }, [fetchUsers]);

  if (users === null) {
    return <Loading />;
  }

  return (
    <div
      className={`rounded-box border border-base-content/10 bg-base-100 mx-4 mb-4 overflow-x-auto`}
    >
      <table className={"table"}>
        <thead>
          <tr>
            <td>{t("Username")}</td>
            <td>{t("Created At")}</td>
            <td>{t("Permission")}</td>
            <td>{t("Actions")}</td>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            return <UserRow key={u.id} user={u} onChanged={handleChanged} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

function BannedUserTable({
  page,
  totalPagesCallback,
}: {
  page: number;
  totalPagesCallback: (totalPages: number) => void;
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[] | null>(null);

  const fetchUsers = useCallback(() => {
    network.listBannedUsers(page).then((response) => {
      if (response.success) {
        setUsers(response.data!);
        totalPagesCallback(response.totalPages!);
      } else {
        showToast({
          type: "error",
          message: response.message,
        });
      }
    });
  }, [page, totalPagesCallback]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChanged = useCallback(async () => {
    setUsers(null);
    fetchUsers();
  }, [fetchUsers]);

  if (users === null) {
    return <Loading />;
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-base-content/50">{t("No banned users found")}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-box border border-base-content/10 bg-base-100 mx-4 mb-4 overflow-x-auto`}
    >
      <table className={"table"}>
        <thead>
          <tr>
            <td>{t("Username")}</td>
            <td>{t("Created At")}</td>
            <td>{t("Resources")}</td>
            <td>{t("Comments")}</td>
            <td>{t("Actions")}</td>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            return <BannedUserRow key={u.id} user={u} onChanged={handleChanged} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

function BannedUserRow({ user, onChanged }: { user: User; onChanged: () => void }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleUnban = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.unbanUser(user.id);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User unbanned successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  const handleDelete = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.deleteUser(user.id);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User deleted successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  return (
    <tr key={user.id} className={"hover"}>
      <td>
        <a
          href={`/user/${encodeURIComponent(user.username)}`}
          target="_blank"
          className="link link-hover text-primary"
        >
          {user.username}
        </a>
      </td>
      <td>{new Date(user.created_at).toLocaleDateString()}</td>
      <td>{user.resources_count}</td>
      <td>{user.comments_count}</td>
      <td>
        <div className="flex flex-row gap-2">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleUnban}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              t("Unban")
            )}
          </button>
          <button
            className="btn btn-sm btn-error"
            onClick={() => {
              const dialog = document.getElementById(
                `delete_banned_user_dialog_${user.id}`,
              ) as HTMLDialogElement;
              dialog.showModal();
            }}
            disabled={isLoading}
          >
            {t("Delete")}
          </button>
        </div>
        <dialog id={`delete_banned_user_dialog_${user.id}`} className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{t("Delete User")}</h3>
            <p className="py-4">
              {t("Are you sure you want to delete user")}{" "}
              <span className="font-bold">{user.username}</span>?{" "}
              {t("This action cannot be undone.")}
            </p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn btn-ghost">{t("Close")}</button>
                <button className="btn btn-error" onClick={handleDelete}>
                  {t("Delete")}
                </button>
              </form>
            </div>
          </div>
        </dialog>
      </td>
    </tr>
  );
}

function UserRow({ user, onChanged }: { user: User; onChanged: () => void }) {
  const { t } = useTranslation();
  const config = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = createRef<HTMLButtonElement>();

  const handleDelete = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.deleteUser(user.id);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User deleted successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  const handleSetAdmin = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.setUserAdmin(user.id, true);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User set as admin successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  const handleSetUser = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.setUserAdmin(user.id, false);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User set as user successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  const handleSetUploadPermission = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.setUserUploadPermission(user.id, true);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User set as upload permission successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  const handleRemoveUploadPermission = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await network.setUserUploadPermission(user.id, false);
      if (res.success) {
        showToast({
          type: "success",
          message: t("User removed upload permission successfully"),
        });
        onChanged();
      } else {
        showToast({
          type: "error",
          message: res.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user.id, t, onChanged]);

  return (
    <tr key={user.id} className={"hover"}>
      <td>
        {user.username}
        {user.banned && (
          <span className="badge badge-error badge-sm ml-2">{t("Banned")}</span>
        )}
      </td>
      <td>{new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        {user.permission === Permission.Admin && t("Admin")}
        {user.permission === Permission.Uploader && t("Uploader")}
        {user.permission === Permission.Verified && t("Verified")}
        {user.permission === Permission.User && t("User")}
        {user.permission === Permission.None && t("None")}
      </td>
      <td>
        <div className="dropdown dropdown-bottom dropdown-end">
          <button
            ref={buttonRef}
            className="btn btn-square m-1"
            onClick={() => {
              showPopup(
                <ul className="menu bg-base-100 rounded-box z-1 w-64 p-2 shadow-sm">
                  <h4 className="text-sm font-bold px-3 py-1 text-primary">
                    {t("Actions")}
                  </h4>
                  <PopupMenuItem
                    onClick={() => {
                      const dialog = document.getElementById(
                        `delete_user_dialog_${user.id}`,
                      ) as HTMLDialogElement;
                      dialog.showModal();
                    }}
                  >
                    <a>{t("Delete")}</a>
                  </PopupMenuItem>
                  {user.permission === Permission.Admin ? (
                    <PopupMenuItem onClick={handleSetUser}>
                      <a>{t("Set as user")}</a>
                    </PopupMenuItem>
                  ) : (
                    <PopupMenuItem onClick={handleSetAdmin}>
                      <a>{t("Set as admin")}</a>
                    </PopupMenuItem>
                  )}
                  {isAdmin(config) ? (
                    user.permission >= Permission.Uploader ? (
                      <PopupMenuItem onClick={handleRemoveUploadPermission}>
                        <a>{t("Remove upload permission")}</a>
                      </PopupMenuItem>
                    ) : (
                      <PopupMenuItem onClick={handleSetUploadPermission}>
                        <a>{t("Grant upload permission")}</a>
                      </PopupMenuItem>
                    )
                  ) : null}
                </ul>,
                buttonRef.current!,
              );
            }}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <MdMoreHoriz size={20} className="opacity-50" />
            )}
          </button>
          <dialog id={`delete_user_dialog_${user.id}`} className="modal">
            <div className="modal-box">
              <h3 className="font-bold text-lg">{t("Delete User")}</h3>
              <p className="py-4">
                {t("Are you sure you want to delete user")}{" "}
                <span className="font-bold">{user.username}</span>?{" "}
                {t("This action cannot be undone.")}
              </p>
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn btn-ghost">{t("Close")}</button>
                  <button className="btn btn-error" onClick={handleDelete}>
                    {t("Delete")}
                  </button>
                </form>
              </div>
            </div>
          </dialog>
        </div>
      </td>
    </tr>
  );
}
