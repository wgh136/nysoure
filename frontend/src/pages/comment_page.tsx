import { useEffect, useState } from "react";
import { network } from "../network/network";
import showToast from "../components/toast";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CommentWithRef, Resource } from "../network/models";
import Loading from "../components/loading";
import Markdown from "react-markdown";
import Badge from "../components/badge";

export default function CommentPage() {
  const params = useParams();
  const commentId = params.id;
  const [comment, setComment] = useState<CommentWithRef | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
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

  useEffect(() => {
    document.title = t("Comment Details");
  });

  if (!comment) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold my-2">{t("Comment")}</h1>
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
      {comment.resource && <ResourceCard resource={comment.resource} />}
      <div className="flex"></div>
      <article>
        <CommentContent content={comment.content} />
      </article>
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
      className="flex flex-row w-full card bg-base-200 shadow overflow-clip my-2"
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
        <p>
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
