import { useParams } from "react-router";
import { CommentWithResource, User } from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import Pagination from "../components/pagination";
import { CommentTile } from "../components/comment_tile.tsx";

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);

  const { username: rawUsername } = useParams();

  // 解码用户名，确保特殊字符被还原
  const username = rawUsername ? decodeURIComponent(rawUsername) : "";

  const [page, setPage] = useState(0);

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
      <div role="tablist" className="border-b border-base-300 mx-2 flex">
        <div
          role="tab"
          className={`text-sm py-2 px-4 cursor-pointer border-b-2 border-base-100 ${page === 0 ? "border-primary text-primary" : "text-base-content/80"} transition-all`}
          onClick={() => setPage(0)}
        >
          Resources
        </div>
        <div
          role="tab"
          className={`text-sm py-2 px-4 cursor-pointer border-b-2 border-base-100 ${page === 1 ? "border-primary text-primary" : "text-base-content/80"}`}
          onClick={() => setPage(1)}
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
  return (
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
        {user.bio.trim() !== "" ? (
          <p className="text-sm text-base-content/80">{user.bio.trim()}</p>
        ) : (
          <p>
            <span className="text-sm font-bold mr-1">
              {" "}
              {user.resources_count}
            </span>
            <span className="text-sm">Resources</span>
            <span className="mx-2"></span>
            <span className="text-sm font-bold mr-1">
              {" "}
              {user.comments_count}
            </span>
            <span className="text-base-content text-sm">Comments</span>
          </p>
        )}
      </div>
    </div>
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
