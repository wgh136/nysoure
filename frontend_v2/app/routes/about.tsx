import type { Route } from "./+types/about";
import Markdown from "react-markdown";
import { network } from "../network/network";
import { configFromMatches } from "../hook/config";
import { useLoaderData } from "react-router";
import type { ReactElement, ReactNode } from "react";

export function meta({ matches }: Route.MetaArgs) {
  const config = configFromMatches(matches);
  return [
    { title: `About - ${config.server_name}` },
    { name: "description", content: config.site_description },
  ];
}

export async function loader() {
  const siteInfo = await network.getSiteInfo();
  if (!siteInfo.success) {
    throw new Error("Failed to load site info");
  }
  return {
    siteInfo: siteInfo.data?.site_info ?? "",
  };
}

export default function About() {
  const { siteInfo } = useLoaderData<typeof loader>();

  return (
    <article className="p-4 bg-base-100/80 backdrop-blur-sm rounded-box mt-4 shadow mx-2">
      <Markdown
        components={{
          a: ({ node, ...props }) => {
            const href = props.href as string;
            // @ts-ignore
            if (props.children?.length === 2) {
              // @ts-ignore
              const first = props.children[0] as ReactNode;
              // @ts-ignore
              const second = props.children[1] as ReactNode;

              if (
                typeof first === "object" &&
                (typeof second === "string" || typeof second === "object")
              ) {
                const img = first as ReactElement;
                // @ts-ignore
                if (img.type === "img") {
                  return (
                    <a
                      className="inline-block card card-border border-base-200 no-underline bg-base-100 shadow-xs hover:shadow-sm transition-shadow mr-1 sm:mr-2 mb-2 w-52 sm:w-64"
                      target="_blank"
                      href={href}
                    >
                      <figure className="h-36 w-full">{img}</figure>
                      <div className="text-base-content text-lg p-4">
                        {second}
                      </div>
                    </a>
                  );
                }
              }
            }
            return (
              <a href={href} target="_blank">
                {props.children}
              </a>
            );
          },
        }}
      >
        {siteInfo}
      </Markdown>
    </article>
  );
}
