import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/notifications";
import { type Activity, ActivityType } from "~/network/models";
import { network } from "~/network/network";
import { useTranslation } from "~/hook/i18n";
import { useLoaderData, useNavigate } from "react-router";
import Loading from "~/components/loading";
import { CommentContent } from "~/components/comment_tile";
import { MdOutlineArchive, MdOutlinePhotoAlbum } from "react-icons/md";
import Badge from "~/components/badge";
import Markdown from "react-markdown";
import { configFromMatches } from "~/hook/config";
import { translationFromMatches } from "~/hook/i18n";
import { useConfig } from "~/hook/config";

export function meta({ matches}: Route.MetaArgs) {
  const config = configFromMatches(matches);
  const { t } = translationFromMatches(matches);

  return [
    { title: t("Notifications") + " | " + config.server_name },
    { name: "description", content: config.site_description },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Get cookie from request headers for SSR
  const cookie = request.headers.get("Cookie");
  
  // Load first page on server side for SSR
  const response = await network.getUserNotifications(1, cookie ?? undefined);
  if (!response.success) {
    throw new Error("Failed to load notifications");
  }
  return {
    initialActivities: response.data ?? [],
    totalPages: response.totalPages ?? 1,
  };
}

export default function NotificationsPage() {
  const config = useConfig();
  const { t } = useTranslation();
  const { initialActivities, totalPages: initialTotalPages } = useLoaderData<typeof loader>();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const pageRef = useRef(1); // Start from page 1 since we already loaded it
  const maxPageRef = useRef(initialTotalPages);
  const isLoadingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (isLoadingRef.current || pageRef.current >= maxPageRef.current) return;
    isLoadingRef.current = true;
    const response = await network.getUserNotifications(pageRef.current + 1);
    if (response.success) {
      setActivities((prev) => [...prev, ...response.data!]);
      pageRef.current += 1;
      maxPageRef.current = response.totalPages!;
    }
    isLoadingRef.current = false;
  }, []);

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

  // Reset notification count when page loads
  useEffect(() => {
    if (config.isLoggedIn) {
      network.resetUserNotificationsCount();
    }
  }, [config.isLoggedIn]);

  if (!config.isLoggedIn) {
    return (
      <div className="card shadow m-4 p-4 bg-base-100-tr82">
        <div className="text-center">
          <p className="text-lg">{t("You are not logged in. Please log in to access this page.")}</p>
        </div>
      </div>
    );
  }

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
        <div className={"font-bold my-4 break-all"}>
          {activity.resource?.title}
        </div>
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
        <h4 className={"font-bold py-2 break-all"}>
          {activity.file!.filename}
        </h4>
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
        <span className={"mx-2 font-bold text-sm"}>
          {activity.user?.username}
        </span>
        <span
          className={"ml-2 badge-sm sm:badge-md badge badge-primary badge-soft"}
        >
          {messages[activity.type]}
        </span>
      </div>
      {content}
    </div>
  );
}
