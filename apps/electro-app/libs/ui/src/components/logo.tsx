import logoUrl from "../assets/images/logo.png";
import type { ComponentPropsWithoutRef } from "react";

export interface LogoProps extends Omit<ComponentPropsWithoutRef<"img">, "children" | "src"> {}

export default function Logo({ alt = "Cordy App", decoding = "async", ...props }: LogoProps) {
    return <img src={logoUrl} alt={alt} decoding={decoding} {...props} />;
}
