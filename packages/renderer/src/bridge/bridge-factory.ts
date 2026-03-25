import { RendererUsageError } from "../errors/renderer.error";
import type { BridgeTransport } from "./bridge-transport";

type BridgeNamespaceProxy = Record<string, unknown>;
type BridgeRootProxy = Record<string, unknown>;

function createMethodProxy(transport: BridgeTransport, namespace: string): BridgeNamespaceProxy {
    return new Proxy(
        {},
        {
            get(_target, propertyKey: string | symbol): unknown {
                if (typeof propertyKey !== "string") {
                    return undefined;
                }

                if (propertyKey === "then") {
                    return undefined;
                }

                const method = propertyKey.trim();

                if (method.length === 0) {
                    throw RendererUsageError.invalidBridgeMethodKey(namespace, propertyKey);
                }

                return async (...args: readonly unknown[]): Promise<unknown> => {
                    return transport.invoke(`${namespace}:${method}`, args);
                };
            },
            has(_target, propertyKey: string | symbol): boolean {
                return typeof propertyKey === "string" && propertyKey.trim().length > 0 && propertyKey !== "then";
            },

            getOwnPropertyDescriptor(_target, propertyKey: string | symbol): PropertyDescriptor | undefined {
                if (typeof propertyKey !== "string" || propertyKey === "then" || propertyKey.trim().length === 0) {
                    return undefined;
                }

                return {
                    configurable: true,
                    enumerable: true,
                };
            },
        },
    );
}

export function createBridgeProxy(transport: BridgeTransport): BridgeRootProxy {
    return new Proxy(
        {},
        {
            get(_target, propertyKey: string | symbol): unknown {
                if (typeof propertyKey !== "string") {
                    return undefined;
                }

                if (propertyKey === "then") {
                    return undefined;
                }

                const namespace = propertyKey.trim();

                if (namespace.length === 0) {
                    throw RendererUsageError.invalidBridgeNamespaceKey(propertyKey);
                }

                return createMethodProxy(transport, namespace);
            },
            has(_target, propertyKey: string | symbol): boolean {
                return typeof propertyKey === "string" && propertyKey.trim().length > 0 && propertyKey !== "then";
            },

            getOwnPropertyDescriptor(_target, propertyKey: string | symbol): PropertyDescriptor | undefined {
                if (typeof propertyKey !== "string" || propertyKey === "then" || propertyKey.trim().length === 0) {
                    return undefined;
                }

                return {
                    configurable: true,
                    enumerable: true,
                };
            },
        },
    );
}
