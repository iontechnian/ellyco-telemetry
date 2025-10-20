import { afterEach, describe, expect, it, vi } from "vitest";
import { Span } from "./decorators";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";

const mockedSpan = vi.hoisted(() => ({
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
}));

const mockedStartActiveSpan = vi.hoisted(() =>
    vi.fn((
        name: string,
        callback: (span: any) => void,
    ) => callback(mockedSpan))
);

const mockedGetTracer = vi.hoisted(() => ({
    startActiveSpan: mockedStartActiveSpan,
}));

vi.mock(import("@opentelemetry/api"), async (importOriginal) => {
    const original = await importOriginal();

    return {
        ...original,
        default: {
            ...original.default,
            trace: {
                ...original.default.trace,
                getTracer: vi.fn((name: string) => mockedGetTracer),
            },
        },
    } as any;
});

describe("Span", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should support sync methods", () => {
        class Test {
            @Span()
            method() {
                return "test";
            }
        }
        const test = new Test();
        test.method();

        expect(opentelemetry.trace.getTracer).toHaveBeenCalledWith("Test");

        expect(mockedStartActiveSpan).toHaveBeenCalledWith(
            "method",
            expect.any(Function),
        );

        expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
        expect(mockedSpan.setStatus).toHaveBeenCalledWith({
            code: SpanStatusCode.OK,
        });
        expect(mockedSpan.end).toHaveBeenCalled();

        expect(test.method()).toBe("test");
    });

    it("should support async methods", async () => {
        class Test {
            @Span()
            async method() {
                return "test";
            }
        }
        const test = new Test();
        await test.method();

        expect(mockedStartActiveSpan).toHaveBeenCalledWith(
            "method",
            expect.any(Function),
        );

        expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
        expect(mockedSpan.setStatus).toHaveBeenCalledWith({
            code: SpanStatusCode.OK,
        });
        expect(mockedSpan.end).toHaveBeenCalled();

        expect(await test.method()).toBe("test");
    });

    describe("span name", () => {
        it("should allow customizing the span name with a string", () => {
            class Test {
                @Span({ name: "custom-name" })
                method() {
                    return "test";
                }
            }
            const test = new Test();
            test.method();

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                "custom-name",
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });
            expect(mockedSpan.end).toHaveBeenCalled();

            expect(test.method()).toBe("test");
        });

        it("should allow customizing the span name with a function", () => {
            class Test {
                @Span({ name: () => "custom-name" })
                method() {
                    return "test";
                }
            }
            const test = new Test();
            test.method();

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                "custom-name",
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });
            expect(mockedSpan.end).toHaveBeenCalled();

            expect(test.method()).toBe("test");
        });

        it("should allow customizing the span name with a function that receives the arguments", () => {
            class Test {
                @Span<[string]>({ name: (id: string) => `custom-name-${id}` })
                method(id: string) {
                    return `test-${id}`;
                }
            }
            const test = new Test();
            const id = "123";
            test.method(id);

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                `custom-name-${id}`,
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });

            expect(test.method(id)).toBe(`test-${id}`);
        });

        it("should allow customizing the span name with a function that receives the arguments and the class instance", () => {
            class Test {
                constructor(private readonly id: string) {}

                @Span<[string]>({
                    name: function (this: Test, str: string) {
                        return `custom-name-${this.id}-${str}`;
                    },
                })
                method(str: string) {
                    return `test-${str}`;
                }
            }
            const test = new Test("123");

            test.method("456");

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                "custom-name-123-456",
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({});
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });
            expect(mockedSpan.end).toHaveBeenCalled();

            expect(test.method("456")).toBe("test-456");
        });
    });

    describe("span attributes", () => {
        it("should allow customizing the span attributes with a function", () => {
            class Test {
                @Span({ attributes: () => ({ "custom-attribute": "value" }) })
                method() {
                    return "test";
                }
            }
            const test = new Test();
            test.method();

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                "method",
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({
                "custom-attribute": "value",
            });
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });

            expect(test.method()).toBe("test");
        });

        it("should allow customizing the span attributes with a function that receives the arguments", () => {
            class Test {
                @Span<[string]>({
                    attributes: function (this: Test, id: string) {
                        return { "custom-attribute": `value-${id}` };
                    },
                })
                method(id: string) {
                    return `test-${id}`;
                }
            }
            const test = new Test();
            const id = "123";
            test.method(id);

            expect(mockedStartActiveSpan).toHaveBeenCalledWith(
                "method",
                expect.any(Function),
            );

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({
                "custom-attribute": `value-${id}`,
            });
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });

            expect(test.method(id)).toBe(`test-${id}`);
        });

        it("should allow customizing the span attributes with a function that receives the arguments and the class instance", () => {
            class Test {
                constructor(private readonly id: string) {}

                @Span<[string]>({
                    attributes: function (this: Test, str: string) {
                        return {
                            "custom-attribute": `value-${this.id}-${str}`,
                        };
                    },
                })
                method(str: string) {
                    return `test-${str}`;
                }
            }
            const test = new Test("123");
            test.method("456");

            expect(mockedSpan.setAttributes).toHaveBeenCalledWith({
                "custom-attribute": `value-123-456`,
            });
            expect(mockedSpan.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.OK,
            });
            expect(mockedSpan.end).toHaveBeenCalled();

            expect(test.method("456")).toBe("test-456");
        });
    });
});
