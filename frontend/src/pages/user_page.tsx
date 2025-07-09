import { useParams, useLocation, useNavigate } from "react-router";
import { CommentWithResource, User } from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import Pagination from "../components/pagination";
import { CommentTile } from "../components/comment_tile.tsx";
import Badge from "../components/badge.tsx";
import { MdOutlineArchive, MdOutlineComment, MdOutlinePhotoAlbum, MdPhotoAlbum } from "react-icons/md";
import { useTranslation } from "react-i18next";

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);

  const { username: rawUsername } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 解码用户名，确保特殊字符被还原
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";

  // 从 hash 中获取当前页面，默认为 resources
  const getPageFromHash = () => {
    const hash = location.hash.slice(1); // 移除 # 号
    if (hash === "comments") return 1;
    return 0; // 默认为 resources
  };

  const [page, setPage] = useState(getPageFromHash());

  // 监听 hash 变化
  useEffect(() => {
    setPage(getPageFromHash());
  }, [location.hash]);

  // 更新 hash 的函数
  const updateHash = (newPage: number) => {
    const hash = newPage === 1 ? "#comments" : "#resources";
    navigate(location.pathname + hash, { replace: true });
  };

  useEffect(() => {
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
      <div role="tablist" className="border-b border-base-300 mx-2 flex tabs tabs-border">
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
      </div>
      <div className="w-full">
        {page === 0 && <UserResources user={user} />}
        {page === 1 && <UserComments user={user} />}
      </div>
      <div className="h-16"></div>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  const { t } = useTranslation();

  const statistics = <p className="mt-2">
          <Badge className="badge-soft badge-primary badge-lg m-1">
            <MdOutlinePhotoAlbum size={18} />
            <span className="ml-1 text-sm">{t("Resources")} {user.resources_count}</span>
          </Badge>
          <Badge className="badge-soft badge-secondary badge-lg m-1">
            <MdOutlineArchive size={18} />
            <span className="ml-1 text-sm">{t('Files')} {user.files_count}</span>
          </Badge>
          <Badge className="badge-soft badge-accent badge-lg m-1">
            <MdOutlineComment size={18} />
            <span className="ml-1 text-sm">{t("Comments")} {user.comments_count}</span>
          </Badge>
        </p>

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
        ): statistics}
      </div>
      
    </div>
    { haveBio && <div className="mb-2 mx-2">{statistics}</div>}
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
