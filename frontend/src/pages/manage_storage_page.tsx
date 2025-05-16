import {useEffect, useState} from "react";
import {Storage} from "../network/models.ts";
import {network} from "../network/network.ts";
import showToast from "../components/toast.ts";
import Loading from "../components/loading.tsx";
import {MdAdd, MdDelete} from "react-icons/md";
import {ErrorAlert} from "../components/alert.tsx";
import { useTranslation } from "react-i18next";
import { app } from "../app.ts";

export default function StorageView() {
  const { t } = useTranslation();
  const [storages, setStorages] = useState<Storage[] | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (app.user == null || !app.user.is_admin) {
      return;
    }
    network.listStorages().then((response) => {
      if (response.success) {
        setStorages(response.data!);
      } else {
        showToast({
          message: response.message,
          type: "error"
        });
      }
    })
  }, []);

  if (!app.user) {
    return <ErrorAlert className={"m-4"} message={t("You are not logged in. Please log in to access this page.")}/>
  }

  if (!app.user?.is_admin) {
    return <ErrorAlert className={"m-4"} message={t("You are not authorized to access this page.")}/>
  }

  if (storages == null) {
    return <Loading/>
  }

  const updateStorages = async () => {
    setStorages(null)
    const response = await network.listStorages();
    if (response.success) {
      setStorages(response.data!);
    } else {
      showToast({
        message: response.message,
        type: "error"
      });
    }
  }

  const handleDelete = async (id: number) => {
    if (loadingId != null) {
      return;
    }
    setLoadingId(id);
    const response = await network.deleteStorage(id);
    if (response.success) {
      showToast({
        message: t("Storage deleted successfully"),
      });
      updateStorages();
    } else {
      showToast({
        message: response.message,
        type: "error"
      });
    }
    setLoadingId(null);
  }

  return <>
    <div role="alert" className={`alert alert-info alert-outline ${storages.length !== 0 && "hidden"} mx-4 mb-4`}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
           className="h-6 w-6 shrink-0 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>
        {t("No storage found. Please create a new storage.")}
      </span>
    </div>
    <div className={`rounded-box border border-base-content/10 bg-base-100 mx-4 mb-4 overflow-x-auto ${storages.length === 0 ? "hidden" : ""}`}>
      <table className={"table"}>
        <thead>
        <tr>
          <td>{t("Name")}</td>
          <td>{t("Created At")}</td>
          <td>{t("Space")}</td>
          <td>{t("Action")}</td>
        </tr>
        </thead>
        <tbody>
        {
          storages.map((s) => {
            return <tr key={s.id} className={"hover"}>
              <td>
                {s.name}
              </td>
              <td>
                {(new Date(s.createdAt)).toLocaleString()}
              </td>
              <td>
                {(s.currentSize/1024/1024).toFixed(2)} / {s.maxSize/1024/1024} MB
              </td>
              <td>
                <button className={"btn btn-square"} type={"button"} onClick={() => {
                  const dialog = document.getElementById(`confirm_delete_dialog_${s.id}`) as HTMLDialogElement;
                  dialog.showModal();
                }}>
                  {loadingId === s.id ? <span className={"loading loading-spinner loading-sm"}></span> : <MdDelete size={24}/>}
                </button>
                <dialog id={`confirm_delete_dialog_${s.id}`} className="modal">
                  <div className="modal-box">
                    <h3 className="text-lg font-bold">{t("Delete Storage")}</h3>
                    <p className="py-4">
                      {t("Are you sure you want to delete this storage? This action cannot be undone.")}
                    </p>
                    <div className="modal-action">
                      <form method="dialog">
                        <button className="btn">{t("Cancel")}</button>
                      </form>
                      <button className="btn btn-error" onClick={() => {
                        handleDelete(s.id);
                      }}>
                        {t("Delete")}
                      </button>
                    </div>
                  </div>
                </dialog>
              </td>
            </tr>
          })
        }
        </tbody>
      </table>
    </div>
    <div className={"flex flex-row-reverse px-4"}>
      <NewStorageDialog onAdded={updateStorages}/>
    </div>
  </>
}

enum StorageType {
  local,
  s3,
}

function NewStorageDialog({onAdded}: { onAdded: () => void }) {
  const { t } = useTranslation();
  const [storageType, setStorageType] = useState<StorageType | null>(null);

  const [params, setParams] = useState({
    name: "",
    path: "",
    endPoint: "",
    accessKeyID: "",
    secretAccessKey: "",
    bucketName: "",
    maxSizeInMB: 0,
  });

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (storageType == null) {
      return;
    }
    setIsLoading(true);

    let response;
    if (storageType === StorageType.local) {
      if (params.path === "" || params.name === "" || params.maxSizeInMB <= 0) {
        setError(t("All fields are required"));
        setIsLoading(false);
        return;
      }
      response = await network.createLocalStorage(params.name, params.path, params.maxSizeInMB);
    } else if (storageType === StorageType.s3) {
      if (params.endPoint === "" || params.accessKeyID === "" || params.secretAccessKey === "" || params.bucketName === "" || params.name === "" || params.maxSizeInMB <= 0) {
        setError(t("All fields are required"));
        setIsLoading(false);
        return;
      }
      response = await network.createS3Storage(params.name, params.endPoint, params.accessKeyID, params.secretAccessKey, params.bucketName, params.maxSizeInMB);
    }

    if (response!.success) {
      showToast({
        message: t("Storage created successfully"),
      });
      onAdded();
      const dialog = document.getElementById("new_storage_dialog") as HTMLDialogElement;
      dialog.close();
    } else {
      setError(response!.message);
    }
    setIsLoading(false);
  }

  return <>
    <button className="btn" onClick={()=> {
      const dialog = document.getElementById("new_storage_dialog") as HTMLDialogElement;
      dialog.showModal();
    }}>
      <MdAdd/>
      {t("New Storage")}
    </button>
    <dialog id="new_storage_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg pb-4">{t("New Storage")}</h3>

        <p className={"text-sm font-bold p-2"}>{t("Type")}</p>
        <form className="filter mb-2">
          <input className="btn btn-square" type="reset" value="×" onClick={() => {
            setStorageType(null);
          }}/>
          <input className="btn" type="radio" name="type" aria-label={t("Local")} onInput={() => {
            setStorageType(StorageType.local);
          }}/>
          <input className="btn" type="radio" name="type" aria-label={t("S3")} onInput={() => {
            setStorageType(StorageType.s3);
          }}/>
        </form>

        {
          storageType === StorageType.local && <>
            <label className="input w-full my-2">
              {t("Name")}
              <input type="text" className="w-full" value={params.name} onChange={(e) => {
                setParams({
                  ...params,
                  name: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Path")}
              <input type="text" className="w-full" value={params.path} onChange={(e) => {
                setParams({
                  ...params,
                  path: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Max Size (MB)")}
              <input
                type="number"
                className="validator"
                required
                min="0"
                value={params.maxSizeInMB.toString()}
                onChange={(e) => {
                  setParams({
                    ...params,
                    maxSizeInMB: parseInt(e.target.value),
                  })
                }}
              />
            </label>
          </>
        }

        {
          storageType === StorageType.s3 && <>
            <label className="input w-full my-2">
              {t("Name")}
              <input type="text" className="w-full" value={params.name} onChange={(e) => {
                setParams({
                  ...params,
                  name: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Endpoint")}
              <input type="text" className="w-full" value={params.endPoint} onChange={(e) => {
                setParams({
                  ...params,
                  endPoint: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Access Key ID")}
              <input type="text" className="w-full" value={params.accessKeyID} onChange={(e) => {
                setParams({
                  ...params,
                  accessKeyID: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Secret Access Key")}
              <input type="text" className="w-full" value={params.secretAccessKey} onChange={(e) => {
                setParams({
                  ...params,
                  secretAccessKey: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Bucket Name")}
              <input type="text" className="w-full" value={params.bucketName} onChange={(e) => {
                setParams({
                  ...params,
                  bucketName: e.target.value,
                })
              }}/>
            </label>
            <label className="input w-full my-2">
              {t("Max Size (MB)")}
              <input
                type="number"
                className="validator"
                required
                min="0"
                value={params.maxSizeInMB.toString()}
                onChange={(e) => {
                  setParams({
                    ...params,
                    maxSizeInMB: parseInt(e.target.value),
                  })
                }}
              />
            </label>
          </>
        }

        {error !== "" && <ErrorAlert message={error} className={"my-2"}/>}

        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost">{t("Close")}</button>
          </form>
          <button className={"btn btn-primary"} onClick={handleSubmit} type={"button"}>
            {isLoading && <span className={"loading loading-spinner loading-sm mr-2"}></span>}
            {t("Submit")}
          </button>
        </div>
      </div>
    </dialog>
  </>
}