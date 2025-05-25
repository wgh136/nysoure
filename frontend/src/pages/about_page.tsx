import Markdown from "react-markdown";
import {app} from "../app.ts";
import {ReactElement, ReactNode} from "react";

export default function AboutPage() {
  return <article className={"p-4"}>
    <Markdown components={{
      "a": ({node, ...props}) => {
        const href = props.href as string
        // @ts-ignore
        if (props.children?.length === 2) {
          // @ts-ignore
          const first = props.children[0] as ReactNode
          // @ts-ignore
          const second = props.children[1] as ReactNode

          if (typeof first === "object" && (typeof second === "string" || typeof second === "object")) {
            const img = first as ReactElement
            // @ts-ignore
            if (img.type === "img") {
              return <a className={"inline-block card card-border border-base-300 no-underline bg-base-200 hover:shadow transition-shadow"} target={"_blank"} href={href}>
                <figure className={"max-h-72 max-w-96"}>
                  {img}
                </figure>
                <div className={"card-body text-base-content text-lg"}>
                  {second}
                </div>
              </a>
            }
          }
        }
        return <a href={href} target={"_blank"}>{props.children}</a>
      }
    }}>
      {app.siteInfo}
    </Markdown>
  </article>
}