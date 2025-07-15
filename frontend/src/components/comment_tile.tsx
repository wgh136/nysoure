import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { MdOutlineComment } from "react-icons/md";
import { Comment } from "../network/models";
import { network } from "../network/network";
import Badge from "./badge";
import Markdown from "react-markdown";

export function CommentTile({
  comment,
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
        "block card bg-base-100-tr82 p-2 my-3 transition-shadow cursor-pointer" +
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
        <p
          className="flex flex-row items-center avatar cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(userLink);
          }}
        >
          <span className="w-8 h-8 rounded-full overflow-clip">
            <img src={network.getUserAvatar(comment.user)} alt={"avatar"} />
          </span>
          <span className={"w-2"}></span>
          <span className={"text-sm font-bold"}>{comment.user.username}</span>
        </p>

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
          <Badge className="badge-ghost">{t("Click to view more")}</Badge>
        )}
        <span className={"grow"}></span>
        {comment.reply_count > 0 && (
          <Badge className={"badge-soft badge-primary mr-2"}>
            <MdOutlineComment size={16} className={"inline-block"} />
            {comment.reply_count}
          </Badge>
        )}
      </div>
    </a>
  );
}

export function CommentContent({ content }: { content: string }) {
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
