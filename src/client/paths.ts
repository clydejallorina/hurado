import { UnreachableError } from "common/errors";
import { uuidToHuradoID } from "common/utils/uuid";

export enum Path {
  Home = "Home",
  Submission = "Submission",
  TaskView = "TaskView",
  TaskEdit = "TaskEdit",
  TaskAttachment = "TaskAttachment",
}

export type PathArguments =
  | { kind: Path.Home }
  | { kind: Path.Submission; uuid: string }
  | { kind: Path.TaskView; slug: string }
  | { kind: Path.TaskEdit; uuid: string }
  | { kind: Path.TaskAttachment; slug: string; path: string };

export function getPath(args: PathArguments) {
  switch (args.kind) {
    case Path.Home:
      return "/";
    case Path.Submission:
      return `/submissions/${uuidToHuradoID(args.uuid)}`;
    case Path.TaskView:
      return `/tasks/${args.slug}`;
    case Path.TaskEdit:
      return `/tasks/${uuidToHuradoID(args.uuid)}/edit`;
    case Path.TaskAttachment:
      return `/tasks/${args.slug}/attachments/${args.path}`;
    default:
      throw new UnreachableError(args);
  }
}

export enum APIPath {
  Login = "Login",
  AttachmentFile = "AttachmentFile",
  SubmissionCreate = "SubmissionCreate",
  UserSubmissions = "UserSubmissions",
  FileHashes = "FileHashes",
  FileUpload = "FileUpload",
  TaskCreate = "TaskCreate",
  TaskUpdate = "TaskUpdate",
  TaskSubmissions = "TaskSubmissions",
}

export type APIPathArguments =
  | { kind: APIPath.Login }
  | { kind: APIPath.SubmissionCreate }
  | { kind: APIPath.UserSubmissions; taskId?: string }
  | { kind: APIPath.FileHashes }
  | { kind: APIPath.FileUpload }
  | { kind: APIPath.TaskCreate }
  | { kind: APIPath.TaskUpdate; id: string }
  | { kind: APIPath.TaskSubmissions; id: string };

export function getAPIPath(args: APIPathArguments) {
  switch (args.kind) {
    case APIPath.Login:
      return "/api/v1/auth/login";
    case APIPath.SubmissionCreate:
      return "/api/v1/submissions";
    case APIPath.UserSubmissions:
      return addSearchParameters("/api/v1/user/submissions", {
        taskId: args.taskId,
      });
    case APIPath.TaskCreate:
      return "/api/v1/tasks";
    case APIPath.TaskUpdate:
      return `/api/v1/tasks/${args.id}`;
    case APIPath.TaskSubmissions:
      return `/api/v1/tasks/${args.id}/submissions`;
    case APIPath.FileUpload:
      return "/api/v1/tasks/files";
    case APIPath.FileHashes:
      return "/api/v1/tasks/files/hashes";
    default:
      throw new UnreachableError(args);
  }
}

function addSearchParameters(base: string, params: Record<string, string | number | undefined>) {
  // This skips anything set to undefined
  let hasKey = false;
  const search = new URLSearchParams();
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined) {
      hasKey = true;
      search.set(key, `${params[key]}`);
    }
  }
  if (hasKey) {
    return `${base}?${search.toString()}`;
  } else {
    return base;
  }
}
