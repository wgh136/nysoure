import { useParams, useLocation, useNavigate } from "react-router";
import { CommentWithResource, RFile, User } from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useCallback, useEffect, useState } from "react";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import Pagination from "../components/pagination";
import { CommentTile } from "../components/comment_tile.tsx";
import Badge from "../components/badge.tsx";
import {
  MdOutlineArchive,
  MdOutlineComment,
  MdOutlinePhotoAlbum,
} from "react-icons/md";
import { useTranslation } from "react-i18next";
import { app } from "../app.ts";
import Markdown from "react-markdown";

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);

  const { username: rawUsername } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 解码用户名，确保特殊字符被还原
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";

  // 从 hash 中获取当前页面，默认为 resources
  const getPageFromHash = useCallback(() => {
    const hash = location.hash.slice(1); // 移除 # 号
    if (hash === "comments") return 1;
    if (hash === "files") return 2;
    return 0; // 默认为 resources
  }, [location.hash]);

  const [page, setPage] = useState(getPageFromHash());

  // 监听 hash 变化
  useEffect(() => {
    setPage(getPageFromHash());
  }, [location.hash, getPageFromHash]);

  // 更新 hash 的函数
  const updateHash = (newPage: number) => {
    const hashs = ["resources", "comments", "files"];
    const newHash = hashs[newPage] || "resources";
    if (location.hash.slice(1) !== newHash) {
      navigate(`/user/${username}#${newHash}`, { replace: true });
    }
  };

  useEffect(() => {
    const preFetchData = app.getPreFetchData();
    if (preFetchData?.user?.username === username) {
      setUser(preFetchData.user);
      return;
    }
    network.getUserInfo(username || "").then((res) => {
      if (res.success) {
        setUser(res.data!);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [username]);

  useEffect(() => {
    document.title = username || "User";
  }, [username]);

  if (!user) {
    return (
      <div className="w-full">
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <UserCard user={user!} />
      <div
        role="tablist"
        className="border-b border-base-300 mx-2 flex tabs tabs-border"
      >
        <div
          role="tab"
          className={`tab ${page === 0 ? "tab-active" : ""} `}
          onClick={() => updateHash(0)}
        >
          Resources
        </div>
        <div
          role="tab"
          className={`tab ${page === 1 ? "tab-active" : ""}`}
          onClick={() => updateHash(1)}
        >
          Comments
        </div>
        <div
          role="tab"
          className={`tab ${page === 2 ? "tab-active" : ""}`}
          onClick={() => updateHash(2)}
        >
          Files
        </div>
      </div>
      <div className="w-full">
        {page === 0 && <UserResources user={user} />}
        {page === 1 && <UserComments user={user} />}
        {page === 2 && <UserFiles user={user} />}
      </div>
      <div className="h-16"></div>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  const { t } = useTranslation();

  const statistics = (
    <p className="mt-2">
      <Badge className="badge-soft badge-primary badge-lg m-1">
        <MdOutlinePhotoAlbum size={18} />
        <span className="ml-1 text-sm">
          {t("Resources")} {user.resources_count}
        </span>
      </Badge>
      <Badge className="badge-soft badge-secondary badge-lg m-1">
        <MdOutlineArchive size={18} />
        <span className="ml-1 text-sm">
          {t("Files")} {user.files_count}
        </span>
      </Badge>
      <Badge className="badge-soft badge-accent badge-lg m-1">
        <MdOutlineComment size={18} />
        <span className="ml-1 text-sm">
          {t("Comments")} {user.comments_count}
        </span>
      </Badge>
    </p>
  );

  const haveBio = user.bio.trim() !== "";

  return (
    <>
      <div className={"flex m-4 items-center"}>
        <div className={"avatar py-2"}>
          <div className="w-24 rounded-full ring-2 ring-offset-2 ring-primary ring-offset-base-100">
            <img alt={"avatar"} src={network.getUserAvatar(user)} />
          </div>
        </div>
        <div className="w-6"></div>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <div className="h-4"></div>
          {haveBio ? (
            <p className="text-sm text-base-content/80">{user.bio.trim()}</p>
          ) : (
            statistics
          )}
        </div>
      </div>
      {haveBio && <div className="mb-2 mx-2">{statistics}</div>}
    </>
  );
}

function UserResources({ user }: { user: User }) {
  return (
    <ResourcesView
      storageKey={`user-${user.username}`}
      loader={(page) => {
        return network.getResourcesByUser(user.username, page);
      }}
    ></ResourcesView>
  );
}

function UserComments({ user }: { user: User }) {
  const [page, setPage] = useState(1);

  const [maxPage, setMaxPage] = useState(0);

  return (
    <div className="px-2">
      <CommentsList
        username={user.username}
        page={page}
        maxPageCallback={setMaxPage}
        key={`user-comments-${user.username}-${page}`}
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
  username,
  page,
  maxPageCallback,
}: {
  username: string;
  page: number;
  maxPageCallback: (maxPage: number) => void;
}) {
  const [comments, setComments] = useState<CommentWithResource[] | null>(null);

  useEffect(() => {
    network.listCommentsByUser(username, page).then((res) => {
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
  }, [maxPageCallback, page, username]);

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
          <CommentTile elevation="high" comment={comment} key={comment.id} />
        );
      })}
    </>
  );
}

function UserFiles({ user }: { user: User }) {
  const [page, setPage] = useState(1);

  const [maxPage, setMaxPage] = useState(0);

  return (
    <div className="px-2">
      <FilesList
        username={user.username}
        page={page}
        maxPageCallback={setMaxPage}
        key={`${user.username}-files-${page}`}
      />
      {maxPage ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </div>
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

function FilesList({
  username,
  page,
  maxPageCallback,
}: {
  username: string;
  page: number;
  maxPageCallback: (maxPage: number) => void;
}) {
  const [files, setFiles] = useState<RFile[] | null>(null);

  const navigate = useNavigate();

  const { t } = useTranslation();

  useEffect(() => {
    network.getUserFiles(username, page).then((res) => {
      if (res.success) {
        setFiles(res.data!);
        maxPageCallback(res.totalPages || 1);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [maxPageCallback, page, username]);

  if (files == null) {
    return (
      <div className={"w-full"}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      {files.map((file) => {
        return (
          <a
            href={`/resources/${file.resource!.id}#files`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/resources/${file.resource!.id}#files`);
            }}
          >
            <div
              className={
                "card shadow p-4 my-2 hover:shadow-md transition-shadow bg-base-100-tr82"
              }
            >
              <h4 className={"font-bold pb-2"}>{file!.filename}</h4>
              <div className={"text-sm comment_tile"}>
                <Markdown>{file.description.replaceAll("\n", "  \n")}</Markdown>
              </div>
              <p className={"pt-1"}>
                <Badge className={"badge-soft badge-secondary text-xs mr-2"}>
                  <MdOutlineArchive size={16} className={"inline-block"} />
                  {file!.is_redirect
                    ? t("Redirect")
                    : fileSizeToString(file!.size)}
                </Badge>
                <Badge className={"badge-soft badge-accent text-xs mr-2"}>
                  <MdOutlinePhotoAlbum size={16} className={"inline-block"} />
                  {(() => {
                    let title = file.resource!.title;
                    if (title.length > 20) {
                      title = title.slice(0, 20) + "...";
                    }
                    return title;
                  })()}
                </Badge>
              </p>
            </div>
          </a>
        );
      })}
    </>
  );
}
