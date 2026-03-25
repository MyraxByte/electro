export type Platform = "macos" | "windows" | "linux";

export function getPlatform(): Platform {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) return "macos";
    if (ua.includes("win")) return "windows";
    return "linux";
}
