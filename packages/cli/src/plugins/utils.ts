import { dirname, relative } from "node:path";

/** Strip query and hash from a URL/path. */
export function cleanUrl(url: string): string {
    const [withoutQuery = ""] = url.split("?");
    const [withoutHash = ""] = withoutQuery.split("#");
    return withoutHash;
}

/** Get a relative path from an importer chunk to a target file, always prefixed with `.` */
export function toRelativePath(from: string, to: string): string {
    const rel = relative(dirname(from), to);
    return rel.startsWith(".") ? rel : `./${rel}`;
}
