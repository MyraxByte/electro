import { defineConfig } from "vitepress";
import type MarkdownIt from "markdown-it";

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
            html = html.replace(
                /<span class="lang">.*?<\/span>/,
                `<span class="lang file-label">${filename}</span>`,
            );
        }

        return html;
    };
}

export default defineConfig({
    title: "Electro",
    description: "TypeScript framework for Electron apps",
    appearance: "dark",

    head: [
        ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
        ["meta", { name: "theme-color", content: "#FBBF24" }],
        ["meta", { property: "og:type", content: "website" }],
        ["meta", { property: "og:title", content: "Electro" }],
        [
            "meta",
            {
                property: "og:description",
                content: "TypeScript framework for Electron apps",
            },
        ],
    ],

    markdown: {
        theme: {
            dark: "one-dark-pro",
            light: "github-light",
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
        ],

        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/aspect-build/electro",
            },
        ],

        sidebar: [
            {
                text: "Getting Started",
                items: [
                    {
                        text: "Introduction",
                        link: "/guide/introduction",
                    },
                    {
                        text: "Quick Start",
                        link: "/guide/getting-started",
                    },
                    {
                        text: "Project Structure",
                        link: "/guide/project-structure",
                    },
                    {
                        text: "Dev Workflow",
                        link: "/guide/dev-workflow",
                    },
                ],
            },
            {
                text: "Core Concepts",
                items: [
                    { text: "Modules", link: "/core/modules" },
                    { text: "Providers", link: "/core/providers" },
                    {
                        text: "Dependency Injection",
                        link: "/core/dependency-injection",
                    },
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
                    {
                        text: "Code Generation",
                        link: "/advanced/codegen",
                    },
                ],
            },
        ],

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © 2024-present Electro Contributors",
        },
    },
});
