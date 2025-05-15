import { useNavigate, useParams } from "react-router";
import { CommentWithResource, User } from "../network/models";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useEffect, useState } from "react";
import ResourcesView from "../components/resources_view";
import Loading from "../components/loading";
import Pagination from "../components/pagination";
import { MdOutlineArrowRight } from "react-icons/md";

export default function UserPage() {
  const [user, setUser] = useState<User | null>(null);

  const { username } = useParams();

  const [page, setPage] = useState(0);

  useEffect(() => {
    network.getUserInfo(username || "").then((res) => {
      if (res.success) {
        setUser(res.data!);
      } else {
        showToast({
          message: res.message,
          type: "error",
        })
      }
    });
  }, [username]);

  useEffect(() => {
    document.title = username || "User";
  }, [username]);

  if (!user) {
    return <div className="w-full">
      <Loading />
    </div>;
  }

  return <div>
    <UserCard user={user!} />
    <div role="tablist" className="border-b border-base-300 mx-2 flex">
      <div role="tab" className={`text-sm py-2 px-4 cursor-pointer border-b-2 border-base-100 ${page === 0 ? "border-primary text-primary" : "text-base-content/80"} transition-all`} onClick={() => setPage(0)}>Resources</div>
      <div role="tab" className={`text-sm py-2 px-4 cursor-pointer border-b-2 border-base-100 ${page === 1 ? "border-primary text-primary" : "text-base-content/80"}`} onClick={() => setPage(1)}>Comments</div>
    </div>
    <div className="w-full">
      {page === 0 && <UserResources user={user} />}
      {page === 1 && <UserComments user={user} />}
    </div>
    <div className="h-16"></div>
  </div>;
}

function UserCard({ user }: { user: User }) {
  return <div className={"flex m-4 items-center"}>
    <div className={"avatar py-2"}>
      <div className="w-24 rounded-full ring-2 ring-offset-2 ring-primary ring-offset-base-100">
        <img src={network.getUserAvatar(user)} />
      </div>
    </div>
    <div className="w-6"></div>
    <div>
      <h1 className="text-2xl font-bold">{user.username}</h1>
      <div className="h-4"></div>
      <p>
        <span className="text-sm font-bold mr-1"> {user.uploads_count}</span>
        <span className="text-sm">Resources</span>
        <span className="mx-2"></span>
        <span className="text-sm font-bold mr-1"> {user.comments_count}</span>
        <span className="text-base-content text-sm">Comments</span>
      </p>
    </div>
  </div>
}

function UserResources({ user }: { user: User }) {
  return <ResourcesView loader={(page) => {
    return network.getResourcesByUser(user.username, page);
  }}></ResourcesView>
}

function UserComments({ user }: { user: User }) {
  const [page, setPage] = useState(1);

  const [maxPage, setMaxPage] = useState(0);

  return <div className="px-2">
    <CommentsList username={user.username} page={page} maxPageCallback={setMaxPage} />
    {maxPage && <div className={"w-full flex justify-center"}>
      <Pagination page={page} setPage={setPage} totalPages={maxPage} />
    </div>}
  </div>
}

function CommentsList({ username, page, maxPageCallback }: {
  username: string,
  page: number,
  maxPageCallback: (maxPage: number) => void
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

function CommentTile({ comment }: { comment: CommentWithResource }) {
  const navigate = useNavigate();

  return <div className={"card card-border border-base-300 p-2 my-3"}>
    <div className={"flex flex-row items-center my-1 mx-1"}>
      <div className="avatar">
        <div className="w-8 rounded-full">
          <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
        </div>
      </div>
      <div className={"w-2"}></div>
      <div className={"text-sm font-bold"}>{comment.user.username}</div>
      <div className={"grow"}></div>
      <div className={"text-sm text-gray-500"}>{new Date(comment.created_at).toLocaleString()}</div>
    </div>
    <div className={"p-2"}>
      {comment.content}
    </div>
    <a className="text-sm text-base-content/80 p-1 hover:text-primary cursor-pointer transition-all" onClick={() => {
      navigate("/resources/" + comment.resource.id);
    }}>
      <MdOutlineArrowRight className="inline-block mr-1 mb-0.5" size={18} />
      {comment.resource.title}
    </a>
  </div>
}