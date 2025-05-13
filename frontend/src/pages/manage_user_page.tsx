import { createRef, useCallback, useEffect, useState } from "react";
import { User } from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import Loading from "../components/loading";
import { MdMoreHoriz, MdSearch } from "react-icons/md";
import Pagination from "../components/pagination";
import showPopup, { PopupMenuItem } from "../components/popup";
import { useTranslation } from "react-i18next";

export default function UserView() {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(0);

  return <>
    <div className={"flex flex-row justify-between items-center mx-4 my-4"}>
      <form className={"flex flex-row gap-2 items-center w-64"} onSubmit={(e) => {
        e.preventDefault();
        setPage(0);
        const input = e.currentTarget.querySelector("input[type=search]") as HTMLInputElement;
        setSearchKeyword(input.value);
      }}>
        <label className="input">
          <MdSearch size={20} className="opacity-50" />
          <input type="search" className="grow" placeholder={t("Search")} id="search" />
        </label>
      </form>
    </div>
    <UserTable page={page} searchKeyword={searchKeyword} key={`${page}&${searchKeyword}`} totalPagesCallback={setTotalPages} />
    <div className={"flex flex-row justify-center items-center my-4"}>
      {totalPages ? <Pagination page={page} setPage={setPage} totalPages={totalPages} /> : null}
    </div>
  </>
}

function UserTable({ page, searchKeyword, totalPagesCallback }: { page: number, searchKeyword: string, totalPagesCallback: (totalPages: number) => void }) {
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
          })
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
          })
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

  return <div className={`rounded-box border border-base-content/10 bg-base-100 mx-4 mb-4 overflow-x-auto`}>
    <table className={"table"}>
      <thead>
        <tr>
          <td>{t("Username")}</td>
          <td>{t("Created At")}</td>
          <td>{t("Admin")}</td>
          <td>{t("Can Upload")}</td>
          <td>{t("Actions")}</td>
        </tr>
      </thead>
      <tbody>
        {
          users.map((u) => {
            return <UserRow key={u.id} user={u} onChanged={handleChanged} />
          })
        }
      </tbody>
    </table>
  </div>
}

function UserRow({ user, onChanged }: { user: User, onChanged: () => void }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const buttonRef = createRef<HTMLButtonElement>();

  const handleDelete = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  }

  const handleSetAdmin = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  }

  const handleSetUser = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  }

  const handleSetUploadPermission = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  }

  const handleRemoveUploadPermission = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
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
    setIsLoading(false);
  }

  return <tr key={user.id} className={"hover"}>
    <td>
      {user.username}
    </td>
    <td>
      {(new Date(user.created_at)).toLocaleDateString()}
    </td>
    <td>
      {user.is_admin ? t("Yes") : t("No")}
    </td>
    <td>
      {user.can_upload ? t("Yes") : t("No")}
    </td>
    <td>
      <div className="dropdown dropdown-bottom dropdown-end">
        <button ref={buttonRef} className="btn btn-square m-1" onClick={() => {
          showPopup(<ul className="menu bg-base-100 rounded-box z-1 w-64 p-2 shadow-sm">
            <h4 className="text-sm font-bold px-3 py-1 text-primary">{t("Actions")}</h4>
            <PopupMenuItem onClick={() => {
              const dialog = document.getElementById(`delete_user_dialog_${user.id}`) as HTMLDialogElement;
              dialog.showModal();
            }}>
              <a>{t("Delete")}</a>
            </PopupMenuItem>
            {user.is_admin ? <PopupMenuItem onClick={handleSetUser}><a>{t("Set as user")}</a></PopupMenuItem> : <PopupMenuItem onClick={handleSetAdmin}><a>{t("Set as admin")}</a></PopupMenuItem>}
            {user.is_admin ? (
              user.can_upload ? <PopupMenuItem onClick={handleRemoveUploadPermission}><a>{t("Remove upload permission")}</a></PopupMenuItem> : <PopupMenuItem onClick={handleSetUploadPermission}><a>{t("Grant upload permission")}</a></PopupMenuItem>
            ) : null}
          </ul>, buttonRef.current!);
        }}>
          {isLoading
            ? <span className="loading loading-spinner loading-sm"></span>
            : <MdMoreHoriz size={20} className="opacity-50" />}
        </button>
        <dialog id={`delete_user_dialog_${user.id}`} className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{t("Delete User")}</h3>
            <p className="py-4">{t("Are you sure you want to delete user")} <span className="font-bold">{user.username}</span>? {t("This action cannot be undone.")}</p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn btn-ghost">{t("Close")}</button>
                <button className="btn btn-error" onClick={handleDelete}>{t("Delete")}</button>
              </form>
            </div>
          </div>
        </dialog>
      </div>
    </td>
  </tr>
}