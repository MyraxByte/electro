import { defineConfig } from "vitepress";
import type MarkdownIt from "markdown-it";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const siteUrl = "https://electrojs.myraxbyte.dev";
const releasesUrl = "https://github.com/MyraxByte/electrojs/releases";
const docsRoot = resolve(import.meta.dirname, "..");
const versionsRoot = resolve(docsRoot, "versions");

interface SidebarItem {
    readonly text: string;
    readonly link: string;
}

interface SidebarSection {
    readonly text: string;
    readonly items: readonly SidebarItem[];
}

function compareVersionLinesDesc(left: string, right: string): number {
    const [leftMajor, leftMinor] = left.slice(1).split(".").map(Number);
    const [rightMajor, rightMinor] = right.slice(1).split(".").map(Number);

    if (leftMajor !== rightMajor) {
        return rightMajor - leftMajor;
    }

    return rightMinor - leftMinor;
}

function readVersionLines(): string[] {
    if (!existsSync(versionsRoot)) {
        return [];
    }

    return readdirSync(versionsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^v\d+\.\d+$/.test(entry.name))
        .map((entry) => entry.name)
        .sort(compareVersionLinesDesc);
}

function prefixSidebar(sections: readonly SidebarSection[], prefix = ""): SidebarSection[] {
    return sections.map((section) => ({
        text: section.text,
        items: section.items.map((item) => ({
            text: item.text,
            link: `${prefix}${item.link}`,
        })),
    }));
}

const baseSidebar: readonly SidebarSection[] = [
    {
        text: "Getting Started",
        items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Quick Start", link: "/guide/getting-started" },
            { text: "Project Structure", link: "/guide/project-structure" },
            { text: "Dev Workflow", link: "/guide/dev-workflow" },
        ],
    },
    {
        text: "Core Concepts",
        items: [
            { text: "Modules", link: "/core/modules" },
            { text: "Providers", link: "/core/providers" },
            { text: "Dependency Injection", link: "/core/dependency-injection" },
            { text: "Lifecycle", link: "/core/lifecycle" },
            { text: "Signals", link: "/core/signals" },
            { text: "Jobs", link: "/core/jobs" },
        ],
    },
    {
        text: "UI System",
        items: [
            { text: "Windows", link: "/ui/windows" },
            { text: "Views", link: "/ui/views" },
            { text: "Renderer", link: "/ui/renderer" },
            { text: "Bridge API", link: "/ui/bridge" },
        ],
    },
    {
        text: "Advanced",
        items: [
            { text: "Registry", link: "/advanced/registry" },
            { text: "Code Generation", link: "/advanced/codegen" },
        ],
    },
];

const versionLines = readVersionLines();
const latestSidebar = prefixSidebar(baseSidebar);
const versionedSidebar = Object.fromEntries(
    versionLines.map((versionLine) => [`/versions/${versionLine}/`, prefixSidebar(baseSidebar, `/versions/${versionLine}`)]),
);
const versionsSidebar: readonly SidebarSection[] = [
    {
        text: "Documentation Versions",
        items: [
            { text: "Overview", link: "/versions/" },
            { text: "latest", link: "/guide/introduction" },
            ...versionLines.map((versionLine) => ({
                text: versionLine,
                link: `/versions/${versionLine}/guide/introduction`,
            })),
            { text: "GitHub Releases", link: releasesUrl },
        ],
    },
];

// Extract filename from [filename.ext] in code fence info string.
// VitePress natively only shows the language; this plugin shows the filename instead.
function codeFilenamePlugin(md: MarkdownIt) {
    const fence = md.renderer.rules.fence!;
    md.renderer.rules.fence = (...args) => {
        const [tokens, idx] = args;
        const token = tokens[idx];
        const info = token.info.trim();

        // Extract [filename] if present
        const filenameMatch = info.match(/\[(.+?)\]$/);
        const filename = filenameMatch?.[1] ?? null;

        let html = fence(...args);

        if (filename) {
            // Replace the auto-generated lang label with the filename
            html = html.replace(/<span class="lang">.*?<\/span>/, `<span class="lang file-label">${filename}</span>`);
        }

        return html;
    };
}

export default defineConfig({
    title: "ElectroJS",
    description: "TypeScript framework for Electron apps",
    appearance: "dark",
    sitemap: {
        hostname: siteUrl,
    },

    head: [
        ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
        ["meta", { name: "theme-color", content: "#fba924" }],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:title", content: "ElectroJS" }],
        ["meta", { property: "og:site_name", content: "ElectroJS" }],
        [
            "meta",
            {
                property: "og:description",
                content: "TypeScript framework for Electron apps",
            },
        ],
        // Hugeicons icon font CDN
        [
            "link",
            {
                rel: "stylesheet",
                href: "https://use.hugeicons.com/font/icons.css",
            },
        ],
    ],

    markdown: {
        theme: {
            light: "github-light",
            dark: "github-dark",
        },
        config: (md) => {
            codeFilenamePlugin(md);
        },
    },

    themeConfig: {
        logo: "/favicon.svg",

        search: {
            provider: "local",
        },

        nav: [
            { text: "Guide", link: "/guide/introduction" },
            { text: "Core", link: "/core/modules" },
            { text: "UI", link: "/ui/windows" },
            {
                text: "Versions",
                items: [
                    { text: "latest", link: "/guide/introduction" },
                    ...versionLines.map((versionLine) => ({
                        text: versionLine,
                        link: `/versions/${versionLine}/guide/introduction`,
                    })),
                    { text: "GitHub Releases", link: releasesUrl },
                ],
            },
        ],

        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/MyraxByte/electrojs",
            },
        ],

        sidebar: {
            "/guide/": latestSidebar,
            "/core/": latestSidebar,
            "/ui/": latestSidebar,
            "/advanced/": latestSidebar,
            ...versionedSidebar,
            "/versions/": versionsSidebar,
        },

        footer: {
            copyright: "Copyright © 2024-present ElectroJS Contributors",
        },
    },
});
