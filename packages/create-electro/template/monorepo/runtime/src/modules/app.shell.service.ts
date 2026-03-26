import { Injectable, command, query } from "@electrojs/common";
import { inject } from "@electrojs/runtime";
import { shell } from "electron";
import { MainWindow } from "./app.window";

const DOCS_URL = "https://electrojs.myraxbyte.dev/";

export interface ShellState {
    readonly platform: string;
    readonly isMaximized: boolean;
}

@Injectable()
export class ShellService {
    private readonly mainWindow = inject(MainWindow);

    @query()
    public getShellState(): ShellState {
        return {
            platform: process.platform,
            isMaximized: this.mainWindow.window?.isMaximized() ?? false,
        };
    }

    @command()
    public minimizeWindow(): void {
        this.mainWindow.window?.minimize();
    }

    @command()
    public toggleMaximizeWindow(): ShellState {
        const window = this.mainWindow.window;

        if (window) {
            if (window.isMaximized()) {
                window.unmaximize();
            } else {
                window.maximize();
            }
        }

        return this.getShellState();
    }

    @command()
    public closeWindow(): void {
        this.mainWindow.window?.close();
    }

    @command()
    public async openDocumentation(): Promise<void> {
        await shell.openExternal(DOCS_URL);
    }
}
