import Markdown from "react-markdown";
import {app} from "../app.ts";

export default function AboutPage() {
  return <article className={"p-4"}>
    <Markdown>
      {app.siteInfo}
    </Markdown>
  </article>
}