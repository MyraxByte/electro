declare module "*.svg" {
    const src: string;
    export default src;
}

declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.svg?react" {
    import type { FunctionComponent, SVGProps } from "react";

    const component: FunctionComponent<SVGProps<SVGSVGElement>>;
    export default component;
}
