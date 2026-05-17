import removeMd from "remove-markdown";

export function removeMarkdown(md: string) {
    md = removeMd(md);
    // Remove lines starting with `:::`
    md = md.replace(/^:::.*/gm, "");
    return md;
}