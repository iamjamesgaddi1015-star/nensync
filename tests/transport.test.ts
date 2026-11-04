import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { timedFetch } from "../src/lib/supabase/config";

async function withSlowServer(check: (origin: string) => Promise<void>) {
  const server = createServer((request, response) => {
    const timer = setTimeout(
      () => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"fixture":"synthetic-local-response"}');
      },
      request.url === "/fast" ? 0 : 12_000,
    );
    request.socket.once("close", () => clearTimeout(timer));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("email signup can finish after ten seconds without canceling the response", async () => {
  await withSlowServer(async (origin) => {
    const response = await timedFetch(`${origin}/auth/v1/signup`, {
      method: "POST",
      body: "{}",
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      fixture: "synthetic-local-response",
    });
  });
});

test("ordinary workspace requests retain the ten-second deadline", async () => {
  await withSlowServer(async (origin) => {
    await assert.rejects(timedFetch(`${origin}/rest/v1/tasks`), {
      name: "TimeoutError",
    });
  });
});

test("caller cancellation survives a Request input and the transport deadline", async () => {
  await withSlowServer(async (origin) => {
    const abort = new AbortController();
    const request = new Request(`${origin}/auth/v1/signup`, {
      signal: abort.signal,
    });
    const pending = timedFetch(request);
    const timer = setTimeout(
      () => abort.abort(new Error("synthetic caller stop")),
      50,
    );
    try {
      await assert.rejects(pending, /synthetic caller stop/);
    } finally {
      clearTimeout(timer);
    }
  });
});

test("explicitly clearing a Request signal preserves the native Fetch contract", async () => {
  await withSlowServer(async (origin) => {
    const abort = new AbortController();
    abort.abort(new Error("synthetic old cancellation"));
    const request = new Request(`${origin}/fast`, { signal: abort.signal });
    const response = await timedFetch(request, { signal: null });
    assert.equal(response.status, 200);
  });
});
