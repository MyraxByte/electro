export type BridgeNoInput = undefined;
export type BridgeNoPayload = undefined;

export interface BridgeContractEntry<TInput = BridgeNoInput, TOutput = unknown> {
    readonly input: TInput;
    readonly output: TOutput;
}

type PromiseBridgeResult<TValue> = Promise<TValue>;
type BridgeTupleInput = readonly unknown[];

type IsBridgeNoInput<TValue> = [TValue] extends [BridgeNoInput] ? true : false;
type IsBridgeNoPayload<TValue> = [TValue] extends [BridgeNoPayload] ? true : false;

type BridgeMethodFromInput<TInput, TOutput> =
    IsBridgeNoInput<TInput> extends true
        ? () => PromiseBridgeResult<TOutput>
        : [TInput] extends [BridgeTupleInput]
          ? (...args: TInput) => PromiseBridgeResult<TOutput>
          : (input: TInput) => PromiseBridgeResult<TOutput>;

export type BridgeMethod<TEntry extends BridgeContractEntry<any, any>> = BridgeMethodFromInput<TEntry["input"], TEntry["output"]>;

type Simplify<TValue> = {
    [TKey in keyof TValue]: TValue[TKey];
} & {};

type ContractKey<TContracts extends object> = keyof TContracts & string;

type ContractNamespace<TKey extends string> = TKey extends `${infer TNamespace}:${infer _TMethod}` ? TNamespace : never;

type ContractMethodName<TKey extends string> = TKey extends `${string}:${infer TMethod}` ? TMethod : never;

type NormalizeBridgeEntry<TEntry> = TEntry extends BridgeContractEntry<infer TInput, infer TOutput> ? BridgeContractEntry<TInput, TOutput> : never;

type ContractMethodShape<TContracts extends object, TNamespace extends string> = Simplify<{
    [TKey in Extract<ContractKey<TContracts>, `${TNamespace}:${string}`> as ContractMethodName<TKey>]: BridgeMethod<NormalizeBridgeEntry<TContracts[TKey]>>;
}>;

type BuildNamespaceMap<TContracts extends object> = Simplify<{
    [TNamespace in ContractNamespace<ContractKey<TContracts>>]: ContractMethodShape<TContracts, TNamespace>;
}>;

export type BuildBridgeApi<TQueries extends object, TCommands extends object> = Simplify<BuildNamespaceMap<TQueries> & BuildNamespaceMap<TCommands>>;

type BridgeSignalHandlerFromPayload<TPayload> = IsBridgeNoPayload<TPayload> extends true ? () => void : (payload: TPayload) => void;

export type BridgeSignalHandler<TPayload> = BridgeSignalHandlerFromPayload<TPayload>;

export interface RendererSignalSubscription {
    unsubscribe(): void;
}

export interface RendererSignalsApi<TSignals extends object> {
    subscribe<TKey extends keyof TSignals & string>(signalKey: TKey, handler: BridgeSignalHandler<TSignals[TKey]>): RendererSignalSubscription;

    once<TKey extends keyof TSignals & string>(signalKey: TKey, handler: BridgeSignalHandler<TSignals[TKey]>): RendererSignalSubscription;
}

export type InitializeCallback = () => void | Promise<void>;

export interface ElectroRendererApi {
    initialize(callback?: InitializeCallback): Promise<void>;
}
