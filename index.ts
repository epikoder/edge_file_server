import { rm } from "fs";

type FileType = "local" | "data";
interface NodeFileRequest {
  file: string;
  destination?: string;
  type?: FileType;
  action: "copy" | "write" | "read" | "remove";
}
interface NodeFileError {
  status: number;
  code: number;
  message: string;
}

interface NodeFileResponse {
  status: boolean;
  error?: NodeFileError;
  data?: {
    type: "string" | "blob";
    file: string | ArrayBuffer;
  };
  meta?: { [k: string]: any };
}

const parseFileName = (f: string): string =>
  (!import.meta.main ? "./" : import.meta.dir + "/") + f;
const encodeResponse = (r: NodeFileResponse): string => {
  return JSON.stringify(r);
};

const server = Bun.serve({
  port: process.env.FILE_SERVER_PORT || 3001,
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

    const rq = <NodeFileRequest>await req.json();
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
            rq.type === "data"
              ? rq.file
              : await Bun.file(parseFileName(rq.file)).arrayBuffer()
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
              type: "blob",
              file: await file.arrayBuffer(),
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
        return new Response("Welcome to Bun!");
    }
  },
  hostname: "127.0.0.1",
});
console.log(`File Server:: Listening on localhost:${server.port}`);

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
