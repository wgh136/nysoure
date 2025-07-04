import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  MdOutlineComment,
  MdOutlineDelete,
  MdOutlineEdit,
} from "react-icons/md";
import { TextArea } from "./input";
import { Comment } from "../network/models";
import { network } from "../network/network";
import Badge from "./badge";
import { app } from "../app";
import showToast from "./toast";
import Markdown from "react-markdown";

export function CommentTile({
  comment,
  onUpdated,
  elevation,
}: {
  comment: Comment;
  onUpdated?: () => void;
  elevation?: "normal" | "high";
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const link = `/comments/${comment.id}`;
  const userLink = `/user/${encodeURIComponent(comment.user.username)}`;

  // @ts-ignore
  return (
    <a
      href={link}
      className={
        "block card bg-base-100 p-2 my-3 transition-shadow cursor-pointer" +
        (!elevation || elevation == "normal"
          ? " shadow-xs hover:shadow"
          : " shadow hover:shadow-md")
      }
      onClick={(e) => {
        e.preventDefault();
        navigate(link);
      }}
    >
      <div className={"flex flex-row items-center my-1 mx-1"}>
        <a
          href={userLink}
          className="flex flex-row items-center avatar cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(userLink);
          }}
        >
          <span className="w-8 h-8 rounded-full">
            <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
          </span>
          <span className={"w-2"}></span>
          <span className={"text-sm font-bold"}>{comment.user.username}</span>
        </a>

        <div className={"grow"}></div>
        <Badge className={"badge-ghost badge-sm"}>
          {new Date(comment.created_at).toLocaleDateString()}
        </Badge>
      </div>
      <div className={"p-2 comment_tile"}>
        <CommentContent content={comment.content} />
      </div>
      <div className={"flex items-center"}>
        {comment.content_truncated && (
          <Badge className="badge-soft">{t("Click to view more")}</Badge>
        )}
        <span className={"grow"}></span>
        {comment.reply_count > 0 && (
          <Badge className={"badge-soft badge-primary mr-2"}>
            <MdOutlineComment size={16} className={"inline-block"} />
            {comment.reply_count}
          </Badge>
        )}
        {app.user?.id === comment.user.id && (
          <>
            <EditCommentDialog comment={comment} onUpdated={onUpdated} />
            <DeleteCommentDialog commentId={comment.id} onUpdated={onUpdated} />
          </>
        )}
      </div>
    </a>
  );
}

function EditCommentDialog({
  comment,
  onUpdated,
}: {
  comment: Comment;
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
