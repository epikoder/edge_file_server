const uri = "http://127.0.0.1:" + (process.env.FILE_SERVER_PORT || "3001");

let test: NodeFileRequest["action"][] = ["copy", "write", "read", "remove"];
const destination = "storage/logo/saved.txt";
const file = "tmp/randomfile.txt";
for (const t of test) {
  let req: NodeFileRequest = {
    action: t,
    file:
      t === "write"
        ? "Anything, Maybe? I don't know"
        : t === "read" || t === "remove"
        ? destination
        : file,
    destination:
      t === "write" ? destination.replace(".txt", "_write.txt") : destination,
    source: t === "write" ? "data" : "local",
  };

  const res = await fetch(uri, {
    method: "POST",
    body: JSON.stringify(req),
  });
  const json = await res.json();
  console.log(t, json);
}
