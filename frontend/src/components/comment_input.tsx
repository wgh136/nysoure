import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import showToast from "./toast";
import { network } from "../network/network";
import { InfoAlert } from "./alert";
import { app } from "../app";
import { MdOutlineImage, MdOutlineInfo } from "react-icons/md";
import Badge from "./badge";

export function CommentInput({
  resourceId,
  replyTo,
  reload,
}: {
  resourceId?: number;
  replyTo?: number;
  reload: () => void;
}) {
  const [commentContent, setCommentContent] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [isUploadingimage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      let height = textareaRef.current.scrollHeight;
      if (height < 128) {
        height = 128;
      }
      textareaRef.current.style.height = `${height}px`;
    }
  };

  // Reset textarea height to default
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "128px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [commentContent]);

  const sendComment = async () => {
    if (isLoading) {
      return;
    }
    if (commentContent === "") {
      showToast({
        message: t("Comment content cannot be empty"),
        type: "error",
      });
      return;
    }
    setLoading(true);
    if (resourceId) {
      const res = await network.createResourceComment(
        resourceId,
        commentContent,
      );
      if (res.success) {
        setCommentContent("");
        resetTextareaHeight();
        showToast({
          message: t("Comment created successfully"),
          type: "success",
        });
        reload();
      } else {
        showToast({ message: res.message, type: "error" });
      }
    } else if (replyTo) {
      const res = await network.replyToComment(replyTo, commentContent);
      if (res.success) {
        setCommentContent("");
        resetTextareaHeight();
        showToast({
          message: t("Reply created successfully"),
          type: "success",
        });
        reload();
      } else {
        showToast({ message: res.message, type: "error" });
      }
    } else {
      showToast({
        message: t("Invalid resource or reply ID"),
        type: "error",
      });
    }

    setLoading(false);
  };

  const handleAddImage = () => {
    if (isUploadingimage) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > 8 * 1024 * 1024) {
            showToast({
              message: t("Image size exceeds 5MB limit"),
              type: "error",
            });
            return;
          }
        }
        setUploadingImage(true);
        const imageIds: number[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const res = await network.uploadImage(file);
          if (res.success) {
            imageIds.push(res.data!);
          } else {
            showToast({ message: res.message, type: "error" });
            setUploadingImage(false);
            return;
          }
        }
        if (imageIds.length > 0) {
          setCommentContent((prev) => {
            return (
              prev +
              "\n" +
              imageIds.map((id) => `![Image](/api/image/${id})`).join(" ")
            );
          });
        }
        setUploadingImage(false);
      }
    };
    input.click();
  };

  if (!app.isLoggedIn()) {
    return (
      <InfoAlert
        message={t("You need to log in to comment")}
        className={"my-4 alert-info"}
      />
    );
  }

  return (
    <div className={"mt-4 mb-6 textarea w-full p-4 flex flex-col"}>
      <textarea
        ref={textareaRef}
        placeholder={t("Write down your comment")}
        className={"w-full resize-none grow h-32"}
        value={commentContent}
        onChange={(e) => setCommentContent(e.target.value)}
      />
      <div className={"flex items-center"}>
        <button
          className={"btn btn-sm btn-circle mr-2"}
          onClick={handleAddImage}
        >
          {isUploadingimage ? (
            <span className={"loading loading-spinner loading-sm"}></span>
          ) : (
            <MdOutlineImage size={18} />
          )}
        </button>
        <Badge className="badge-ghost hidden sm:inline-flex">
          <MdOutlineInfo size={18} />
          <span>{t("Use markdown format")}</span>
        </Badge>
        <span className={"grow"} />
        <button
          onClick={sendComment}
          className={`btn btn-primary h-8 text-sm mx-2 ${commentContent === "" && "btn-disabled"}`}
        >
          {isLoading ? (
            <span className={"loading loading-spinner loading-sm"}></span>
          ) : null}
          {t("Submit")}
        </button>
      </div>
    </div>
  );
}
