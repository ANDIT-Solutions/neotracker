import { KnownLabel, metrics } from '@neo-one/monitor';
import fetch from 'cross-fetch';
import { Context } from 'koa';
import compose from 'koa-compose';
import { bodyParser, getMonitor } from 'neotracker-server-utils-koa';
// @ts-ignore
import { routes } from 'neotracker-shared-web';

const labelNames: ReadonlyArray<string> = [KnownLabel.HTTP_URL, KnownLabel.HTTP_STATUS_CODE];
const SERVER_PROXY_HTTP_CLIENT_JSONRPC_REQUEST_DURATION_SECONDS = metrics.createHistogram({
  name: 'server_proxy_http_client_jsonrpc_request_duration_seconds',
  labelNames,
});

const SERVER_PROXY_HTTP_CLIENT_JSONRPC_REQUEST_FAILURES_TOTAL = metrics.createCounter({
  name: 'server_proxy_http_client_jsonrpc_request_failures_total',
  labelNames,
});

export const nodeRPC = ({ rpcURL }: { readonly rpcURL: string }) => ({
  type: 'route',
  name: 'nodeRPC',
  method: 'post',
  path: routes.RPC,
  middleware: compose([
    bodyParser({ fields: 'body' }),
    async (ctx: Context): Promise<void> => {
      const monitor = getMonitor(ctx);
      const headers = { ...ctx.header };
      const response = await monitor
        .withLabels({
          [monitor.labels.HTTP_URL]: rpcURL,
          [monitor.labels.HTTP_METHOD]: ctx.method,
          [monitor.labels.RPC_TYPE]: 'jsonrpc',
          [monitor.labels.SPAN_KIND]: 'client',
        })
        .captureSpanLog(
          async (span) => {
            span.inject(monitor.formats.HTTP, headers);
            let status = -1;
            try {
              const resp = await fetch(rpcURL, {
                method: ctx.method,
                headers,
                // tslint:disable-next-line no-any
                body: JSON.stringify((ctx.request as any).body),
              });

              ({ status } = resp);

              return resp;
            } finally {
              span.setLabels({ [monitor.labels.HTTP_STATUS_CODE]: status });
            }
          },
          {
            name: 'server_proxy_http_client_jsonrpc_request',
            level: { log: 'verbose', span: 'info' },
            metric: {
              total: SERVER_PROXY_HTTP_CLIENT_JSONRPC_REQUEST_DURATION_SECONDS,
              error: SERVER_PROXY_HTTP_CLIENT_JSONRPC_REQUEST_FAILURES_TOTAL,
            },

            trace: true,
          },
        );

      ctx.status = response.status;
      response.headers.forEach((value: string, key: string) => {
        if (key !== 'transfer-encoding' && key !== 'content-encoding') {
          ctx.set(key, value);
        }
      });
      const { body } = response;
      if (body !== null) {
        ctx.body = body;
      }
    },
  ]),
});
