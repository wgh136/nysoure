const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

export function ValidateHtml(html: string): boolean {
  const stack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const [full, tagName, selfClose] = match;
    const tag = tagName.toLowerCase();
    const isClosing = full.startsWith("</");
    const isSelfClose = selfClose === "/" || VOID_ELEMENTS.has(tag);

    if (isClosing) {
      if (stack.length === 0 || stack[stack.length - 1] !== tag) {
        return false;
      }
      stack.pop();
    } else if (!isSelfClose) {
      stack.push(tag);
    }

    lastIndex = tagRegex.lastIndex;
  }

  return stack.length === 0;
}