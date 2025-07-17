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
import { MdOutlineDelete, MdOutlineEdit } from "react-icons/md";
import { TextArea } from "../components/input";
import { app } from "../app";
import { useNavigator } from "../components/navigator";

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
    const preFetchData = app.getPreFetchData();
    if (preFetchData?.comment?.id === id) {
      setComment(preFetchData.comment);
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

  const onUpdated = useCallback(() => {
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
  }, []);

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

  useEffect(() => {
    document.title = t("Comment Details");
  }, [t]);

  const navigator = useNavigator();

  useEffect(() => {
    if (comment?.resource && comment.resource.image) {
      navigator.setBackground(network.getResampledImageUrl(comment.resource.image.id));
    } else if (comment?.images?.length) {
      // comment images are not resampled
      navigator.setBackground(network.getImageUrl(comment.images[0].id));
    }
  }, [comment]);

  if (!comment) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      {comment.resource && <ResourceCard resource={comment.resource} />}
      {comment.reply_to && <CommentTile comment={comment.reply_to} />}
      <div className="h-2"></div>
      <div className="bg-base-100-tr82 rounded-2xl p-4 shadow">
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
      {app.user?.id === comment.user.id && (
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
      className="flex flex-col sm:flex-row w-full card bg-base-100-tr82 shadow hover:shadow-md overflow-clip my-2 transition-shadow"
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
            onUpdated={reload}
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
