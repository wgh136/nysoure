import { TagWithCount } from "../network/models.ts";
import { useEffect, useState } from "react";
import { network } from "../network/network.ts";
import showToast from "../components/toast.ts";
import Loading from "../components/loading.tsx";
import Badge from "../components/badge.tsx";
import { useNavigate } from "react-router";
import { useAppContext } from "../components/AppContext.tsx";

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[] | null>(null);
  const context = useAppContext();

  useEffect(() => {
    const storageKey = "tags_list";
    if (context.get(storageKey)) {
      setTags(context.get(storageKey));
    } else {
      network.getAllTags().then((res) => {
        if (res.success) {
          setTags(res.data!);
          context.set(storageKey, res.data!);
        } else {
          showToast({
            type: "error",
            message: res.message || "Failed to load tags",
          });
        }
      });
    }
  }, [context]);

  const navigate = useNavigate();

  if (!tags) {
    return <Loading />;
  }

  const tagsMap = new Map<string, TagWithCount[]>();

  for (const tag of tags || []) {
    const type = tag.type;
    if (!tagsMap.has(type)) {
      tagsMap.set(type, []);
    }
    tagsMap.get(type)?.push(tag);
  }

  for (const [_, tags] of tagsMap) {
    tags.sort((a, b) => b.resources_count - a.resources_count);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className={"text-2xl font-bold py-2"}>Tags</h1>
      {Array.from(tagsMap.entries()).map(([type, tags]) => (
        <div key={type} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold pl-1">
            {type == "" ? "Other" : type}
          </h2>
          <p>
            {tags.map((tag) => (
              <Badge
                onClick={() => {
                  navigate(`/tag/${tag.name}`);
                }}
                key={tag.name}
                className={"m-1 cursor-pointer badge-soft badge-primary"}
              >
                {tag.name +
                  (tag.resources_count > 0 ? ` (${tag.resources_count})` : "")}
              </Badge>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}
