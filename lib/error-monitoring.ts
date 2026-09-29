type FrontendErrorContext = {
  route?: string;
  requestId?: string;
};

export function captureFrontendError(
  error: unknown,
  context: FrontendErrorContext = {},
) {
  if (process.env.NEXT_PUBLIC_ERROR_MONITORING_ENABLED !== "true") return;
  const message = error instanceof Error ? error.message : "Unknown error";
  // This is the provider-neutral boundary. A production monitoring adapter can
  // replace the sink without passing submitted values, credentials, or user content.
  console.error("RIVERA_FRONTEND_ERROR", {
    message,
    route: context.route,
    requestId: context.requestId,
  });
}
