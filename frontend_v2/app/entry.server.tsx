import { PassThrough } from "node:stream";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  // 如果是 HEAD 请求，确保设置正确的响应头
  if (request.method === "HEAD") {
    // 设置 Content-Type 响应头
    if (!responseHeaders.has("Content-Type")) {
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
    }
    
    // 对于 HEAD 请求，返回空响应体但保留所有响应头
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const shouldWaitForAllReady =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode;

    const onReady = () => {
      shellRendered = true;
      const body = new PassThrough();
      const stream = new ReadableStream({
        start(controller) {
          body.on("data", (chunk: Buffer) => {
            controller.enqueue(chunk);
          });
          body.on("end", () => {
            controller.close();
          });
        },
      });

      responseHeaders.set("Content-Type", "text/html; charset=utf-8");

      resolve(
        new Response(stream, {
          headers: responseHeaders,
          status: responseStatusCode,
        })
      );

      pipe(body);
    };

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          if (shouldWaitForAllReady) {
            onReady();
          }
        },
        onShellReady() {
          if (!shouldWaitForAllReady) {
            onReady();
          }
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
