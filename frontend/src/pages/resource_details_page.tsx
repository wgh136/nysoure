import {useParams} from "react-router";
import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {ResourceDetails, RFile, Storage} from "../network/models.ts";
import {network} from "../network/network.ts";
import showToast from "../components/toast.ts";
import Markdown from "react-markdown";
import "../markdown.css";
import Loading from "../components/loading.tsx";
import {MdAdd, MdOutlineArticle, MdOutlineComment, MdOutlineDataset, MdOutlineDownload} from "react-icons/md";
import {app} from "../app.ts";
import {uploadingManager} from "../network/uploading.ts";
import {ErrorAlert} from "../components/alert.tsx";
import { useTranslation } from "react-i18next";

export default function ResourcePage() {
  const params = useParams()
  const { t } = useTranslation();

  const idStr = params.id

  const id = idStr ? parseInt(idStr) : NaN

  const [resource, setResource] = useState<ResourceDetails | null>(null)

  const [page, setPage] = useState(0)

  const reload = useCallback(async () => {
    if (!isNaN(id)) {
      setResource(null)
      const res = await network.getResourceDetails(id)
      if (res.success) {
        setResource(res.data!)
      } else {
        showToast({message: res.message, type: "error"})
      }
    }
  }, [id])

  useEffect(() => {
    if (!isNaN(id)) {
      network.getResourceDetails(id).then((res) => {
        if (res.success) {
          setResource(res.data!)
        } else {
          showToast({message: res.message, type: "error"})
        }
      })
    }
  }, [id])

  if (isNaN(id)) {
    return <div className="alert alert-error shadow-lg">
      <div>
        <span>{t("Resource ID is required")}</span>
      </div>
    </div>
  }

  if (!resource) {
    return <Loading/>
  }

  return <context.Provider value={reload}>
    <div className={"pt-2"}>
      <h1 className={"text-2xl font-bold px-4 py-2"}>{resource.title}</h1>
      {
        resource.alternativeTitles.map((e, i) => {
          return <h2 key={i} className={"text-lg px-4 py-1 text-gray-700 dark:text-gray-300"}>{e}</h2>
        })
      }
      <button
        className="border-b-2 mx-4 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out">
        <div className="flex items-center ">
          <div className="avatar">
            <div className="w-6 rounded-full">
              <img src={network.getUserAvatar(resource.author)} alt={"avatar"}/>
            </div>
          </div>
          <div className="w-2"></div>
          <div className="text-sm">{resource.author.username}</div>
        </div>
      </button>
      <p className={"px-4 pt-2"}>
        {
          resource.tags.map((e) => {
            return <span key={e.id} className="badge badge-primary mr-2 text-sm">{e.name}</span>
          })
        }
      </p>
      <div className="tabs tabs-box my-4 mx-2 p-4">
        <label className="tab">
          <input type="radio" name="my_tabs" checked={page === 0} onChange={() => {
            setPage(0)
          }}/>
          <MdOutlineArticle className="text-xl mr-2"/>
          <span className="text-sm">
          {t("Description")}
        </span>
        </label>
        <div key={"article"} className="tab-content p-2">
          <Article article={resource.article}/>
        </div>

        <label className="tab">
          <input type="radio" name="my_tabs" checked={page === 1} onChange={() => {
            setPage(1)
          }}/>
          <MdOutlineDataset className="text-xl mr-2"/>
          <span className="text-sm">
          {t("Files")}
        </span>
        </label>
        <div key={"files"} className="tab-content p-2">
          <Files files={resource.files} resourceID={resource.id}/>
        </div>

        <label className="tab">
          <input type="radio" name="my_tabs" checked={page === 2} onChange={() => {
            setPage(2)
          }}/>
          <MdOutlineComment className="text-xl mr-2"/>
          <span className="text-sm">
          {t("Comments")}
        </span>
        </label>
        <div key={"comments"} className="tab-content p-2">{t("Comments")}</div>
      </div>
      <div className="h-4"></div>
    </div>
  </context.Provider>
}

const context = createContext<() => void>(() => {
})

function Article({article}: { article: string }) {
  return <article>
    <Markdown>{article}</Markdown>
  </article>
}

function FileTile({file}: { file: RFile }) {
  return <div className={"card card-border border-base-300 my-2"}>
    <div className={"p-4 flex flex-row items-center"}>
      <div className={"grow"}>
        <h4 className={"font-bold py-1"}>{file.filename}</h4>
        <p className={"text-sm"}>{file.description}</p>
      </div>
      <div>
        <button className={"btn btn-primary btn-soft btn-square"} onClick={() => {
          const link = network.getFileDownloadLink(file.id);
          window.open(link, "_blank");
        }}>
          <MdOutlineDownload size={24}/>
        </button>
      </div>
    </div>
  </div>
}

function Files({files, resourceID}: { files: RFile[], resourceID: number }) {
  return <div>
    {
      files.map((file) => {
        return <FileTile file={file} key={file.id}></FileTile>
      })
    }
    <div className={"h-2"}></div>
    {
      app.isAdmin() && <div className={"flex flex-row-reverse"}>
        <CreateFileDialog resourceId={resourceID}></CreateFileDialog>
      </div>
    }
  </div>
}

enum FileType {
  redirect = "redirect",
  upload = "upload",
}

function CreateFileDialog({resourceId}: { resourceId: number }) {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(false)
  const storages = useRef<Storage[] | null>(null)
  const mounted = useRef(true)

  const [fileType, setFileType] = useState<FileType | null>(null)

  const [filename, setFilename] = useState<string>("")
  const [redirectUrl, setRedirectUrl] = useState<string>("")
  const [storage, setStorage] = useState<Storage | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState<string>("")

  const reload = useContext(context)

  const [isSubmitting, setSubmitting] = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, []);

  const submit = async () => {
    if (isSubmitting) {
      return
    }
    if (!fileType) {
      setError(t("Please select a file type"))
      return
    }
    setSubmitting(true)
    if (fileType === FileType.redirect) {
      if (!redirectUrl || !filename || !description) {
        setError(t("Please fill in all fields"));
        setSubmitting(false);
        return;
      }
      const res = await network.createRedirectFile(filename, description, resourceId, redirectUrl);
      if (res.success) {
        setSubmitting(false)
        const dialog = document.getElementById("upload_dialog") as HTMLDialogElement
        dialog.close()
        showToast({message: t("File created successfully"), type: "success"})
        reload()
      } else {
        setError(res.message)
        setSubmitting(false)
      }
    } else {
      if (!file || !storage) {
        setError(t("Please select a file and storage"))
        setSubmitting(false)
        return
      }
      const res = await uploadingManager.addTask(file, resourceId, storage.id, description, () => {
        if (mounted.current) {
          reload();
        }
      });
      if (res.success) {
        setSubmitting(false)
        const dialog = document.getElementById("upload_dialog") as HTMLDialogElement
        dialog.close()
        showToast({message: t("Successfully create uploading task."), type: "success"})
      } else {
        setError(res.message)
        setSubmitting(false)
      }
    }
  }

  return <>
    <button className={"btn btn-accent shadow"} onClick={() => {
      if (isLoading) {
        return;
      }
      if (storages.current == null) {
        setLoading(true);
        network.listStorages().then((res) => {
          if (!mounted.current) {
            return;
          }
          if (!res.success) {
            showToast({message: res.message, type: "error"})
          } else {
            storages.current = res.data!
            setLoading(false)
            const dialog = document.getElementById("upload_dialog") as HTMLDialogElement
            dialog.showModal()
          }
        });
        return;
      }
      const dialog = document.getElementById("upload_dialog") as HTMLDialogElement
      dialog.showModal()
    }}>
      {
        isLoading ? <span className={"loading loading-spinner loading-sm"}></span> : <MdAdd size={24}/>
      }
      <span className={"text-sm"}>
        {t("Upload")}
      </span>
    </button>
    <dialog id="upload_dialog" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-2">{t("Create File")}</h3>

        <p className={"text-sm font-bold p-2"}>{t("Type")}</p>
        <form className="filter mb-2">
          <input className="btn btn-square" type="reset" value="×" onClick={() => {
            setFileType(null);
          }}/>
          <input className="btn text-sm" type="radio" name="type" aria-label={t("Redirect")} onInput={() => {
            setFileType(FileType.redirect);
          }}/>
          <input className="btn text-sm" type="radio" name="type" aria-label={t("Upload")} onInput={() => {
            setFileType(FileType.upload);
          }}/>
        </form>

        {
          fileType === FileType.redirect && <>
            <p className={"text-sm p-2"}>{t("User who click the file will be redirected to the URL")}</p>
            <input type="text" className="input w-full my-2" placeholder={t("File Name")} onChange={(e) => {
              setFilename(e.target.value)
            }}/>
            <input type="text" className="input w-full my-2" placeholder={t("URL")} onChange={(e) => {
              setRedirectUrl(e.target.value)
            }}/>
            <input type="text" className="input w-full my-2" placeholder={t("Description")} onChange={(e) => {
              setDescription(e.target.value)
            }}/>
          </>
        }

        {
          fileType === FileType.upload && <>
            <p className={"text-sm p-2"}>{t("Upload a file to server, then the file will be moved to the selected storage.")}</p>
            <select className="select select-primary w-full my-2" defaultValue={""} onChange={(e) => {
              const id = parseInt(e.target.value)
              if (isNaN(id)) {
                setStorage(null)
              } else {
                const s = storages.current?.find((s) => s.id == id)
                if (s) {
                  setStorage(s)
                }
              }
            }}>
              <option value={""} disabled>{t("Select Storage")}</option>
              {
                storages.current?.map((s) => {
                  return <option key={s.id} value={s.id}>{s.name}</option>
                })
              }
            </select>

            <input
              type="file" className="file-input w-full my-2" onChange={(e) => {
              if (e.target.files) {
                setFile(e.target.files[0])
              }
            }}/>

            <input type="text" className="input w-full my-2" placeholder={t("Description")} onChange={(e) => {
              setDescription(e.target.value)
            }}/>
          </>
        }

        {error && <ErrorAlert className={"my-2"} message={error}/>}

        <div className="modal-action">
          <form method="dialog">
            <button className="btn text-sm">{t("Cancel")}</button>
          </form>
          <button className={"btn btn-primary text-sm"} onClick={submit}>
            {isSubmitting ? <span className={"loading loading-spinner loading-sm"}></span> : null}
            {t("Submit")}
          </button>
        </div>
      </div>
    </dialog>
  </>
}

