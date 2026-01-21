import { useTranslation } from "~/hook/i18n";
import { useNavigate } from "react-router";
import { type Comment } from "~/network/models";
import { network } from "~/network/network";
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
      <div className={"px-2 pt-2 comment_tile"}>
        <CommentContent content={comment.content} />
      </div>
      {comment.content_truncated ? (
        <div className={"pl-2 pb-2"}>
          <Badge className={"badge-soft badge-info badge-sm"}>
            {t("Click to view more")}
          </Badge>
        </div>
      ) : (
        <div className={"h-2"} />
      )}
      <CommentReplies comment={comment} />
    </a>
  );
}

function CommentReplies({ comment }: { comment: Comment }) {
  const { t } = useTranslation();

  if (!comment.replies) {
    return null;
  }

  return (
    <div className={"bg-base-200 mx-2 p-2 rounded-lg"}>
      {comment.replies.map((e) => {
        return (
          <p className={"text-xs mb-1"} key={e.id}>
            <span className={"font-bold"}>{e.user.username}: </span>
            {CommentToPlainText(e.content)}
          </p>
        );
      })}
      {comment.reply_count > comment.replies.length ? (
        <p className={"text-xs text-primary mt-1"}>
          {t("View {count} more replies").replace(
            "{count}",
            (comment.reply_count - comment.replies.length).toString(),
          )}
        </p>
      ) : null}
    </div>
  );
}

function CommentToPlainText(content: string) {
  // Remove Markdown syntax to convert to plain text
  return content
    .replace(/!\[.*?]\(.*?\)/g, "") // Remove images
    .replace(/\[([^\]]+)]\((.*?)\)/g, "$1") // Convert links to just the text
    .replace(/[#>*_`~-]/g, "") // Remove other Markdown characters
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();
}

export function CommentContent({ content }: { content: string }) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.endsWith("  ")) {
      // Ensure that each line ends with two spaces for Markdown to recognize it as a line break
      lines[i] = line + "  ";
    }
  }
  content = lines.join("\n");

  return <Markdown>{content}</Markdown>;
}
