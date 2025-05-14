import { useTranslation } from "react-i18next";
import { app } from "../app";
import { ErrorAlert } from "../components/alert";
import { network } from "../network/network";
import { ReactNode, useState } from "react";
import { MdOutlineAccountCircle, MdLockOutline, MdOutlineEditNote } from "react-icons/md";
import Button from "../components/button";
import showToast from "../components/toast";
import { useNavigator } from "../components/navigator";

export function ManageMePage() {
  const { t } = useTranslation();

  if (!app.user) {
    return <ErrorAlert className={"m-4"} message={t("You are not logged in. Please log in to access this page.")} />
  }

  return <div className="px-2">
    <ChangeAvatarDialog />
    <ChangeUsernameDialog />
    <ChangePasswordDialog />
  </div>;
}

function ListTile({ title, icon, onClick }: { title: string, icon: ReactNode, onClick: () => void }) {
  return <div className="flex flex-row items-center h-12 px-2 bg-base-100 hover:bg-gray-200 cursor-pointer duration-200" onClick={onClick}>
    <div className="flex flex-row items-center">
      <span className="text-2xl">
        {icon}
      </span>
      <span className="ml-2">{title}</span>
    </div>
  </div>
}

function ChangeAvatarDialog() {
  const [avatar, setAvatar] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const navigator = useNavigator();

  const selectAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        setAvatar(files[0]);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!avatar) {
      return;
    }
    setIsLoading(true);
    const res = await network.changeAvatar(avatar);
    if (!res.success) {
      setError(res.message);
    } else {
      app.user = res.data!;
      navigator.refresh();
      showToast({
        message: "Avatar changed successfully",
        type: "success",
      })
      const dialog = document.getElementById("change_avatar_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.close();
      }
    }
  }

  return <>
    <ListTile icon={<MdOutlineAccountCircle />} title="Change Avatar" onClick={() => {
      const dialog = document.getElementById("change_avatar_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.showModal();
      }
    }} />
    <dialog id="change_avatar_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Change Avatar</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="avatar">
            <div className="w-28 rounded-full cursor-pointer" onClick={selectAvatar}>
              <img src={avatar ? URL.createObjectURL(avatar) : network.getUserAvatar(app.user!)} />
            </div>
          </div>
        </div>
        {error && <ErrorAlert message={error} className={"m-4"} />}
        <div className="modal-action">
          <form method="dialog">
            <Button>Close</Button>
          </form>
          <Button className="btn-primary" onClick={handleSubmit} isLoading={isLoading} disabled={avatar == null}>Save</Button>
        </div>
      </div>
    </dialog>
  </>
}

function ChangeUsernameDialog() {
  const [newUsername, setNewUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigator = useNavigator();

  const handleSubmit = async () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty");
      return;
    }
    setIsLoading(true);
    const res = await network.changeUsername(newUsername);
    setIsLoading(false);
    if (!res.success) {
      setError(res.message);
    } else {
      app.user = res.data!;
      navigator.refresh();
      showToast({
        message: "Username changed successfully",
        type: "success",
      });
      const dialog = document.getElementById("change_username_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.close();
      }
      setNewUsername("");
      setError(null);
    }
  };

  return <>
    <ListTile icon={<MdOutlineEditNote />} title="Change Username" onClick={() => {
      const dialog = document.getElementById("change_username_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.showModal();
      }
    }} />
    <dialog id="change_username_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Change Username</h3>
        <div className="input mt-4 w-full">
          <label className="label">
            New Username
          </label>
          <input 
            type="text" 
            placeholder="Enter new username" 
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>
        {error && <ErrorAlert message={error} className={"mt-4"} />}
        <div className="modal-action">
          <form method="dialog">
            <Button>Close</Button>
          </form>
          <Button 
            className="btn-primary" 
            onClick={handleSubmit} 
            isLoading={isLoading} 
            disabled={!newUsername.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </dialog>
  </>;
}

function ChangePasswordDialog() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate input
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    const res = await network.changePassword(oldPassword, newPassword);
    setIsLoading(false);

    if (!res.success) {
      setError(res.message);
    } else {
      // Update the token as it might have changed
      app.token = res.data!.token;
      app.user = res.data!;
      
      showToast({
        message: "Password changed successfully",
        type: "success",
      });
      
      const dialog = document.getElementById("change_password_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.close();
      }
      
      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  };

  return <>
    <ListTile icon={<MdLockOutline />} title="Change Password" onClick={() => {
      const dialog = document.getElementById("change_password_dialog") as HTMLDialogElement;
      if (dialog) {
        dialog.showModal();
      }
    }} />
    <dialog id="change_password_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-2">Change Password</h3>
        
        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">Current Password</legend>
          <input 
            type="password" 
            placeholder="Enter current password" 
            value={oldPassword}
            className="input w-full"
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </fieldset>
        
        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">New Password</legend>
          <input 
            type="password" 
            placeholder="Enter new password" 
            value={newPassword}
            className="input w-full"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </fieldset>

        <fieldset className="fieldset w-full">
          <legend className="fieldset-legend">Confirm New Password</legend>
          <input 
            type="password" 
            placeholder="Confirm new password" 
            value={confirmPassword}
            className="input w-full"
            onChange={(e) => setConfirmPassword(e.target.value)}
          /> 
        </fieldset>
        
        {error && <ErrorAlert message={error} className={"mt-4"} />}
        
        <div className="modal-action">
          <form method="dialog">
            <Button>Close</Button>
          </form>
          <Button 
            className="btn-primary" 
            onClick={handleSubmit} 
            isLoading={isLoading} 
            disabled={!oldPassword || !newPassword || !confirmPassword}
          >
            Save
          </Button>
        </div>
      </div>
    </dialog>
  </>;
}