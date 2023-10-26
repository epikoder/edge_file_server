import { rm } from "fs";

const parseFileName = (f?: string): string => {
  return (
    (import.meta.dir.length === 0 ? "" : import.meta.dir + "/") + (f || "")
  );
};
const decodeRequest = (v: string): NodeFileRequest => {
  let r: NodeFileRequest = {
    action: "nil",
    file: "",
  };
  try {
    r = JSON.parse(v) as NodeFileRequest;
  } catch (e) {}
  return r;
};
const encodeResponse = (r: NodeFileResponse): string => {
  return JSON.stringify(r);
};
const log: Console["log"] = (...any) => {
  if (process.env.FILE_SERVER_DEBUG) {
    console.log(...any);
  }
};

const server = Bun.serve({
  port: process.env.FILE_SERVER_PORT || 3000,
  async fetch(req) {
    if (req.method !== "POST")
      return new Response(
        encodeResponse({
          status: false,
          error: {
            code: 1,
            message: "request method not supported",
            status: 405,
          },
        }),
        { status: 405 }
      );

    const rq = decodeRequest(await req.text());
    log(
      rq.action,
      "[FILE: ",
      rq.action === "write" && rq.source === "data"
        ? rq.file.slice(0, 99) + (rq.file.length > 100 ? "[TRUNCATED]" : "")
        : parseFileName(rq.file),
      "]",
      "[DESTINATION: ",
      parseFileName(rq.destination),
      "]",
      "[SOURCE: ",
      parseFileName(rq.source),
      "]"
    );
    switch (rq.action) {
      case "copy": {
        if (!rq.destination)
          return new Response(
            encodeResponse({
              status: false,
              error: {
                code: 2,
                message: "destination not specified",
                status: 400,
              },
            })
          );

        let fn = parseFileName(rq.file);
        const file = Bun.file(fn);
        if (!(await file.exists())) {
          return new Response(
            encodeResponse({
              status: false,
              error: {
                code: 3,
                message: "file not found",
                status: 400,
              },
            })
          );
        }

        try {
          await Bun.write(
            parseFileName(rq.destination!),
            await file.arrayBuffer()
          );
        } catch (e) {
          console.log("FILE SERVER::", e);
        }
        return new Response(
          encodeResponse({
            status: true,
          })
        );
      }
      case "write": {
        if (!rq.destination)
          return new Response(
            encodeResponse({
              status: false,
              error: {
                code: 2,
                message: "destination not specified",
                status: 400,
              },
            })
          );

        let dstName = parseFileName(rq.destination);

        try {
          await Bun.write(
            dstName,
            rq.source === "data"
              ? rq.file
              : await Bun.file(parseFileName(rq.file)).arrayBuffer()
          );
        } catch (e) {
          log("FILE SERVER::", e);
        }
        return new Response(
          encodeResponse({
            status: true,
          })
        );
      }
      case "read": {
        let fn = parseFileName(rq.file);
        const file = Bun.file(fn);
        if (!(await file.exists())) {
          return new Response(
            encodeResponse({
              status: false,
              error: {
                code: 3,
                message: "file not found",
                status: 400,
              },
            })
          );
        }
        return new Response(
          encodeResponse({
            status: true,
            data: {
              type: "string",
              file: await file.text(),
            },
          })
        );
      }
      case "remove": {
        let fn = parseFileName(rq.file);
        const file = Bun.file(fn);
        if (await file.exists()) {
          rm(parseFileName(rq.file), (err) => {
            if (err) console.log("FILE SERVER::", err);
          });
        }
        return new Response(
          encodeResponse({
            status: true,
          })
        );
      }
      default:
        return new Response(
          encodeResponse({
            status: false,
            meta: {
              message: "Welcome to Edge Runtime File Server",
            },
          })
        );
    }
  },
  hostname: process.env.FILE_SERVER_LOCAL ? "127.0.0.1" : "0.0.0.0",
});
console.log(`File Server:: Listening on localhost:${server.port}`);

if (await Bun.file("server.js").exists()) {
  const app = Bun.spawn(["node", "server.js"], {
    cwd: "./",
    env: { ...process.env },
    onExit(proc, exitCode, signalCode, error) {
      console.log("Process Terminated:: ", error ?? "");
    },
  });

  for await (const std of app.stdout) {
    console.log(new TextDecoder().decode(std));
  }
}
