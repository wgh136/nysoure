import type { Route } from "./+types/comments.$id";
import { useCallback, useEffect, useState } from "react";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useNavigate } from "react-router";
import { translationFromMatches, useTranslation } from "../hook/i18n";
import type { CommentWithRef, Resource, Comment } from "../network/models";
import Loading from "../components/loading";
import Badge from "../components/badge";
import { CommentInput } from "../components/comment_input";
import { CommentTile, CommentContent } from "../components/comment_tile";
import Pagination from "../components/pagination";
import { MdOutlineDelete, MdOutlineEdit } from "react-icons/md";
import { TextArea } from "../components/input";
import { useConfig, configFromMatches } from "../hook/config";
import removeMd from "remove-markdown";

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id ? parseInt(params.id, 10) : 0;
  
  if (isNaN(id) || id <= 0) {
    throw new Error("Invalid comment ID");
  }

  // Fetch comment data on server side
  const commentRes = await network.getComment(id);
  
  if (!commentRes.success) {
    throw new Error(commentRes.message || "Failed to load comment");
  }

  return {
    comment: commentRes.data,
    commentId: id,
  };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const { t } = translationFromMatches(matches);
  const comment = loaderData?.comment;
  const title = t("Comment");
  
  // Convert markdown content to plain text for description
  const content = comment?.content || "";
  const plainText = removeMd(content).replace(/\s+/g, ' ').trim();
  const description = plainText.length > 160 
    ? plainText.substring(0, 157) + '...' 
    : plainText;
  
  return [
    { title: `${title} - ${config.server_name}` },
    { name: "description", content: description },
  ];
}

export default function CommentPage({ loaderData }: Route.ComponentProps) {
  const { comment: initialComment, commentId } = loaderData;
  const [comment, setComment] = useState<CommentWithRef | null>(initialComment ?? null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = useConfig();

  const onUpdated = useCallback(() => {
    setComment(null);
    const id = commentId;
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
  }, [commentId, t]);

  const onDeleted = useCallback(() => {
    // check history length
    if (window.history.length > 1) {
      // go back to the previous page
      navigate(-1);
    } else {
      // if there is no previous page, go to the home page
      navigate("/");
    }
  }, [navigate]);

  if (!comment) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      {comment.resource && <ResourceCard resource={comment.resource} />}
      {comment.reply_to && <CommentTile comment={comment.reply_to} />}
      <div className="h-2"></div>
      <div className="bg-base-100/80 backdrop-blur-xs rounded-box p-4 shadow">
        <div className="flex items-center">
          <button
            onClick={() => {
              navigate(`/user/${encodeURIComponent(comment.user.username)}`);
            }}
            className="border-b-2 py-1 cursor-pointer border-transparent hover:border-primary transition-colors duration-200 ease-in-out"
          >
            <div className="flex items-center">
              <div className="avatar">
                <div className="w-6 rounded-full">
                  <img
                    src={network.getUserAvatar(comment.user)}
                    alt={"avatar"}
                  />
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
        {config.user?.id === comment.user.id && (
          <div className="flex flex-row justify-end mt-2">
            <EditCommentDialog comment={comment} onUpdated={onUpdated} />
            <DeleteCommentDialog commentId={comment.id} onUpdated={onDeleted} />
          </div>
        )}
      </div>
      <div className="h-4" />
      <div className="border-t border-base-300" />
      <div className="h-4" />
      <CommentReply comment={comment} />
    </div>
  );
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
      href={link}
      className="flex flex-col sm:flex-row w-full card bg-base-100/80 backdrop-blur-xs shadow hover:shadow-md overflow-clip my-2 transition-shadow"
      onClick={(e) => {
        e.preventDefault();
        navigate(link);
      }}
    >
      {resource.image != null && (
        <img
          className="object-cover w-full max-h-40 sm:w-40 md:w-44 lg:w-52 sm:max-h-64"
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
          />
        );
      })}
    </>
  );
}

function EditCommentDialog({
  comment,
  onUpdated,
}: {
  comment: CommentWithRef;
  onUpdated?: () => void;
}) {
  const [isLoading, setLoading] = useState(false);
  const [content, setContent] = useState(comment.content);
  const { t } = useTranslation();

  const handleUpdate = async () => {
    if (isLoading) {
      return;
    }
    setLoading(true);
    const res = await network.updateComment(comment.id, content);
    const dialog = document.getElementById(
      `edit_comment_dialog_${comment.id}`,
    ) as HTMLDialogElement;
    dialog.close();
    if (res.success) {
      showToast({
        message: t("Comment updated successfully"),
        type: "success",
      });
      if (onUpdated) {
        onUpdated();
      }
    } else {
      showToast({
        message: res.message,
        type: "error",
        parent: document.getElementById(`dialog_box`),
      });
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className={"btn btn-sm btn-ghost ml-1"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dialog = document.getElementById(
            `edit_comment_dialog_${comment.id}`,
          ) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineEdit size={16} className={"inline-block"} />
        {t("Edit")}
      </button>
      <dialog
        id={`edit_comment_dialog_${comment.id}`}
        className="modal"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="modal-box" id={"dialog_box"}>
          <h3 className="font-bold text-lg">{t("Edit Comment")}</h3>
          <TextArea
            label={t("Content")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => {
                const dialog = document.getElementById(
                  `edit_comment_dialog_${comment.id}`,
                ) as HTMLDialogElement;
                dialog.close();
              }}
            >
              {t("Close")}
            </button>
            <button className="btn btn-primary" onClick={handleUpdate}>
              {isLoading ? (
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

function DeleteCommentDialog({
  commentId,
  onUpdated,
}: {
  commentId: number;
  onUpdated?: () => void;
}) {
  const [isLoading, setLoading] = useState(false);
  const { t } = useTranslation();

  const id = `delete_comment_dialog_${commentId}`;

  const handleDelete = async () => {
    if (isLoading) return;
    setLoading(true);
    const res = await network.deleteComment(commentId);
    const dialog = document.getElementById(id) as HTMLDialogElement;
    dialog.close();
    if (res.success) {
      showToast({
        message: t("Comment deleted successfully"),
        type: "success",
      });
      if (onUpdated) {
        onUpdated();
      }
    } else {
      showToast({ message: res.message, type: "error" });
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className={"btn btn-error btn-sm btn-ghost ml-1"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const dialog = document.getElementById(id) as HTMLDialogElement;
          dialog.showModal();
        }}
      >
        <MdOutlineDelete size={16} className={"inline-block"} />
        {t("Delete")}
      </button>
      <dialog
        id={id}
        className="modal"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">{t("Delete Comment")}</h3>
          <p className="py-4">
            {t(
              "Are you sure you want to delete this comment? This action cannot be undone.",
            )}
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => {
                const dialog = document.getElementById(id) as HTMLDialogElement;
                dialog.close();
              }}
            >
              {t("Close")}
            </button>
            <button className="btn btn-error" onClick={handleDelete}>
              {isLoading ? (
                <span className={"loading loading-spinner loading-sm"}></span>
              ) : null}
              {t("Delete")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
