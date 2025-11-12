import Markdown from "react-markdown";
import { app } from "../app.ts";
import { ReactElement, ReactNode } from "react";

export default function AboutPage() {
  return (
    <article className={"p-4 bg-base-100-tr82 rounded-2xl mt-4 shadow mx-2"}>
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
                      className={
                        "inline-block card card-border border-base-200 no-underline bg-base-100 shadow-xs hover:shadow-sm transition-shadow mr-1 sm:mr-2 mb-2 w-52 sm:w-64"
                      }
                      target={"_blank"}
                      href={href}
                    >
                      <figure className={"max-h-60 w-full"}>{img}</figure>
                      <div className={"text-base-content text-lg p-4"}>
                        {second}
                      </div>
                    </a>
                  );
                }
              }
            }
            return (
              <a href={href} target={"_blank"}>
                {props.children}
              </a>
            );
          },
        }}
      >
        {app.siteInfo}
      </Markdown>
    </article>
  );
}
