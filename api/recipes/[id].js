import { kv } from "@vercel/kv";

export const config = { runtime: "edge" };

export default async function handler(req) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (!id) {
    return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers });
  }

  try {
    if (req.method === "GET") {
      const recipe = await kv.get(`recipe:${id}`);
      if (!recipe) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
      }
      return new Response(JSON.stringify(recipe), { headers });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const existing = await kv.get(`recipe:${id}`);
      if (!existing) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
      }
      const updated = { ...existing, ...body, id, updatedAt: Date.now() };
      await kv.set(`recipe:${id}`, updated);
      return new Response(JSON.stringify({ ok: true, recipe: updated }), { headers });
    }

    if (req.method === "DELETE") {
      await kv.del(`recipe:${id}`);
      await kv.zrem("recipe:index", id);
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
