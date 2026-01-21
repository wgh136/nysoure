import type { Route } from "./+types/tags";
import { useTranslation } from "../hook/i18n";
import type { TagWithCount } from "../network/models";
import Badge from "~/components/badge";
import { useLoaderData, useNavigate } from "react-router";
import { network } from "../network/network";
import { configFromMatches } from "../hook/config";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: `Tags - ${config.server_name}` },
    { name: "description", content: `Browse all tags on ${config.server_name}` },
  ];
}

export async function loader() {
  const tagsResponse = await network.getAllTags();
  if (!tagsResponse.success) {
    throw new Error("Failed to load tags");
  }
  return {
    tags: tagsResponse.data ?? [],
  };
}

export default function TagsPage() {
  const { t } = useTranslation();
  const { tags } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Group tags by type
  const tagsMap = new Map<string, TagWithCount[]>();

  for (const tag of tags) {
    const type = tag.type;
    if (!tagsMap.has(type)) {
      tagsMap.set(type, []);
    }
    tagsMap.get(type)?.push(tag);
  }

  // Sort tags within each group by resources_count
  for (const [_, tagList] of tagsMap) {
    tagList.sort((a, b) => b.resources_count - a.resources_count);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold py-2">{t("Tags")}</h1>
      {Array.from(tagsMap.entries()).map(([type, tagList]) => (
        <div key={type} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold pl-1">
            {type === "" ? t("Other") : type}
          </h2>
          <p>
            {tagList.map((tag) => (
              <Badge
                onClick={() => {
                  navigate(`/tag/${encodeURIComponent(tag.name)}`);
                }}
                key={tag.name}
                className="m-1 cursor-pointer badge-soft badge-primary shadow-xs"
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
