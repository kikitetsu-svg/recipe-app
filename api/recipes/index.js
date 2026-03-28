import { kv } from "@vercel/kv";

export const config = { runtime: "edge" };

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === "GET") {
      // Get all recipe IDs sorted by createdAt desc
      const ids = await kv.zrange("recipe:index", 0, -1, { rev: true });
      if (!ids || ids.length === 0) {
        return new Response(JSON.stringify([]), { headers });
      }
      // Fetch each recipe (batch)
      const pipeline = kv.pipeline();
      for (const id of ids) {
        pipeline.get(`recipe:${id}`);
      }
      const results = await pipeline.exec();
      const recipes = results
        .map((r) => r)
        .filter(Boolean);
      return new Response(JSON.stringify(recipes), { headers });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { id, name, category, cookTime, servings, note, sourceUrl,
              ingredients, steps, images, createdAt, updatedAt } = body;

      if (!id || !name) {
        return new Response(JSON.stringify({ error: "id and name are required" }), {
          status: 400, headers,
        });
      }

      const recipe = {
        id, name,
        category: category || "",
        cookTime: cookTime || "",
        servings: servings || "",
        note: note || "",
        sourceUrl: sourceUrl || "",
        ingredients: ingredients || [],
        steps: steps || [],
        images: images || [],
        createdAt: createdAt || Date.now(),
        updatedAt: updatedAt || Date.now(),
      };

      // Store recipe and add to sorted set
      await kv.set(`recipe:${id}`, recipe);
      await kv.zadd("recipe:index", { score: recipe.createdAt, member: id });

      return new Response(JSON.stringify({ ok: true, recipe }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers,
    });
  }
}
