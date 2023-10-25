type SourceType = "local" | "data";
interface NodeFileRequest {
  file: string;
  destination?: string;
  source?: SourceType;
  action: "copy" | "write" | "read" | "remove" | 'nil';
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
