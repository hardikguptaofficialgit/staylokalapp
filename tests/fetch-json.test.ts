import { describe, expect, it } from "vitest";
import { readJsonResponse } from "../lib/app/fetch-json";

describe("readJsonResponse", () => {
  it("parses JSON responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it("rejects HTML error pages", async () => {
    const response = new Response("<!DOCTYPE html><html></html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
    await expect(readJsonResponse(response)).rejects.toThrow(/API route not found/i);
  });
});
