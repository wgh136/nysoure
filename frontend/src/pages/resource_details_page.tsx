import { useLocation, useNavigate, useParams } from "react-router";
import {
  createContext,
  createRef,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  Collection,
  CharacterParams,
} from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import Markdown from "react-markdown";
import "../markdown.css";
import Loading from "../components/loading.tsx";
import {
  MdAdd,
  MdOutlineAccessTime,
  MdOutlineAdd,
  MdOutlineArchive,
  MdOutlineArticle,
  MdOutlineChevronLeft,
  MdOutlineChevronRight,
  MdOutlineCloud,
  MdOutlineComment,
  MdOutlineContentCopy,
  MdOutlineDataset,
  MdOutlineDelete,
  MdOutlineDownload,
  MdOutlineEdit,
  MdOutlineFolderSpecial,
  MdOutlineLink,
  MdOutlineOpenInNew,
  MdOutlineVerifiedUser,
} from "react-icons/md";
import { app } from "../app.ts";
import { uploadingManager } from "../network/uploading.ts";
import { ErrorAlert } from "../components/alert.tsx";
import { useTranslation } from "../utils/i18n";
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
import { useNavigator } from "../components/navigator.tsx";
import KunApi, {
  kunLanguageToString,
  KunPatchResourceResponse,
  KunPatchResponse,
  kunPlatformToString,
  kunResourceTypeToString,
} from "../network/kun.ts";
import { Debounce } from "../utils/debounce.ts";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";

export default function ResourcePage() {
  const params = useParams();
  const { t } = useTranslation();

  const idStr = params.id;

  const id = idStr ? parseInt(idStr) : NaN;

  const [resource, setResource] = useState<ResourceDetails | null>(null);

  const [page, setPage] = useState(0);

  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(new Set([]));

  const location = useLocation();

  const navigator = useNavigator();

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
        const preFetchData = app.getPreFetchData();
        if (preFetchData?.resource?.id === id) {
          setResource(preFetchData.resource);
        } else {
          network.getResourceDetails(id).then((res) => {
            if (res.success) {
              setResource(res.data!);
            } else {
              showToast({ message: res.message, type: "error" });
            }
          });
        }
      }
    }
  }, [id, location.state]);

  useEffect(() => {
    if (resource) {
      document.title = resource.title;
      if (resource.images.length > 0) {
        navigator.setBackground(
          network.getResampledImageUrl(resource.images[0].id),
        );
      }
    }
  }, [resource]);

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
    setVisitedTabs(new Set([getPageFromHash(window.location.hash)]));
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
    // Mark tab as visited when switched to
    setVisitedTabs((prev) => new Set(prev).add(idx));
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
        <div className="flex">
          <div className="flex-1">
            <h1 className={"text-2xl font-bold px-4 py-2"}>{resource.title}</h1>
            {resource.alternativeTitles.map((e, i) => {
              return (
                <h2
                  key={i}
                  className={
                    "text-lg px-4 py-1 text-gray-700 dark:text-gray-300"
                  }
                >
                  {e}
                </h2>
              );
            })}
            <button
              onClick={() => {
                navigate(
                  `/user/${encodeURIComponent(resource.author.username)}`,
                );
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
            <div className={"px-3 mt-2 flex flex-wrap"}>
              {resource.links &&
                resource.links.map((l) => {
                  return (
                    <a href={l.url} target={"_blank"}>
                      <span
                        className={
                          "py-1 px-3 inline-flex items-center m-1 border border-base-300 bg-base-100 opacity-90 rounded-2xl hover:bg-base-200 transition-colors cursor-pointer select-none"
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
              <CollectionDialog rid={resource.id} />
            </div>
          </div>
          <div className="w-96 md:w-md lg:w-lg xl:w-xl p-4 hidden sm:flex items-center justify-center">
            <Gallery images={resource.gallery} nsfw={resource.galleryNsfw} />
          </div>
        </div>

        <div className="w-full p-4 flex sm:hidden items-center justify-center">
          <Gallery images={resource.gallery} nsfw={resource.galleryNsfw} />
        </div>

        <div
          className="tabs tabs-box my-4 mx-2 p-4 shadow"
          style={{
            backgroundColor: "rgb(var(--color-base-100-rgb) / 0.82)",
          }}
        >
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
            {visitedTabs.has(0) && <Article resource={resource} />}
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
            {visitedTabs.has(1) && (
              <Files files={resource.files} resource={resource} />
            )}
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
            {visitedTabs.has(2) && <Comments resourceId={resource.id} />}
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

  const compactMode = tags.length > 10;

  return (
    <>
      {Array.from(tagsMap.entries()).map(([type, tags]) => (
        <p key={type} className={"px-4"}>
          <Badge className="shadow-xs mr-0.5" key={type}>
            {type == "" ? t("Other") : type}
          </Badge>
          {tags.map((tag) => (
            <Badge
              key={tag.name}
              className={
                `${compactMode ? "m-0.5" : "m-1"} cursor-pointer badge-soft badge-primary shadow-xs`
              }
              onClick={() => {
                navigate(`/tag/${encodeURIComponent(tag.name)}`);
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

const context = createContext<() => void>(() => {});

function Article({ resource }: { resource: ResourceDetails }) {
  return (
    <>
    <article>
      <Markdown
        remarkPlugins={[remarkGfm]}
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

            if (href.startsWith(origin) || href.startsWith("/")) {
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
    <div className="border-b border-base-300 h-8"></div>
    <Characters characters={resource.characters} />
    </>
  );
}

function RelatedResourceCard({
  r,
  content,
}: {
  r: Resource;
  content?: string;
}) {
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
  }, []);

  const imgHeight = r.image && r.image.width > r.image.height ? 320 : 420;
  let imgWidth = r.image
    ? (r.image.width / r.image.height) * imgHeight
    : undefined;
  if (articleWidth && imgWidth && imgWidth > articleWidth) {
    imgWidth = articleWidth;
  }

  if (!articleWidth) {
    return <></>;
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
            className={"h-full object-cover min-w-0"}
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
  const buttonRef2 = createRef<HTMLButtonElement>();

  const { t } = useTranslation();

  const userLink = `/user/${encodeURIComponent(file.user.username)}`;

  const navigate = useNavigate();

  return (
    <div className={"card shadow bg-base-100 mb-4 p-4"}>
      <div className={"flex flex-row items-center"}>
        <div className={"grow"}>
          <h4 className={"font-bold break-all"}>{file.filename}</h4>
          <div className={"text-sm my-1 comment_tile"}>
            <Markdown>{file.description.replaceAll("\n", "  \n")}</Markdown>
          </div>
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
            {file.hash && (
              <>
                <Badge
                  className={
                    "badge-soft badge-accent text-xs mr-2 break-all hover:shadow-xs cursor-pointer transition-shadow"
                  }
                  onClick={() => {
                    const dialog = document.getElementById(
                      `file_md5_${file.id}`,
                    ) as HTMLDialogElement;
                    dialog.showModal();
                  }}
                >
                  <MdOutlineVerifiedUser size={16} className={"inline-block"} />
                  Md5
                </Badge>
                <dialog id={`file_md5_${file.id}`} className="modal">
                  <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Md5</h3>
                    <label className="input input-primary w-full">
                      <input type="text" readOnly value={file.hash} />
                      <button
                        className="btn btn-square btn-ghost btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(file.hash!);
                        }}
                      >
                        <MdOutlineContentCopy size={18} />
                      </button>
                    </label>
                    <div className="modal-action">
                      <form method="dialog">
                        <button className="btn">Close</button>
                      </form>
                    </div>
                  </div>
                </dialog>
              </>
            )}
            {file.storage_name && (
              <Badge className={"badge-soft badge-info text-xs mr-2"}>
                <MdOutlineCloud size={16} className={"inline-block"} />
                {file.storage_name}
              </Badge>
            )}
            {file.tag && (
              <Badge className={"badge-soft badge-warning text-xs mr-2"}>
                {file.tag}
              </Badge>
            )}
            <Badge className={"badge-soft badge-info text-xs mr-2"}>
              <MdOutlineAccessTime size={16} className={"inline-block"} />
              {new Date(file.created_at * 1000).toISOString().substring(0, 10)}
            </Badge>
            <DeleteFileDialog fileId={file.id} uploaderId={file.user.id} />
            <UpdateFileInfoDialog file={file} />
          </p>
        </div>
        <div className={`flex-row items-center hidden xs:flex`}>
          {file.size > 10 * 1024 * 1024 ? (
            <button
              ref={buttonRef}
              className={"btn btn-primary btn-soft btn-square"}
              onClick={() => {
                if (!app.cloudflareTurnstileSiteKey) {
                  const link = network.getFileDownloadLink(file.id, "");
                  window.open(link, "_blank");
                } else {
                  showPopup(
                    <CloudflarePopup file={file} />,
                    buttonRef.current!,
                  );
                }
              }}
            >
              <MdOutlineDownload size={24} />
            </button>
          ) : (
            <a
              href={network.getFileDownloadLink(file.id, "")}
              target="_blank"
              className={"btn btn-primary btn-soft btn-square"}
            >
              <MdOutlineDownload size={24} />
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-row-reverse xs:hidden p-2">
        {file.size > 10 * 1024 * 1024 ? (
          <button
            ref={buttonRef2}
            className={"btn btn-primary btn-soft btn-sm"}
            onClick={() => {
              if (!app.cloudflareTurnstileSiteKey) {
                const link = network.getFileDownloadLink(file.id, "");
                window.open(link, "_blank");
              } else {
                showPopup(<CloudflarePopup file={file} />, buttonRef2.current!);
              }
            }}
          >
            <MdOutlineDownload size={20} />
          </button>
        ) : (
          <a
            href={network.getFileDownloadLink(file.id, "")}
            target="_blank"
            className={"btn btn-primary btn-soft btn-sm"}
          >
            <MdOutlineDownload size={24} />
          </a>
        )}
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

function Files({
  files,
  resource,
}: {
  files: RFile[];
  resource: ResourceDetails;
}) {
  const { t } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Extract unique tags from all files
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    files.forEach((file) => {
      if (file.tag) {
        tags.add(file.tag);
      }
    });
    return Array.from(tags).sort();
  }, [files]);

  // Filter files based on selected tags
  const filteredFiles = useMemo(() => {
    if (selectedTags.size === 0) {
      return files;
    }
    return files.filter((file) => file.tag && selectedTags.has(file.tag));
  }, [files, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  return (
    <div className={"pt-3"}>
      {allTags.length > 0 && (
        <form className="filter mb-4">
          {allTags.map((tag) => (
            <input
              key={tag}
              className="btn"
              type="checkbox"
              aria-label={tag}
              checked={selectedTags.has(tag)}
              onChange={() => toggleTag(tag)}
            />
          ))}
          {selectedTags.size > 0 && (
            <input
              className="btn btn-square"
              type="reset"
              value="×"
              onClick={() => setSelectedTags(new Set())}
            />
          )}
        </form>
      )}
      {filteredFiles.map((file) => {
        return <FileTile file={file} key={file.id}></FileTile>;
      })}
      {filteredFiles.length === 0 && selectedTags.size > 0 && (
        <div className="text-center text-base-content/60 py-8">
          {t("No files match the selected tags")}
        </div>
      )}
      <div className={"h-2"}></div>
      {(app.canUpload() || (app.allowNormalUserUpload && app.isLoggedIn())) && (
        <div className={"flex flex-row-reverse"}>
          <CreateFileDialog resourceId={resource.id}></CreateFileDialog>
        </div>
      )}
      <KunFiles resource={resource} />
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
  const [tag, setTag] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [fileSizeUnit, setFileSizeUnit] = useState<string>("MB");
  const [md5, setMd5] = useState<string>("");

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
      let fileSizeNum = 0;
      if (fileSize) {
        const size = parseFloat(fileSize);
        if (isNaN(size)) {
          setError(t("File size must be a number"));
          setSubmitting(false);
          return;
        }
        // Convert to bytes based on unit
        switch (fileSizeUnit) {
          case "B":
            fileSizeNum = size;
            break;
          case "KB":
            fileSizeNum = size * 1024;
            break;
          case "MB":
            fileSizeNum = size * 1024 * 1024;
            break;
          case "GB":
            fileSizeNum = size * 1024 * 1024 * 1024;
            break;
        }
      }
      const res = await network.createRedirectFile(
        filename,
        description,
        resourceId,
        redirectUrl,
        fileSizeNum,
        md5,
        tag,
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
        tag,
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
        tag,
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
              className="btn"
              type="radio"
              name="type"
              aria-label={t("Redirect")}
              onInput={() => {
                setFileType(FileType.redirect);
              }}
            />
            <input
              className="btn"
              type="radio"
              name="type"
              aria-label={t("Upload")}
              onInput={() => {
                setFileType(FileType.upload);
              }}
            />
            <input
              className="btn"
              type="radio"
              name="type"
              aria-label={t("File Url")}
              onInput={() => {
                setFileType(FileType.serverTask);
              }}
            />
            <input
              className="btn btn-square"
              type="reset"
              value="×"
              onClick={() => {
                setFileType(null);
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
                placeholder={t("Description" + " (Markdown)")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("Tag") + " (" + t("Optional") + ")"}
                onChange={(e) => {
                  setTag(e.target.value);
                }}
              />
              <div className="join w-full">
                <input
                  type="number"
                  className="input flex-1 join-item"
                  placeholder={t("File Size") + " (" + t("Optional") + ")"}
                  value={fileSize}
                  onChange={(e) => {
                    setFileSize(e.target.value);
                  }}
                />
                <select
                  className="select w-24 join-item"
                  value={fileSizeUnit}
                  onChange={(e) => {
                    setFileSizeUnit(e.target.value);
                  }}
                >
                  <option value="B">B</option>
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                </select>
              </div>
              <input
                type="text"
                className="input w-full my-2"
                placeholder={"MD5" + " (" + t("Optional") + ")"}
                onChange={(e) => {
                  setMd5(e.target.value);
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
                placeholder={t("Description" + " (Markdown)")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("Tag") + " (" + t("Optional") + ")"}
                onChange={(e) => {
                  setTag(e.target.value);
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
                placeholder={t("Description" + " (Markdown)")}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
              <input
                type="text"
                className="input w-full my-2"
                placeholder={t("Tag") + " (" + t("Optional") + ")"}
                onChange={(e) => {
                  setTag(e.target.value);
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

  const [tag, setTag] = useState(file.tag || "");

  const { t } = useTranslation();

  const reload = useContext(context);

  const handleUpdate = async () => {
    if (isLoading) {
      return;
    }
    setLoading(true);
    const res = await network.updateFile(file.id, filename, description, tag);
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
          <Input
            type={"text"}
            label={t("Tag") + " (" + t("Optional") + ")"}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
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

function KunFiles({ resource }: { resource: ResourceDetails }) {
  let vnid = "";
  for (const link of resource.links ?? []) {
    if (link.label.toLowerCase() === "vndb") {
      vnid = link.url.split("/").pop() || "";
      break;
    }
  }

  const [data, setData] = useState<KunPatchResponse | null>(null);

  const [isLoading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    if (!vnid || !KunApi.isAvailable()) {
      setLoading(false);
      return;
    }
    KunApi.getPatch(vnid).then((res) => {
      if (res.success) {
        setData(res.data!);
      } else if (res.message === "404") {
        // ignore
      } else {
        setError(res.message);
      }
      setLoading(false);
    });
  }, [vnid]);

  if (error) {
    return <ErrorAlert className={"my-2"} message={error} />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!vnid || !KunApi.isAvailable() || data === null) {
    return <></>;
  }

  return (
    <>
      <div className="mx-2 my-4 flex">
        <a href="https://moyu.moe" target="_blank">
          <div className="border-b-2 pb-1 border-transparent hover:border-primary select-none cursor-pointer transition-all flex items-center gap-2">
            <img src="/kun.webp" className="h-8 w-8 rounded-full" />
            <span className="text-xl font-bold">鲲补丁</span>
          </div>
        </a>
      </div>
      {data && (
        <div className={"flex flex-col gap-2"}>
          {data.resource.map((file) => {
            return <KunFile file={file} patchID={data.id} key={file.id} />;
          })}
          {data.resource.length === 0 && (
            <p className={"text-sm text-base-content/80"}>
              {t("No patches found for this VN.")}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function KunFile({
  file,
  patchID,
}: {
  file: KunPatchResourceResponse;
  patchID: number;
}) {
  const tags: string[] = [];
  if (file.model_name) {
    tags.push(file.model_name);
  }
  tags.push(...file.platform.map((p) => kunPlatformToString(p)));
  tags.push(...file.language.map((l) => kunLanguageToString(l)));
  tags.push(...file.type.map((t) => kunResourceTypeToString(t)));

  return (
    <div className={"card shadow bg-base-100 mb-4"}>
      <div className={"p-4 flex flex-row items-center"}>
        <div className={"grow"}>
          <h4 className={"font-bold break-all"}>{file.name}</h4>
          <div className={"text-sm my-1 comment_tile"}>
            <Markdown>{file.note.replaceAll("\n", "  \n")}</Markdown>
          </div>
          <p className={"items-center mt-1"}>
            <a
              href={"https://www.moyu.moe/user/" + file.user.id}
              target="_blank"
            >
              <Badge
                className={
                  "badge-soft badge-primary text-xs mr-2 hover:shadow-xs transition-shadow"
                }
              >
                <img
                  src={file.user.avatar}
                  className={"w-4 h-4 rounded-full"}
                  alt={"avatar"}
                />
                {file.user.name}
              </Badge>
            </a>
            <Badge className={"badge-soft badge-secondary text-xs mr-2"}>
              <MdOutlineArchive size={16} className={"inline-block"} />
              {file.size}
            </Badge>
            {tags.map((p) => (
              <Badge className={"badge-soft badge-info text-xs mr-2"} key={p}>
                {p}
              </Badge>
            ))}
          </p>
        </div>
        <div className={"flex flex-row items-center"}>
          <a
            href={`https://www.moyu.moe/patch/${patchID}/resource#kun_patch_resource_${file.id}`}
            target="_blank"
            className={"btn btn-primary btn-soft btn-square"}
          >
            <MdOutlineOpenInNew size={24} />
          </a>
        </div>
      </div>
    </div>
  );
}

function CollectionDialog({ rid }: { rid: number }) {
  const { t } = useTranslation();

  const [searchKeyword, setSearchKeyword] = useState("");

  const [realSearchKeyword, setRealSearchKeyword] = useState("");

  const [dialogVisited, setDialogVisited] = useState(false);

  const [selectedCID, setSelectedCID] = useState<number | null>(null);

  const debounce = new Debounce(500);

  const navigate = useNavigate();

  const delayedSetSearchKeyword = (keyword: string) => {
    setSearchKeyword(keyword);
    debounce.run(() => {
      setSelectedCID(null);
      setRealSearchKeyword(keyword);
    });
  };

  const handleAddToCollection = () => {
    if (selectedCID == null) {
      return;
    }
    network.addResourceToCollection(selectedCID, rid).then((res) => {
      if (res.success) {
        showToast({
          message: t("Resource added to collection successfully"),
          type: "success",
        });
        setSelectedCID(null);
        setRealSearchKeyword("");
        setSearchKeyword("");
        setDialogVisited(false);
        const dialog = document.getElementById(
          "collection_dialog",
        ) as HTMLDialogElement;
        dialog.close();
      } else {
        showToast({
          message: res.message,
          type: "error",
          parent: document.getElementById("collection_dialog_content"),
        });
      }
    });
  };

  if (!app.isLoggedIn()) {
    return <></>;
  }

  return (
    <>
      <span
        className={
          "py-1 px-3 inline-flex items-center m-1 border border-base-300 bg-base-100 opacity-90 rounded-2xl hover:bg-base-200 transition-colors cursor-pointer select-none"
        }
        onClick={() => {
          setDialogVisited(true);
          const dialog = document.getElementById(
            "collection_dialog",
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineFolderSpecial size={20} />
        <span className={"ml-2 text-sm"}>{t("Collect")}</span>
      </span>
      <dialog id="collection_dialog" className="modal">
        <div className="modal-box" id="collection_dialog_content">
          <h3 className="font-bold text-lg mb-2">{t("Add to Collection")}</h3>
          <input
            type="text"
            placeholder="Search"
            className="input input-bordered w-full max-w-2xs mr-2"
            value={searchKeyword}
            onChange={(e) => delayedSetSearchKeyword(e.target.value)}
          />
          {dialogVisited && (
            <CollectionSelector
              resourceId={rid}
              keyword={realSearchKeyword}
              seletedID={selectedCID}
              selectCallback={(collection) => {
                if (selectedCID === collection.id) {
                  setSelectedCID(null);
                } else {
                  setSelectedCID(collection.id);
                }
              }}
              key={realSearchKeyword}
            />
          )}
          <div className="modal-action">
            <Button
              className="btn-ghost"
              onClick={() => {
                const dialog = document.getElementById(
                  "collection_dialog",
                ) as HTMLDialogElement;
                dialog.close();
                navigate("/create-collection");
              }}
            >
              <div className="flex items-center">
                <MdOutlineAdd size={20} className={"inline-block mr-1"} />
                {t("Create")}
              </div>
            </Button>
            <span className="flex-1"></span>
            <form method="dialog">
              <Button className="btn">{t("Cancel")}</Button>
            </form>
            <Button
              className="btn-primary"
              disabled={selectedCID == null}
              onClick={handleAddToCollection}
            >
              {t("Add")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function CollectionSelector({
  resourceId,
  keyword,
  seletedID: selectedID,
  selectCallback,
}: {
  resourceId: number;
  keyword: string;
  seletedID?: number | null;
  selectCallback: (collection: Collection) => void;
}) {
  const [collections, setCollections] = useState<Collection[] | null>(null);

  useEffect(() => {
    setCollections(null);
    network
      .searchUserCollections(app.user!.username, keyword, resourceId)
      .then((res) => {
        if (res.success) {
          setCollections(res.data! || []);
        } else {
          showToast({
            message: res.message,
            type: "error",
          });
        }
      });
  }, [keyword]);

  if (collections == null) {
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <div className="py-2 max-h-80 overflow-y-auto w-full overflow-x-clip">
      {collections.map((collection) => {
        return (
          <div
            className={`${selectedID === collection.id && "bg-base-200 shadow"} rounded-lg transition-all p-2 hover:bg-base-200 w-full overflow-ellipsis hover:cursor-pointer`}
            key={collection.id}
            onClick={() => {
              selectCallback(collection);
            }}
          >
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={selectedID === collection.id}
              readOnly
            />
            {collection.title}
          </div>
        );
      })}
    </div>
  );
}

function Gallery({ images, nsfw }: { images: number[], nsfw: number[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 方向：1=向右，-1=向左
  const [isHovered, setIsHovered] = useState(false);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  if (!images || images.length === 0) {
    return <></>;
  }

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToIndex = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  if (nsfw == null) {
    nsfw = [];
  }

  // 如果图片数量超过8张，显示数字而不是圆点
  const showDots = images.length <= 8;

  return (
    <>
    <dialog
      ref={dialogRef}
      onClick={() => {
      dialogRef.current?.close();
      }}
      className="modal"
    >
      <div className="modal-box w-full h-full max-h-screen max-w-screen p-4 bg-transparent shadow-none flex items-center justify-center">
      <motion.img
      src={network.getImageUrl(images[currentIndex])}
      alt=""
      className="max-w-full max-h-full object-contain rounded-xl"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      />
      </div>
    </dialog>
    <div
      className="relative w-full overflow-hidden rounded-xl bg-base-100-tr82 shadow-sm"
      style={{ aspectRatio: "16/9" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片区域 */}
      <div ref={containerRef} className="w-full h-full relative" onClick={() => {
        dialogRef.current?.showModal();
      }}>
        {width > 0 && (
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <motion.div
              key={currentIndex}
              className="absolute w-full h-full object-contain"
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? width : -width,
                }),
                center: {
                  x: 0,
                  transition: { duration: 0.3, ease: "linear" },
                },
                exit: (dir: number) => ({
                  x: dir > 0 ? -width : width,
                  transition: { duration: 0.3, ease: "linear" },
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
            >
              <GalleryImage
                src={network.getImageUrl(images[currentIndex])}
                nfsw={nsfw.includes(images[currentIndex])}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 左右按钮 */}
      {images.length > 1 && (
        <>
          <button
            className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity hover:cursor-pointer ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            onClick={goToPrevious}
          >
            <MdOutlineChevronLeft size={28} />
          </button>
          <button
            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity hover:cursor-pointer ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            onClick={goToNext}
          >
            <MdOutlineChevronRight size={28} />
          </button>
        </>
      )}

      {/* 底部指示器 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {showDots ? (
            /* 圆点指示器 */
            <div className="flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-primary w-4"
                      : "bg-base-content/30 hover:bg-base-content/50"
                  }`}
                  onClick={() => goToIndex(index)}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          ) : (
            /* 数字指示器 */
            <div className="bg-base-100/20 px-2 py-1 rounded-full text-xs">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function GalleryImage({src, nfsw}: {src: string, nfsw: boolean}) {
  const [show, setShow] = useState(!nfsw);

  return (
    <div className="relative w-full h-full">
      <img 
        src={src} 
        alt="" 
        className={`w-full h-full object-contain transition-all duration-300 ${!show ? 'blur-xl' : ''}`}
      />
      {!show && (
        <>
          <div className="absolute inset-0 bg-base-content/20 cursor-pointer" onClick={(event) => {
            setShow(true)
            event.stopPropagation();
          }} />
          <div className="absolute top-4 left-4">
            <Badge className="badge-error shadow-lg">
              NSFW
            </Badge>
          </div>
        </>
      )}
    </div>
  );
}

function Characters({ characters }: { characters: CharacterParams[] }) {
  const { t } = useTranslation();

  let main = characters.filter((c) => c.role === "primary");
  let other1 = characters.filter((c) => c.role !== "primary" && c.image);
  let other2 = characters.filter((c) => c.role !== "primary" && !c.image);
  characters = [...main, ...other1, ...other2];

  if (!characters || characters.length === 0) {
    return <></>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">{t("Characters")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {characters.map((character, index) => (
          <CharacterCard key={index} character={character} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({ character }: { character: CharacterParams }) {
  const navigate = useNavigate();

  const handleCVClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (character.cv) {
      navigate(`/search?keyword=${encodeURIComponent(character.cv)}`);
    }
  };

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-base-200 shadow-sm">
      <img
        src={character.image ? network.getImageUrl(character.image) : "/cp.webp"}
        alt={character.name}
        className="w-full h-full object-cover"
      />
      
      <div className="absolute bottom-1 left-1 right-1 px-1 py-1 border border-base-100/40 rounded-lg bg-base-100/60">
        <h4 className="font-semibold text-sm leading-tight line-clamp border border-transparent">
          {character.name}
          {
            character.role === "primary" ? (
              <span className="bg-primary/80 rounded-lg px-2 py-0.5 text-primary-content ml-1" style={{
                fontSize: "10px",
              }}>
                Main
              </span>
            ) : null
          }
        </h4>
        
        {character.cv && (
          <button
            onClick={handleCVClick}
            className="hover:bg-base-200/80 border border-transparent hover:border-base-300/50 rounded-sm text-xs transition-colors cursor-pointer"
          >
            CV: {character.cv}
          </button>
        )}
      </div>
    </div>
  );
}