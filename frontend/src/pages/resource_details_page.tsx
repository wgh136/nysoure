import { useLocation, useNavigate, useParams } from "react-router";
import {
  createContext,
  createRef,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ResourceDetails,
  RFile,
  Storage,
  Comment,
  Tag,
  Resource,
} from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import Markdown from "react-markdown";
import "../markdown.css";
import Loading from "../components/loading.tsx";
import {
  MdAdd,
  MdOutlineArchive,
  MdOutlineArticle,
  MdOutlineComment,
  MdOutlineDataset,
  MdOutlineDelete,
  MdOutlineDownload,
  MdOutlineEdit,
  MdOutlineLink,
  MdOutlineOpenInNew,
} from "react-icons/md";
import { app } from "../app.ts";
import { uploadingManager } from "../network/uploading.ts";
import { ErrorAlert } from "../components/alert.tsx";
import { useTranslation } from "react-i18next";
import Pagination from "../components/pagination.tsx";
import showPopup, { useClosePopup } from "../components/popup.tsx";
import { Turnstile } from "@marsidev/react-turnstile";
import Button from "../components/button.tsx";
import Badge from "../components/badge.tsx";
import Input, { TextArea } from "../components/input.tsx";
import { useAppContext } from "../components/AppContext.tsx";
import { BiLogoSteam } from "react-icons/bi";
import { CommentTile } from "../components/comment_tile.tsx";
import { CommentInput } from "../components/comment_input.tsx";

export default function ResourcePage() {
  const params = useParams();
  const { t } = useTranslation();

  const idStr = params.id;

  const id = idStr ? parseInt(idStr) : NaN;

  const [resource, setResource] = useState<ResourceDetails | null>(null);

  const [page, setPage] = useState(0);

  const location = useLocation();

  const reload = useCallback(async () => {
    if (!isNaN(id)) {
      setResource(null);
      const res = await network.getResourceDetails(id);
      if (res.success) {
        setResource(res.data!);
      } else {
        showToast({ message: res.message, type: "error" });
      }
    }
  }, [id]);

  useEffect(() => {
    if (location.state?.resource) {
      document.title = location.state?.resource.title;
    } else {
      document.title = t("Resource Details");
    }
  }, [location.state?.resource, t]);

  useEffect(() => {
    setResource(null);
    if (!isNaN(id)) {
      if (location.state) {
        setResource(location.state.resource);
      } else {
        network.getResourceDetails(id).then((res) => {
          if (res.success) {
            setResource(res.data!);
            document.title = res.data!.title;
          } else {
            showToast({ message: res.message, type: "error" });
          }
        });
      }
    }
  }, [id, location.state]);

  const navigate = useNavigate();

  // 标签页与hash的映射
  const tabHashList = ["description", "files", "comments"];
  // 读取hash对应的tab索引
  function getPageFromHash(hash: string) {
    const h = hash.replace(/^#/, "");
    const idx = tabHashList.indexOf(h);
    return idx === -1 ? 0 : idx;
  }
  // 设置hash
  function setHashByPage(idx: number) {
    window.location.hash = "#" + tabHashList[idx];
  }

  // 初始状态读取hash
  useEffect(() => {
    setPage(getPageFromHash(window.location.hash));
    // 监听hash变化
    const onHashChange = () => {
      setPage(getPageFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line
  }, []);

  // 切换标签页时同步hash
  const handleTabChange = (idx: number) => {
    setPage(idx);
    setHashByPage(idx);
  };

  if (isNaN(id)) {
    return (
      <div className="alert alert-error shadow-lg">
        <div>
          <span>{t("Resource ID is required")}</span>
        </div>
      </div>
    );
  }

  if (!resource) {
    return <Loading />;
  }

  return (
    <context.Provider value={reload}>
      <div className={"pt-2"}>
        <h1 className={"text-2xl font-bold px-4 py-2"}>{resource.title}</h1>
        {resource.alternativeTitles.map((e, i) => {
          return (
            <h2
              key={i}
              className={"text-lg px-4 py-1 text-gray-700 dark:text-gray-300"}
            >
              {e}
            </h2>
          );
        })}
        <button
          onClick={() => {
            navigate(`/user/${encodeURIComponent(resource.author.username)}`);
          }}
          className="border-b-2 mx-4 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out"
        >
          <div className="flex items-center ">
            <div className="avatar">
              <div className="w-6 rounded-full">
                <img
                  src={network.getUserAvatar(resource.author)}
                  alt={"avatar"}
                />
              </div>
            </div>
            <div className="w-2"></div>
            <div className="text-sm">{resource.author.username}</div>
          </div>
        </button>
        <Tags tags={resource.tags} />
        {resource.links && (
          <p className={"px-3 mt-2"}>
            {resource.links.map((l) => {
              return (
                <a href={l.url} target={"_blank"}>
                  <span
                    className={
                      "py-1 px-3 inline-flex items-center m-1 border border-base-300 rounded-2xl hover:bg-base-200 transition-colors cursor-pointer select-none"
                    }
                  >
                    {l.url.includes("steampowered.com") ? (
                      <BiLogoSteam size={20} />
                    ) : (
                      <MdOutlineLink size={20} />
                    )}
                    <span className={"ml-2 text-sm"}>{l.label}</span>
                  </span>
                </a>
              );
            })}
          </p>
        )}

        <div className="tabs tabs-box my-4 mx-2 p-4">
          <label className="tab transition-all">
            <input
              type="radio"
              name="my_tabs"
              checked={page === 0}
              onChange={() => handleTabChange(0)}
            />
            <MdOutlineArticle className="text-xl mr-2" />
            <span className="text-sm">{t("Description")}</span>
          </label>
          <div key={"article"} className="tab-content p-2">
            <Article resource={resource} />
          </div>

          <label className="tab transition-all">
            <input
              type="radio"
              name="my_tabs"
              checked={page === 1}
              onChange={() => handleTabChange(1)}
            />
            <MdOutlineDataset className="text-xl mr-2" />
            <span className="text-sm">{t("Files")}</span>
          </label>
          <div key={"files"} className="tab-content p-2">
            <Files files={resource.files} resourceID={resource.id} />
          </div>

          <label className="tab transition-all">
            <input
              type="radio"
              name="my_tabs"
              checked={page === 2}
              onChange={() => handleTabChange(2)}
            />
            <MdOutlineComment className="text-xl mr-2" />
            <span className="text-sm">{t("Comments")}</span>
            {resource.comments ? (
              <span
                className={`px-1.5 py-0.5 ml-1 rounded-full text-xs ${page === 2 ? "bg-accent text-accent-content" : "text-base-content/60"}`}
              >
                {resource.comments}
              </span>
            ) : null}
          </label>
          <div key={"comments"} className="tab-content p-2">
            <Comments resourceId={resource.id} />
          </div>

          <div className={"grow"}></div>
          {app.isAdmin() || app.user?.id === resource.author.id ? (
            <Button
              className={"btn-ghost btn-circle"}
              onClick={() => {
                navigate(`/resource/edit/${resource.id}`, { replace: true });
              }}
            >
              <MdOutlineEdit size={20} />
            </Button>
          ) : null}
          <DeleteResourceDialog
            resourceId={resource.id}
            uploaderId={resource.author.id}
          />
        </div>
        <div className="h-4"></div>
      </div>
    </context.Provider>
  );
}

function Tags({ tags }: { tags: Tag[] }) {
  const tagsMap = new Map<string, Tag[]>();

  const navigate = useNavigate();

  const { t } = useTranslation();

  for (const tag of tags || []) {
    const type = tag.type;
    if (!tagsMap.has(type)) {
      tagsMap.set(type, []);
    }
    tagsMap.get(type)?.push(tag);
  }

  return (
    <>
      {Array.from(tagsMap.entries()).map(([type, tags]) => (
        <p key={type} className={"px-4"}>
          <Badge key={type}>{type == "" ? t("Other") : type}</Badge>
          {tags.map((tag) => (
            <Badge
              key={tag.name}
              className={"m-1 cursor-pointer badge-soft badge-primary"}
              onClick={() => {
                navigate(`/tag/${tag.name}`);
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </p>
      ))}
    </>
  );
}

function DeleteResourceDialog({
  resourceId,
  uploaderId,
}: {
  resourceId: number;
  uploaderId?: number;
}) {
  const [isLoading, setLoading] = useState(false);

  const navigate = useNavigate();

  const { t } = useTranslation();

  const context = useAppContext();

  const handleDelete = async () => {
    if (isLoading) {
      return;
    }
    setLoading(true);
    const res = await network.deleteResource(resourceId);
    const dialog = document.getElementById(
      "delete_resource_dialog",
    ) as HTMLDialogElement;
    dialog.close();
    if (res.success) {
      showToast({
        message: t("Resource deleted successfully"),
        type: "success",
      });
      context.clear();
      navigate("/", { replace: true });
    } else {
      showToast({ message: res.message, type: "error" });
    }
    setLoading(false);
  };

  if (!app.isAdmin() && app.user?.id !== uploaderId) {
    return <></>;
  }

  return (
    <>
      <Button
        className={"btn-error btn-ghost btn-circle"}
        onClick={() => {
          const dialog = document.getElementById(
            "delete_resource_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineDelete size={20} className={"inline-block"} />
      </Button>
      <dialog id={`delete_resource_dialog`} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Delete Resource")}</h3>
          <p className="py-4">
            {t("Are you sure you want to delete the resource")}?{" "}
            {t("This action cannot be undone.")}
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">{t("Close")}</button>
            </form>
            <Button
              className="btn btn-error"
              isLoading={isLoading}
              onClick={handleDelete}
            >
              {t("Delete")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

const context = createContext<() => void>(() => { });

function Article({ resource }: { resource: ResourceDetails }) {
  return (
    <article>
      <Markdown
        components={{
          p: ({ node, ...props }) => {
            if (
              typeof props.children === "object" &&
              (props.children as ReactElement).type === "strong"
            ) {
              // @ts-ignore
              const child = (
                props.children as ReactElement
              ).props.children.toString() as string;
              if (child.startsWith("<iframe")) {
                // @ts-ignore
                let html = child;
                let splits = html.split(" ");
                splits = splits.filter((s: string) => {
                  return !(
                    s.startsWith("width") ||
                    s.startsWith("height") ||
                    s.startsWith("class") ||
                    s.startsWith("style")
                  );
                });
                html = splits.join(" ");
                return (
                  <div
                    className={`w-full my-3 max-w-xl rounded-xl overflow-clip ${html.includes("youtube") ? "aspect-video" : "h-48 sm:h-64"}`}
                    dangerouslySetInnerHTML={{
                      __html: html,
                    }}
                  ></div>
                );
              }
            } else if (
              typeof props.children === "object" &&
              // @ts-ignore
              props.children?.props &&
              // @ts-ignore
              props.children?.props.href
            ) {
              const a = props.children as ReactElement;
              const childProps = a.props as any;
              const href = childProps.href as string;
              // @ts-ignore
              if (childProps.children?.length === 2) {
                // @ts-ignore
                const first = childProps.children[0] as ReactNode;
                // @ts-ignore
                const second = childProps.children[1] as ReactNode;

                if (
                  typeof first === "object" &&
                  (typeof second === "string" || typeof second === "object")
                ) {
                  const img = first as ReactElement;
                  // @ts-ignore
                  if (img.type === "img") {
                    return (
                      <a
                        className={
                          "inline-block card shadow bg-base-100 no-underline hover:shadow-md transition-shadow my-2"
                        }
                        target={"_blank"}
                        href={href}
                      >
                        <figure className={"max-h-96 min-w-48 min-h-24"}>
                          {img}
                        </figure>
                        <div className={"card-body text-base-content text-lg"}>
                          <div className={"flex items-center"}>
                            <span className={"flex-1"}>{second}</span>
                            <span>
                              <MdOutlineOpenInNew size={24} />
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  }
                }
              }
              if (href.startsWith("https://store.steampowered.com/app/")) {
                const appId = href
                  .substring("https://store.steampowered.com/app/".length)
                  .split("/")[0];
                if (!Number.isNaN(Number(appId))) {
                  return (
                    <div className={"max-w-xl h-52 sm:h-48 my-2"}>
                      <iframe
                        className={"scheme-light"}
                        src={`https://store.steampowered.com/widget/${appId}/`}
                      ></iframe>
                    </div>
                  );
                }
              }
            }
            return <p {...props}>{props.children}</p>;
          },
          a: ({ node, ...props }) => {
            const href = props.href as string;
            const origin = window.location.origin;

            if (
              href.startsWith(origin) ||
              href.startsWith("/")
            ) {
              let path = href;
              if (path.startsWith(origin)) {
                path = path.substring(origin.length);
              }
              const content = props.children?.toString();
              if (path.startsWith("/resources/")) {
                const id = path.substring("/resources/".length);
                for (const r of resource.related ?? []) {
                  if (r.id.toString() === id) {
                    return <RelatedResourceCard r={r} content={content} />;
                  }
                }
              }
            }

            return <a target={"_blank"} {...props}></a>;
          },
        }}
      >
        {resource.article.replaceAll("\n", "  \n")}
      </Markdown>
    </article>
  );
}

function RelatedResourceCard({ r, content }: { r: Resource, content?: string }) {
  const navigate = useNavigate();

  const [articleWidth, setArticleWidth] = useState<number | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width !== articleWidth) {
          setArticleWidth(entry.contentRect.width);
        }
      }
    });
    const articleElement = document.querySelector("article");
    if (articleElement) {
      observer.observe(articleElement);
    }
  }, [])

  const imgHeight =
    r.image && r.image.width > r.image.height ? 320 : 420;
  let imgWidth = r.image
    ? (r.image.width / r.image.height) * imgHeight
    : undefined;
  if (articleWidth && imgWidth && imgWidth > articleWidth) {
    imgWidth = articleWidth;
  }

  if (!articleWidth) {
    return <></>
  }

  return (
    <span className={"inline-flex max-w-full"}>
      <a
        href={"/resources/" + r.id}
        className={
          "mr-2 mb-2 max-w-full cursor-pointer inline-flex min-w-0 flex-col bg-base-100 shadow hover:shadow-md transition-shadow rounded-xl no-underline"
        }
        onClick={(e) => {
          e.preventDefault();
          navigate(`/resources/${r.id}`);
        }}
      >
        {r.image && (
          <img
            style={{
              width: imgWidth,
              height: imgHeight,
              objectFit: "cover",
            }}
            className={"h-full min-h-0 object-cover min-w-0"}
            alt={"cover"}
            src={network.getImageUrl(r.image?.id)}
          />
        )}
        <span
          className={"inline-flex flex-col p-4"}
          style={{
            width: imgWidth,
          }}
        >
          <span
            style={{
              maxWidth: "100%",
              textOverflow: "ellipsis",
              lineBreak: "anywhere",
              wordBreak: "break-all",
              fontSize: "1.2rem",
              fontWeight: "bold",
              lineHeight: "1.5rem",
              color: "var(--color-base-content)",
            }}
          >
            {r.title}
          </span>
          <span className={"h-2"}></span>
          <span
            style={{
              color: "var(--color-base-content)",
              lineBreak: "anywhere",
            }}
          >
            {content}
          </span>
        </span>
      </a>
    </span>
  );
}

function fileSizeToString(size: number) {
  if (size < 1024) {
    return size + "B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + "KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / 1024 / 1024).toFixed(2) + "MB";
  } else {
    return (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
  }
}

function FileTile({ file }: { file: RFile }) {
  const buttonRef = createRef<HTMLButtonElement>();

  const { t } = useTranslation();

  const userLink = `/user/${encodeURIComponent(file.user.username)}`;

  const navigate = useNavigate();

  return (
    <div className={"card shadow bg-base-100 mb-4"}>
      <div className={"p-4 flex flex-row items-center"}>
        <div className={"grow"}>
          <h4 className={"font-bold break-all"}>{file.filename}</h4>
          <p className={"text-sm my-1 whitespace-pre-wrap"}>
            {file.description}
          </p>
          <p className={"items-center mt-1"}>
            <a
              href={userLink}
              onClick={(e) => {
                e.preventDefault();
                navigate(userLink);
              }}
            >
              <Badge
                className={
                  "badge-soft badge-primary text-xs mr-2 hover:shadow-xs transition-shadow"
                }
              >
                <img
                  src={network.getUserAvatar(file.user)}
                  className={"w-4 h-4 rounded-full"}
                  alt={"avatar"}
                />
                {file.user.username}
              </Badge>
            </a>
            <Badge className={"badge-soft badge-secondary text-xs mr-2"}>
              <MdOutlineArchive size={16} className={"inline-block"} />
              {file.is_redirect ? t("Redirect") : fileSizeToString(file.size)}
            </Badge>
            <DeleteFileDialog fileId={file.id} uploaderId={file.user.id} />
            <UpdateFileInfoDialog file={file} />
          </p>
        </div>
        <div className={"flex flex-row items-center"}>
          <button
            ref={buttonRef}
            className={"btn btn-primary btn-soft btn-square"}
            onClick={() => {
              if (!app.cloudflareTurnstileSiteKey) {
                const link = network.getFileDownloadLink(file.id, "");
                window.open(link, "_blank");
              } else {
                showPopup(<CloudflarePopup file={file} />, buttonRef.current!);
              }
            }}
          >
            <MdOutlineDownload size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CloudflarePopup({ file }: { file: RFile }) {
  const closePopup = useClosePopup();

  const [isLoading, setLoading] = useState(true);

  const { t } = useTranslation();

  return (
    <div
      className={"menu bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm relative"}
    >
      {isLoading ? (
        <div
          className={
            "absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center"
          }
        >
          <span className={"loading loading-spinner loading-lg"}></span>
        </div>
      ) : null}
      <h3 className={"font-bold m-2"}>{t("Verifying your request")}</h3>
      <div className={"h-20 w-full"}>
        <Turnstile
          siteKey={app.cloudflareTurnstileSiteKey!}
          onWidgetLoad={() => {
            setLoading(false);
          }}
          onSuccess={(token) => {
            closePopup();
            const link = network.getFileDownloadLink(file.id, token);
            window.open(link, "_blank");
          }}
        ></Turnstile>
      </div>
      <p className={"text-xs text-base-content/80 m-2"}>
        {t(
          "Please check your network if the verification takes too long or the captcha does not appear.",
        )}
      </p>
    </div>
  );
}

function Files({ files, resourceID }: { files: RFile[]; resourceID: number }) {
  return (
    <div className={"pt-3"}>
      {files.map((file) => {
        return <FileTile file={file} key={file.id}></FileTile>;
      })}
      <div className={"h-2"}></div>
      {(app.canUpload() || app.allowNormalUserUpload) && (
        <div className={"flex flex-row-reverse"}>
          <CreateFileDialog resourceId={resourceID}></CreateFileDialog>
        </div>
      )}
    </div>
  );
}

enum FileType {
  redirect = "redirect",
  upload = "upload",
  serverTask = "server_task",
}

function CreateFileDialog({ resourceId }: { resourceId: number }) {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState(false);
  const storages = useRef<Storage[] | null>(null);
  const mounted = useRef(true);

  const [fileType, setFileType] = useState<FileType | null>(null);

  const [filename, setFilename] = useState<string>("");
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const [storage, setStorage] = useState<Storage | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");

  const [fileUrl, setFileUrl] = useState<string>("");

  const reload = useContext(context);

  const [isSubmitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async () => {
    if (isSubmitting) {
      return;
    }
    if (!fileType) {
      setError(t("Please select a file type"));
      return;
    }
    setSubmitting(true);
    if (fileType === FileType.redirect) {
      if (!redirectUrl || !filename || !description) {
        setError(t("Please fill in all fields"));
        setSubmitting(false);
        return;
      }
      const res = await network.createRedirectFile(
        filename,
        description,
        resourceId,
        redirectUrl,
      );
      if (res.success) {
        setSubmitting(false);
        const dialog = document.getElementById(
          "upload_dialog",
        ) as HTMLDialogElement;
        dialog.close();
        showToast({ message: t("File created successfully"), type: "success" });
        reload();
      } else {
        setError(res.message);
        setSubmitting(false);
      }
    } else if (fileType === FileType.upload) {
      if (!file || !storage) {
        setError(t("Please select a file and storage"));
        setSubmitting(false);
        return;
      }
      const res = await uploadingManager.addTask(
        file,
        resourceId,
        storage.id,
        description,
        () => {
          if (mounted.current) {
            reload();
          }
        },
      );
      if (res.success) {
        setSubmitting(false);
        const dialog = document.getElementById(
          "upload_dialog",
        ) as HTMLDialogElement;
        dialog.close();
        showToast({
          message: t("Successfully create uploading task."),
          type: "success",
        });
      } else {
        setError(res.message);
        setSubmitting(false);
      }
    } else if (fileType === FileType.serverTask) {
      if (!fileUrl || !filename || !storage) {
        setError(t("Please fill in all fields"));
        setSubmitting(false);
        return;
      }
      const res = await network.createServerDownloadTask(
        fileUrl,
        filename,
        description,
        resourceId,
        storage.id,
      );
      if (res.success) {
        setSubmitting(false);
        const dialog = document.getElementById(
          "upload_dialog",
        ) as HTMLDialogElement;
        dialog.close();
        showToast({ message: t("File created successfully"), type: "success" });
        reload();
      } else {
        setError(res.message);
        setSubmitting(false);
      }
    }
  };

  return (
    <>
      <button
        className={"btn btn-accent shadow"}
        onClick={() => {
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
                showToast({ message: res.message, type: "error" });
              } else {
                storages.current = res.data!;
                let defaultStorage = storages.current.find((s) => s.isDefault);
                if (!defaultStorage && storages.current.length > 0) {
                  defaultStorage = storages.current[0];
                }
                console.log("defaultStorage", defaultStorage);
                setStorage(defaultStorage || null);
                setLoading(false);
                const dialog = document.getElementById(
                  "upload_dialog",
                ) as HTMLDialogElement;
                dialog.showModal();
              }
            });
            return;
          }
          const dialog = document.getElementById(
            "upload_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        {isLoading ? (
          <span className={"loading loading-spinner loading-sm"}></span>
        ) : (
          <MdAdd size={24} />
        )}
        <span className={"text-sm"}>{t("Upload")}</span>
      </button>
      <dialog id="upload_dialog" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-2">{t("Create File")}</h3>

          {app.uploadPrompt && (
            <p className={"text-sm p-2"}>{app.uploadPrompt}</p>
          )}

          <p className={"text-sm font-bold p-2"}>{t("Type")}</p>
          <form className="filter mb-2">
            <input
              className="btn btn-square"
              type="reset"
              value="×"
              onClick={() => {
                setFileType(null);
              }}
            />
            <input
              className="btn text-sm"
              type="radio"
              name="type"
              aria-label={t("Redirect")}
              onInput={() => {
                setFileType(FileType.redirect);
              }}
            />
            <input
              className="btn text-sm"
              type="radio"
              name="type"
              aria-label={t("Upload")}
              onInput={() => {
                setFileType(FileType.upload);
              }}
            />
            <input
              className="btn text-sm"
              type="radio"
              name="type"
              aria-label={t("File Url")}
              onInput={() => {
                setFileType(FileType.serverTask);
              }}
            />
          </form>

          {fileType === FileType.redirect && (
            <>
              <p className={"text-sm p-2"}>
                {t("User who click the file will be redirected to the URL")}
              </p>
              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("File Name")}
                onChange={(e) => {
                  setFilename(e.target.value);
                }}
              />
              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("URL")}
                onChange={(e) => {
                  setRedirectUrl(e.target.value);
                }}
              />
              <textarea
                className="textarea w-full my-2"
                placeholder={t("Description")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </>
          )}

          {fileType === FileType.upload && (
            <>
              <p className={"text-sm p-2"}>
                {t(
                  "Upload a file to server, then the file will be moved to the selected storage.",
                )}
              </p>
              <select
                disabled={!app.canUpload()} // normal user cannot choose storage
                className="select select-primary w-full my-2"
                value={storage?.id || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (isNaN(id)) {
                    setStorage(null);
                  } else {
                    const s = storages.current?.find((s) => s.id == id);
                    if (s) {
                      setStorage(s);
                    }
                  }
                }}
              >
                <option value={""} disabled>
                  {t("Select Storage")}
                </option>
                {storages.current?.map((s) => {
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}({(s.currentSize / 1024 / 1024).toFixed(2)}/
                      {s.maxSize / 1024 / 1024}MB)
                    </option>
                  );
                })}
              </select>

              <input
                type="file"
                className="file-input w-full my-2"
                onChange={(e) => {
                  if (e.target.files) {
                    setFile(e.target.files[0]);
                  }
                }}
              />

              <textarea
                className="textarea w-full my-2"
                placeholder={t("Description")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </>
          )}

          {fileType === FileType.serverTask && !app.canUpload() && (
            <p className={"text-sm p-2"}>
              {t(
                "You do not have permission to upload files, please contact the administrator.",
              )}
            </p>
          )}

          {fileType === FileType.serverTask && app.canUpload() && (
            <>
              <p className={"text-sm p-2"}>
                {t(
                  "Provide a file url for the server to download, and the file will be moved to the selected storage.",
                )}
              </p>
              <select
                disabled={!app.canUpload()}
                className="select select-primary w-full my-2"
                value={storage?.id || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (isNaN(id)) {
                    setStorage(null);
                  } else {
                    const s = storages.current?.find((s) => s.id == id);
                    if (s) {
                      setStorage(s);
                    }
                  }
                }}
              >
                <option value={""} disabled>
                  {t("Select Storage")}
                </option>
                {storages.current?.map((s) => {
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}({(s.currentSize / 1024 / 1024).toFixed(2)}/
                      {s.maxSize / 1024 / 1024}MB)
                    </option>
                  );
                })}
              </select>

              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("File Name")}
                onChange={(e) => {
                  setFilename(e.target.value);
                }}
              />

              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("File URL")}
                onChange={(e) => {
                  setFileUrl(e.target.value);
                }}
              />

              <textarea
                className="textarea w-full my-2"
                placeholder={t("Description")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </>
          )}

          {error && <ErrorAlert className={"my-2"} message={error} />}

          <div className="modal-action">
            <form method="dialog">
              <button className="btn text-sm">{t("Cancel")}</button>
            </form>
            <button className={"btn btn-primary text-sm"} onClick={submit}>
              {isSubmitting ? (
                <span className={"loading loading-spinner loading-sm"}></span>
              ) : null}
              {t("Submit")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function UpdateFileInfoDialog({ file }: { file: RFile }) {
  const [isLoading, setLoading] = useState(false);

  const [filename, setFilename] = useState(file.filename);

  const [description, setDescription] = useState(file.description);

  const { t } = useTranslation();

  const reload = useContext(context);

  const handleUpdate = async () => {
    if (isLoading) {
      return;
    }
    setLoading(true);
    const res = await network.updateFile(file.id, filename, description);
    const dialog = document.getElementById(
      `update_file_info_dialog_${file.id}`,
    ) as HTMLDialogElement;
    dialog.close();
    if (res.success) {
      showToast({
        message: t("File info updated successfully"),
        type: "success",
      });
      reload();
    } else {
      showToast({ message: res.message, type: "error" });
    }
    setLoading(false);
  };

  if (!app.isAdmin() && app.user?.id !== file.user.id) {
    return <></>;
  }

  return (
    <>
      <button
        className={"btn btn-primary btn-ghost btn-circle btn-sm ml-1"}
        onClick={() => {
          const dialog = document.getElementById(
            `update_file_info_dialog_${file.id}`,
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineEdit size={16} className={"inline-block"} />
      </button>
      <dialog id={`update_file_info_dialog_${file.id}`} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Update File Info")}</h3>
          <Input
            type={"text"}
            label={t("File Name")}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <TextArea
            label={t("Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">{t("Close")}</button>
            </form>
            <button className="btn btn-primary" onClick={handleUpdate}>
              {t("Update")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function Comments({ resourceId }: { resourceId: number }) {
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(0);
  const [listKey, setListKey] = useState(0);

  const reload = useCallback(() => {
    setPage(1);
    setMaxPage(0);
    setListKey((prev) => prev + 1);
  }, []);

  return (
    <div>
      <CommentInput resourceId={resourceId} reload={reload} />
      <CommentsList
        resourceId={resourceId}
        page={page}
        maxPageCallback={setMaxPage}
        key={listKey}
      />
      {maxPage ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </div>
  );
}

function CommentsList({
  resourceId,
  page,
  maxPageCallback,
}: {
  resourceId: number;
  page: number;
  maxPageCallback: (maxPage: number) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);

  const reload = useContext(context);

  useEffect(() => {
    network.listResourceComments(resourceId, page).then((res) => {
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
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      {comments.map((comment) => {
        return (
          <CommentTile comment={comment} key={comment.id} onUpdated={reload} />
        );
      })}
    </>
  );
}

function DeleteFileDialog({
  fileId,
  uploaderId,
}: {
  fileId: string;
  uploaderId: number;
}) {
  const [isLoading, setLoading] = useState(false);

  const id = `delete_file_dialog_${fileId}`;

  const reload = useContext(context);

  const { t } = useTranslation();

  const handleDelete = async () => {
    if (isLoading) {
      return;
    }
    setLoading(true);
    const res = await network.deleteFile(fileId);
    const dialog = document.getElementById(id) as HTMLDialogElement;
    dialog.close();
    if (res.success) {
      showToast({ message: t("File deleted successfully"), type: "success" });
      reload();
    } else {
      showToast({ message: res.message, type: "error" });
    }
    setLoading(false);
  };

  if (!app.isAdmin() && app.user?.id !== uploaderId) {
    return <></>;
  }

  return (
    <>
      <button
        className={"btn btn-error btn-ghost btn-circle btn-sm ml-1"}
        onClick={() => {
          const dialog = document.getElementById(id) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineDelete size={16} className={"inline-block"} />
      </button>
      <dialog id={id} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Delete File")}</h3>
          <p className="py-4">
            {t(
              "Are you sure you want to delete the file? This action cannot be undone.",
            )}
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">{t("Close")}</button>
            </form>
            <button className="btn btn-error" onClick={handleDelete}>
              {t("Delete")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
