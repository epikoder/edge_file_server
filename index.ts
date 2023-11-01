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
const logger: Console["log"] = (...any) => {
  if (process.env.FILE_SERVER_DEBUG) {
    console.log(...any);
  }
};

const _write = async (
  rq: Omit<NodeFileRequest, "action"> & { action: "copy" | "write" }
) => {
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

  let file: ArrayBufferLike;
  if (rq.action == "copy") {
    let fn = parseFileName(rq.file);
    var f = Bun.file(fn);
    if (!(await f.exists()))
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
    file = await f.arrayBuffer();
  } else {
    file = new TextEncoder().encode(rq.file).buffer;
  }

  try {
    await Bun.write(parseFileName(rq.destination!), file);
  } catch (e) {
    console.log("FILE SERVER::", e);
  }
  return new Response(
    encodeResponse({
      status: true,
    })
  );
};

const _read = async (rq: NodeFileRequest) => {
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
};
const _delete = async (rq: NodeFileRequest) => {
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
};

const server = Bun.serve({
  port: process.env.FILE_SERVER_PORT || 3000,
  async fetch(req) {
    switch (req.method) {
      case "GET": {
        let arr = encodeURI(req.url).split("//");
        let path = arr.length === 1 ? arr[0] : arr[1];
        let file = path.slice(path.indexOf("/") + 1);
        return new Response(Bun.file(file));
      }
      case "POST": {
        const rq = decodeRequest(await req.text());
        logger(
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
          case "copy":
          case "write":
            return await _write(rq as any);
          case "read":
            return await _read(rq);
          case "remove":
            return await _delete(rq);
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
      }
      default:
        return new Response(
          encodeResponse({
            status: false,
            error: {
              code: 1,
              message: "Only POST and GET is allowed",
              status: 405,
            },
            meta: {
              message: "Welocome to Edge File Server",
            },
          })
        );
    }
  },
  hostname: process.env.FILE_SERVER_LOCAL ? "127.0.0.1" : "0.0.0.0",
});
console.log(`File Server:: Listening on localhost:${server.port}`);

if (await Bun.file("server.js").exists()) {
  setTimeout(async () => {
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
  }, 1000);
}
