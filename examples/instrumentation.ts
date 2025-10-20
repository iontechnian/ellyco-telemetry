import "dotenv/config";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "my-project",
        [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_TRACES_EXPORTER_URL,
    }),
    metricReaders: [
        new PrometheusExporter({ endpoint: "/metrics", port: 9464 }),
    ],
    logRecordProcessors: [
        new SimpleLogRecordProcessor(
            new OTLPLogExporter({ url: process.env.OTEL_LOGS_EXPORTER_URL }),
        ),
    ],
    instrumentations: [],
});

sdk.start();
process.on("SIGTERM", () => {
    sdk.shutdown()
        .then(() => console.log("Tracing terminated"))
        .catch((error) => console.log("Error terminating tracing", error))
        .finally(() => process.exit(0));
});
