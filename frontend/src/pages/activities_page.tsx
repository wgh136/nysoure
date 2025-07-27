import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ActivityType } from "../network/models.ts";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import Loading from "../components/loading.tsx";
import { CommentContent } from "../components/comment_tile.tsx";
import { MdOutlineArchive, MdOutlinePhotoAlbum } from "react-icons/md";
import Badge from "../components/badge.tsx";
import Markdown from "react-markdown";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const pageRef = useRef(0);
  const maxPageRef = useRef(1);
  const isLoadingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (isLoadingRef.current || pageRef.current >= maxPageRef.current) return;
    isLoadingRef.current = true;
    const response = await network.getActivities(pageRef.current + 1);
    if (response.success) {
      setActivities((prev) => [...prev, ...response.data!]);
      pageRef.current += 1;
      maxPageRef.current = response.totalPages!;
    } else {
      showToast({
        type: "error",
        message: response.message || "Failed to load activities",
      });
    }
    isLoadingRef.current = false;
  }, []);

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 100 &&
        !isLoadingRef.current &&
        pageRef.current < maxPageRef.current
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage]);

  return (
    <div className={"pb-2"}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
      {pageRef.current < maxPageRef.current && <Loading />}
    </div>
  );
}

function fileSizeToString(size: number) {
  if (size < 1024) {
    return size + "B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + "KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / 1024 / 1024).toFixed(2) + "MB";
  } else {
    return (size / 1024 / 1024 / 1024).toFixed(2) + "GB";
  }
}

function ActivityCard({ activity }: { activity: Activity }) {
  const { t } = useTranslation();

  const messages = [
    "Unknown activity",
    t("Published a resource"),
    t("Updated a resource"),
    t("Posted a comment"),
    t("Added a new file"),
  ];

  const navigate = useNavigate();

  let content = <></>;

  if (
    activity.type === ActivityType.ResourcePublished ||
    activity.type === ActivityType.ResourceUpdated
  ) {
    content = (
      <div className={"mx-1"}>
        <div className={"font-bold my-4"}>{activity.resource?.title}</div>
        {activity.resource?.image && (
          <div>
            <img
              className={"object-contain max-h-52 mt-2 rounded-lg"}
              src={network.getResampledImageUrl(activity.resource.image.id)}
              alt={activity.resource.title}
            />
          </div>
        )}
      </div>
    );
  } else if (activity.type === ActivityType.NewComment) {
    content = (
      <div className="comment_tile">
        <CommentContent content={activity.comment!.content} />
      </div>
    );
  } else if (activity.type === ActivityType.NewFile) {
    content = (
      <div>
        <h4 className={"font-bold py-2"}>{activity.file!.filename}</h4>
        <div className={"text-sm my-1 comment_tile"}>
          <Markdown>
            {activity.file!.description.replaceAll("\n", "  \n")}
          </Markdown>
        </div>
        <p className={"pt-1"}>
          <Badge className={"badge-soft badge-secondary text-xs mr-2"}>
            <MdOutlineArchive size={16} className={"inline-block"} />
            {activity.file!.is_redirect
              ? t("Redirect")
              : fileSizeToString(activity.file!.size)}
          </Badge>
          <Badge className={"badge-soft badge-accent text-xs mr-2"}>
            <MdOutlinePhotoAlbum size={16} className={"inline-block"} />
            {(() => {
              let title = activity.resource!.title;
              if (title.length > 20) {
                title = title.slice(0, 20) + "...";
              }
              return title;
            })()}
          </Badge>
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        "card shadow m-4 p-4 hover:shadow-md transition-shadow cursor-pointer bg-base-100-tr82"
      }
      onClick={() => {
        if (
          activity.type === ActivityType.ResourcePublished ||
          activity.type === ActivityType.ResourceUpdated
        ) {
          navigate(`/resources/${activity.resource?.id}`);
        } else if (activity.type === ActivityType.NewComment) {
          navigate(`/comments/${activity.comment?.id}`);
        } else if (activity.type === ActivityType.NewFile) {
          navigate(`/resources/${activity.resource?.id}#files`);
        }
      }}
    >
      <div className={"flex items-center"}>
        <div className={"avatar w-9 h-9 rounded-full"}>
          <img
            className={"rounded-full"}
            alt={"avatar"}
            src={network.getUserAvatar(activity.user!)}
          />
        </div>
        <span className={"mx-2 font-bold"}>{activity.user?.username}</span>
        <span className={"ml-2 badge badge-primary badge-soft"}>
          {messages[activity.type]}
        </span>
      </div>
      {content}
    </div>
  );
}
