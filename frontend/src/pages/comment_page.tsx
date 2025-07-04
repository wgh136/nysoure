import { useCallback, useEffect, useState } from "react";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CommentWithRef, Resource } from "../network/models";
import Loading from "../components/loading";
import Markdown from "react-markdown";
import Badge from "../components/badge";
import { CommentInput } from "../components/comment_input";
import { CommentTile } from "../components/comment_tile";
import { Comment } from "../network/models";
import Pagination from "../components/pagination";

export default function CommentPage() {
  const params = useParams();
  const commentId = params.id;
  const [comment, setComment] = useState<CommentWithRef | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    setComment(null);
    const id = parseInt(commentId || "0");
    if (isNaN(id) || id <= 0) {
      showToast({
        message: t("Invalid comment ID"),
        type: "error",
      });
      return;
    }
    network.getComment(id).then((res) => {
      if (res.success) {
        setComment(res.data!);
      } else {
        showToast({
          message: res.message,
          type: "error",
        });
      }
    });
  }, [commentId]);

  useEffect(() => {
    document.title = t("Comment Details");
  });

  if (!comment) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      {comment.resource && <ResourceCard resource={comment.resource} />}
      <div className="flex items-center mt-4">
        <button
          onClick={() => {
            navigate(`/user/${encodeURIComponent(comment.user.username)}`);
          }}
          className="border-b-2 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out"
        >
          <div className="flex items-center">
            <div className="avatar">
              <div className="w-6 rounded-full">
                <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
              </div>
            </div>
            <div className="w-2"></div>
            <div className="text-sm">{comment.user.username}</div>
          </div>
        </button>
        <span className="text-xs text-base-content/80 ml-2">
          {t("Commented on")}
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <article>
        <CommentContent content={comment.content} />
      </article>
      <div className="h-4" />
      <div className="border-t border-base-300" />
      <div className="h-4" />
      <CommentReply comment={comment} />
    </div>
  );
}

function CommentContent({ content }: { content: string }) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.endsWith("  ")) {
      // Ensure that each line ends with two spaces for Markdown to recognize it as a line break
      lines[i] = line + "  ";
    }
  }
  content = lines.join("\n");

  return <Markdown>{content}</Markdown>;
}

function ResourceCard({ resource }: { resource: Resource }) {
  const navigate = useNavigate();

  let tags = resource.tags;
  if (tags.length > 10) {
    tags = tags.slice(0, 10);
  }

  const link = `/resources/${resource.id}`;

  return (
    <a
      href="link"
      className="flex flex-row w-full card bg-base-200 shadow-xs hover:shadow overflow-clip my-2"
      onClick={(e) => {
        e.preventDefault();
        navigate(link);
      }}
    >
      {resource.image != null && (
        <img
          className="object-cover w-32 sm:w-40 md:w-44 lg:w-52 max-h-64"
          src={network.getResampledImageUrl(resource.image.id)}
          alt="cover"
        />
      )}
      <div className="flex flex-col p-4 flex-1">
        <h2 className="card-title w-full break-all">{resource.title}</h2>
        <div className="h-2"></div>
        <p className="mb-2">
          {tags.map((tag) => {
            return (
              <Badge key={tag.id} className={"m-0.5"}>
                {tag.name}
              </Badge>
            );
          })}
        </p>
        <div className="flex-1"></div>
        <div className="flex items-center">
          <div className="avatar">
            <div className="w-6 rounded-full">
              <img src={network.getUserAvatar(resource.author)} />
            </div>
          </div>
          <div className="w-2"></div>
          <div className="text-sm">{resource.author.username}</div>
        </div>
      </div>
    </a>
  );
}

function CommentReply({ comment }: { comment: CommentWithRef }) {
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(0);
  const [listKey, setListKey] = useState(0);

  const reload = useCallback(() => {
    setPage(1);
    setMaxPage(0);
    setListKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <h2 className="text-xl font-bold my-2">{t("Replies")}</h2>
      <CommentInput replyTo={comment.id} reload={reload} />
      <CommentsList
        commentId={comment.id}
        page={page}
        maxPageCallback={(maxPage: number) => {
          setMaxPage(maxPage);
        }}
        key={listKey}
        reload={reload}
      />
      {maxPage ? (
        <div className={"w-full flex justify-center"}>
          <Pagination page={page} setPage={setPage} totalPages={maxPage} />
        </div>
      ) : null}
    </>
  );
}

function CommentsList({
  commentId,
  page,
  maxPageCallback,
  reload,
}: {
  commentId: number;
  page: number;
  maxPageCallback: (maxPage: number) => void;
  reload: () => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);

  useEffect(() => {
    network.listCommentReplies(commentId, page).then((res) => {
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
  }, [maxPageCallback, page, commentId]);

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
          <CommentTile
            elevation="high"
            comment={comment}
            key={comment.id}
            onUpdated={reload}
          />
        );
      })}
    </>
  );
}
