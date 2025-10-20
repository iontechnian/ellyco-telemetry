import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";

export interface SpanOptions<T extends Array<any>> {
    name?: string | ((...args: T) => string);
    attributes?: (...args: T) => Record<string, any>;
}

export function Span<T extends Array<any>>(options?: SpanOptions<T>) {
    return (
        target: object,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const tracer = opentelemetry.trace.getTracer(target.constructor.name);
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: T) {
            const getTraceName = (
                args: any[],
                options?: SpanOptions<any[]>,
            ): string | undefined => {
                if (!options || !options.name) {
                    return undefined;
                }
                if (typeof options.name === "function") {
                    return options.name.apply(this, args) || undefined;
                }
                return options.name || undefined;
            };
            return tracer.startActiveSpan(
                getTraceName.apply(this, [args, options]) || propertyKey,
                (span) => {
                    try {
                        span.setAttributes(
                            options?.attributes?.apply(this, args) ?? {},
                        );
                        const result = originalMethod.apply(this, args);
                        if (result && typeof result.then === "function") {
                            // Async method - end span after promise resolves
                            return result
                                .then((res: any) => {
                                    span.setStatus({ code: SpanStatusCode.OK });
                                    return res;
                                })
                                .catch((err: Error) => {
                                    span.recordException(err);
                                    span.setStatus({
                                        code: SpanStatusCode.ERROR,
                                        message: err?.message,
                                    });
                                    // logger.error(err.message);
                                    throw err;
                                })
                                .finally(() => {
                                    span.end();
                                });
                        } else {
                            // Sync method - end span immediately
                            span.setStatus({ code: SpanStatusCode.OK });
                            span.end();
                            return result;
                        }
                    } catch (err: any) {
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err?.message,
                        });
                        // logger.error(err.message);
                        span.end();
                        throw err;
                    }
                },
            );
        };
    };
}
