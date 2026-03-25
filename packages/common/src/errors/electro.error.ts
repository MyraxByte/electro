export abstract class ElectroError extends Error {
    public readonly code: string;
    public readonly context?: Readonly<Record<string, unknown>>;

    protected constructor(message: string, code: string, context?: Readonly<Record<string, unknown>>) {
        super(message);

        this.name = new.target.name;
        this.code = code;
        this.context = context;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}
