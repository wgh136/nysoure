import { useNavigate, useParams } from "react-router";
import { createContext, createRef, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ResourceDetails, RFile, Storage, Comment } from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import Markdown from "react-markdown";
import "../markdown.css";
import Loading from "../components/loading.tsx";
import {
  MdAdd,
  MdOutlineArticle,
  MdOutlineComment,
  MdOutlineDataset,
  MdOutlineDelete,
  MdOutlineDownload, MdOutlineEdit
} from "react-icons/md";
import { app } from "../app.ts";
import { uploadingManager } from "../network/uploading.ts";
import { ErrorAlert } from "../components/alert.tsx";
import { useTranslation } from "react-i18next";
import Pagination from "../components/pagination.tsx";
import showPopup, { useClosePopup } from "../components/popup.tsx";
import { Turnstile } from "@marsidev/react-turnstile";
import Button from "../components/button.tsx";
import Badge, { BadgeAccent } from "../components/badge.tsx";
import Input from "../components/input.tsx";

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
        showToast({ message: res.message, type: "error" })
      }
    }
  }, [id])

  useEffect(() => {
    document.title = t("Resource Details");
  }, [t])

  useEffect(() => {
    setResource(null);
    if (!isNaN(id)) {
      network.getResourceDetails(id).then((res) => {
        if (res.success) {
          setResource(res.data!)
          document.title = res.data!.title
        } else {
          showToast({ message: res.message, type: "error" })
        }
      })
    }
  }, [id])

  const navigate = useNavigate()

  if (isNaN(id)) {
    return <div className="alert alert-error shadow-lg">
      <div>
        <span>{t("Resource ID is required")}</span>
      </div>
    </div>
  }

  if (!resource) {
    return <Loading />
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
        onClick={() => {
          navigate(`/user/${resource.author.username}`)
        }}
        className="border-b-2 mx-4 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out">
        <div className="flex items-center ">
          <div className="avatar">
            <div className="w-6 rounded-full">
              <img src={network.getUserAvatar(resource.author)} alt={"avatar"} />
            </div>
          </div>
          <div className="w-2"></div>
          <div className="text-sm">{resource.author.username}</div>
        </div>
      </button>
      <p className={"px-4 pt-2"}>
        {
          resource.tags.map((e) => {
            return <Badge key={e.id} className="cursor-pointer m-1" onClick={() => {
              navigate(`/tag/${e.name}`);
            }}>{e.name}</Badge>
          })
        }
      </p>
      <div className="tabs tabs-box my-4 mx-2 p-4">
        <label className="tab transition-all">
          <input type="radio" name="my_tabs" checked={page === 0} onChange={() => {
            setPage(0)
          }} />
          <MdOutlineArticle className="text-xl mr-2" />
          <span className="text-sm">
            {t("Description")}
          </span>
        </label>
        <div key={"article"} className="tab-content p-2">
          <Article resource={resource} />
        </div>

        <label className="tab transition-all">
          <input type="radio" name="my_tabs" checked={page === 1} onChange={() => {
            setPage(1)
          }} />
          <MdOutlineDataset className="text-xl mr-2" />
          <span className="text-sm">
            {t("Files")}
          </span>
        </label>
        <div key={"files"} className="tab-content p-2">
          <Files files={resource.files} resourceID={resource.id} />
        </div>

        <label className="tab transition-all">
          <input type="radio" name="my_tabs" checked={page === 2} onChange={() => {
            setPage(2)
          }} />
          <MdOutlineComment className="text-xl mr-2" />
          <span className="text-sm">
            {t("Comments")}
          </span>
        </label>
        <div key={"comments"} className="tab-content p-2">
          <Comments resourceId={resource.id} />
        </div>

        <div className={"grow"}></div>
        {
          app.isAdmin() || app.user?.id === resource.author.id ? <Button className={"btn-ghost btn-circle"} onClick={() => {
            navigate(`/resource/edit/${resource.id}`, { replace: true })
          }}>
            <MdOutlineEdit size={20} />
          </Button> : null
        }
        <DeleteResourceDialog resourceId={resource.id} uploaderId={resource.author.id} />
      </div>
      <div className="h-4"></div>
    </div>
  </context.Provider>
}

function DeleteResourceDialog({ resourceId, uploaderId }: { resourceId: number, uploaderId?: number }) {
  const [isLoading, setLoading] = useState(false)

  const navigate = useNavigate()

  const { t } = useTranslation()

  const handleDelete = async () => {
    if (isLoading) {
      return
    }
    setLoading(true)
    const res = await network.deleteResource(resourceId)
    const dialog = document.getElementById("delete_resource_dialog") as HTMLDialogElement
    dialog.close()
    if (res.success) {
      showToast({ message: t("Resource deleted successfully"), type: "success" })
      navigate("/", { replace: true })
    } else {
      showToast({ message: res.message, type: "error" })
    }
    setLoading(false)
  }

  if (!app.isAdmin() && app.user?.id !== uploaderId) {
    return <></>
  }

  return <>
    <Button className={"btn-error btn-ghost btn-circle"} onClick={() => {
      const dialog = document.getElementById("delete_resource_dialog") as HTMLDialogElement
      dialog.showModal()
    }}>
      <MdOutlineDelete size={20} className={"inline-block"} />
    </Button>
    <dialog id={`delete_resource_dialog`} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{t("Delete Resource")}</h3>
        <p
          className="py-4">{t("Are you sure you want to delete the resource")}? {t("This action cannot be undone.")}</p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost">{t("Close")}</button>
          </form>
          <Button className="btn btn-error" isLoading={isLoading} onClick={handleDelete}>{t("Delete")}</Button>
        </div>
      </div>
    </dialog>
  </>
}

const context = createContext<() => void>(() => {
})

function Article({ resource }: { resource: ResourceDetails }) {
  const articleRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()

  useEffect(() => {
    if (articleRef.current) {
      if (!resource.related) {
        return;
      }
      for (const child of articleRef.current.children) {
        if (child.tagName === "P" && child.children.length === 1 && child.children[0].tagName === "A") {
          const href = (child.children[0] as HTMLAnchorElement).href as string
          if (href.startsWith(window.location.origin) || href.startsWith("/")) {
            let path = href
            if (path.startsWith(window.location.origin)) {
              path = path.substring(window.location.origin.length)
            }
            if (path.startsWith("/resources/")) {
              const content = child.children[0].innerHTML
              const id = path.substring("/resources/".length)
              for (let r of resource.related) {
                if (r.id.toString() === id) {
                  child.children[0].classList.add("hidden")
                  let div = document.createElement("div")
                  div.innerHTML = `
                    ${child.innerHTML}
                    <div class="card card-border w-full border-base-300 my-3 sm:card-side">
                      ${r.image ? `
                        <figure>
                          <img
                            class="w-full h-40 sm:h-full sm:w-32 object-cover"
                            src="${network.getImageUrl(r.image!.id)}"
                            alt="Cover" />
                        </figure>
                      ` : ""}
                      <div class="card-body" style="padding: 1rem">
                        <h3>${r.title}</h4>
                        <p class="text-sm">${content}</p>
                      </div>
                    </div>
                  `
                  child.appendChild(div);

                  (child as HTMLParagraphElement).onclick = (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    navigate(`/resources/${r.id}`)
                    div.remove();
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [navigate, resource])

  return <article ref={articleRef}>
    <Markdown>{resource.article}</Markdown>
  </article>
}

function fileSizeToString(size: number) {
  if (size < 1024) {
    return size + "B"
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + "KB"
  } else if (size < 1024 * 1024 * 1024) {
    return (size / 1024 / 1024).toFixed(2) + "MB"
  } else {
    return (size / 1024 / 1024 / 1024).toFixed(2) + "GB"
  }
}

function FileTile({ file }: { file: RFile }) {
  const buttonRef = createRef<HTMLButtonElement>()

  const { t } = useTranslation()

  return <div className={"card card-border border-base-300 my-2"}>
    <div className={"p-4 flex flex-row items-center"}>
      <div className={"grow"}>
        <h4 className={"font-bold py-1"}>{file.filename}</h4>
        <p className={"text-sm"}>{file.description}</p>
        <p>
          <BadgeAccent className={"mt-1"}>{file.is_redirect ? t("Redirect") : fileSizeToString(file.size)}</BadgeAccent>
        </p>
      </div>
      <div className={"flex flex-row items-center"}>
        <button ref={buttonRef} className={"btn btn-primary btn-soft btn-square"} onClick={() => {
          if (!app.cloudflareTurnstileSiteKey) {
            const link = network.getFileDownloadLink(file.id, "");
            window.open(link, "_blank");
          } else {
            showPopup(<CloudflarePopup file={file} />, buttonRef.current!)
          }
        }}>
          <MdOutlineDownload size={24} />
        </button>
        <DeleteFileDialog fileId={file.id} uploaderId={file.user_id} />
        <UpdateFileInfoDialog file={file} />
      </div>
    </div>
  </div>
}

function CloudflarePopup({ file }: { file: RFile }) {
  const closePopup = useClosePopup()

  const [isLoading, setLoading] = useState(true)

  return <div className={"menu bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm h-20 relative"}>
    {
      isLoading ? <div className={"absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center"}>
        <span className={"loading loading-spinner loading-lg"}></span>
      </div> : null
    }
    <Turnstile siteKey={app.cloudflareTurnstileSiteKey!} onWidgetLoad={() => {
      setLoading(false)
    }} onSuccess={(token) => {
      closePopup();
      const link = network.getFileDownloadLink(file.id, token);
      window.open(link, "_blank");
    }}></Turnstile>
  </div>
}

function Files({ files, resourceID }: { files: RFile[], resourceID: number }) {
  return <div>
    {
      files.map((file) => {
        return <FileTile file={file} key={file.id}></FileTile>
      })
    }
    <div className={"h-2"}></div>
    {
      app.canUpload() && <div className={"flex flex-row-reverse"}>
        <CreateFileDialog resourceId={resourceID}></CreateFileDialog>
      </div>
    }
  </div>
}

enum FileType {
  redirect = "redirect",
  upload = "upload",
}

function CreateFileDialog({ resourceId }: { resourceId: number }) {
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
        showToast({ message: t("File created successfully"), type: "success" })
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
        showToast({ message: t("Successfully create uploading task."), type: "success" })
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
            showToast({ message: res.message, type: "error" })
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
        isLoading ? <span className={"loading loading-spinner loading-sm"}></span> : <MdAdd size={24} />
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
          }} />
          <input className="btn text-sm" type="radio" name="type" aria-label={t("Redirect")} onInput={() => {
            setFileType(FileType.redirect);
          }} />
          <input className="btn text-sm" type="radio" name="type" aria-label={t("Upload")} onInput={() => {
            setFileType(FileType.upload);
          }} />
        </form>

        {
          fileType === FileType.redirect && <>
            <p className={"text-sm p-2"}>{t("User who click the file will be redirected to the URL")}</p>
            <input type="text" className="input w-full my-2" placeholder={t("File Name")} onChange={(e) => {
              setFilename(e.target.value)
            }} />
            <input type="text" className="input w-full my-2" placeholder={t("URL")} onChange={(e) => {
              setRedirectUrl(e.target.value)
            }} />
            <input type="text" className="input w-full my-2" placeholder={t("Description")} onChange={(e) => {
              setDescription(e.target.value)
            }} />
          </>
        }

        {
          fileType === FileType.upload && <>
            <p
              className={"text-sm p-2"}>{t("Upload a file to server, then the file will be moved to the selected storage.")}</p>
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
                  return <option key={s.id}
                    value={s.id}>{s.name}({(s.currentSize / 1024 / 1024).toFixed(2)}/{s.maxSize / 1024 / 1024}MB)</option>
                })
              }
            </select>

            <input
              type="file" className="file-input w-full my-2" onChange={(e) => {
                if (e.target.files) {
                  setFile(e.target.files[0])
                }
              }} />

            <input type="text" className="input w-full my-2" placeholder={t("Description")} onChange={(e) => {
              setDescription(e.target.value)
            }} />
          </>
        }

        {error && <ErrorAlert className={"my-2"} message={error} />}

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

function UpdateFileInfoDialog({ file }: { file: RFile }) {
  const [isLoading, setLoading] = useState(false)

  const [filename, setFilename] = useState(file.filename)

  const [description, setDescription] = useState(file.description)

  const { t } = useTranslation()

  const reload = useContext(context)

  const handleUpdate = async () => {
    if (isLoading) {
      return
    }
    setLoading(true)
    const res = await network.updateFile(file.id, filename, description);
    const dialog = document.getElementById(`update_file_info_dialog_${file.id}`) as HTMLDialogElement
    dialog.close()
    if (res.success) {
      showToast({ message: t("File info updated successfully"), type: "success" })
      reload()
    } else {
      showToast({ message: res.message, type: "error" })
    }
    setLoading(false)
  }

  if (!app.isAdmin() && app.user?.id !== file.user_id) {
    return <></>
  }

  return <>
    <button className={"btn btn-primary btn-ghost btn-circle ml-1"} onClick={() => {
      const dialog = document.getElementById(`update_file_info_dialog_${file.id}`) as HTMLDialogElement
      dialog.showModal()
    }}>
      <MdOutlineEdit size={20} className={"inline-block"} />
    </button>
    <dialog id={`update_file_info_dialog_${file.id}`} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{t("Update File Info")}</h3>
        <Input type={"text"} label={t("File Name")} value={filename} onChange={(e) => setFilename(e.target.value)} />
        <Input type={"text"} label={t("Description")} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost">{t("Close")}</button>
          </form>
          <button className="btn btn-primary" onClick={handleUpdate}>{t("Update")}</button>
        </div>
      </div>
    </dialog>
  </>
}

function Comments({ resourceId }: { resourceId: number }) {
  const [page, setPage] = useState(1);

  const [maxPage, setMaxPage] = useState(0);

  const [listKey, setListKey] = useState(0);

  const [commentContent, setCommentContent] = useState("");

  const [isLoading, setLoading] = useState(false);

  const { t } = useTranslation();

  const reload = useCallback(() => {
    setPage(1);
    setMaxPage(0);
    setListKey(prev => prev + 1);
  }, [])

  const sendComment = async () => {
    if (isLoading) {
      return;
    }
    if (commentContent === "") {
      showToast({ message: t("Comment content cannot be empty"), type: "error" });
      return;
    }
    setLoading(true);
    const res = await network.createComment(resourceId, commentContent);
    if (res.success) {
      setCommentContent("");
      showToast({ message: t("Comment created successfully"), type: "success" });
      reload();
    } else {
      showToast({ message: res.message, type: "error" });
    }
    setLoading(false);
  }

  return <div>
    <div className={"mt-4 mb-6 textarea w-full p-4 h-28 flex flex-col"}>
      <textarea placeholder={t("Write down your comment")} className={"w-full resize-none grow"} value={commentContent}
        onChange={(e) => setCommentContent(e.target.value)} />
      <div className={"flex flex-row-reverse"}>
        <button onClick={sendComment}
          className={`btn btn-primary h-8 text-sm mx-2 ${commentContent === "" && "btn-disabled"}`}>
          {isLoading ? <span className={"loading loading-spinner loading-sm"}></span> : null}
          Submit
        </button>
      </div>
    </div>
    <CommentsList resourceId={resourceId} page={page} maxPageCallback={setMaxPage} key={listKey} />
    {maxPage && <div className={"w-full flex justify-center"}>
      <Pagination page={page} setPage={setPage} totalPages={maxPage} />
    </div>}
  </div>
}

function CommentsList({ resourceId, page, maxPageCallback }: {
  resourceId: number,
  page: number,
  maxPageCallback: (maxPage: number) => void
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);

  useEffect(() => {
    network.listComments(resourceId, page).then((res) => {
      if (res.success) {
        setComments(res.data!);
        maxPageCallback(res.totalPages || 1);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [maxPageCallback, page, resourceId]);

  if (comments == null) {
    return <div className={"w-full"}>
      <Loading />
    </div>
  }

  return <>
    {
      comments.map((comment) => {
        return <CommentTile comment={comment} key={comment.id} />
      })
    }
  </>
}

function CommentTile({ comment }: { comment: Comment }) {
  const navigate = useNavigate();
  return <div className={"card card-border border-base-300 p-2 my-3"}>
    <div className={"flex flex-row items-center my-1 mx-1"}>
      <div className="avatar cursor-pointer" onClick={() => navigate(`/user/${comment.user.username}`)}>
        <div className="w-8 rounded-full">
          <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
        </div>
      </div>
      <div className={"w-2"}></div>
      <div
        className={"text-sm font-bold cursor-pointer"}
        onClick={() => navigate(`/user/${comment.user.username}`)}
      >
        {comment.user.username}
      </div>
      <div className={"grow"}></div>
      <div className={"text-sm text-gray-500"}>{new Date(comment.created_at).toLocaleString()}</div>
    </div>
    <div className={"text-sm p-2"}>
      {comment.content}
    </div>
  </div>
}

function DeleteFileDialog({ fileId, uploaderId }: { fileId: string, uploaderId: number }) {
  const [isLoading, setLoading] = useState(false)

  const id = `delete_file_dialog_${fileId}`

  const reload = useContext(context)

  const { t } = useTranslation();

  const handleDelete = async () => {
    if (isLoading) {
      return
    }
    setLoading(true)
    const res = await network.deleteFile(fileId)
    const dialog = document.getElementById(id) as HTMLDialogElement
    dialog.close()
    if (res.success) {
      showToast({ message: t("File deleted successfully"), type: "success" })
      reload()
    } else {
      showToast({ message: res.message, type: "error" })
    }
    setLoading(false)
  }

  if (!app.isAdmin() && app.user?.id !== uploaderId) {
    return <></>
  }

  return <>
    <button className={"btn btn-error btn-ghost btn-circle ml-1"} onClick={() => {
      const dialog = document.getElementById(id) as HTMLDialogElement
      dialog.showModal()
    }}>
      <MdOutlineDelete size={20} className={"inline-block"} />
    </button>
    <dialog id={id} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{t("Delete File")}</h3>
        <p className="py-4">{t("Are you sure you want to delete the file? This action cannot be undone.")}</p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost">{t("Close")}</button>
          </form>
          <button className="btn btn-error" onClick={handleDelete}>{t("Delete")}</button>
        </div>
      </div>
    </dialog>
  </>
}
