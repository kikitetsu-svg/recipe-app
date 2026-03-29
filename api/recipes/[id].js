export const config = { runtime: "edge" };

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const STORE_KEY  = "recipes.json";

const H = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function readRecipes() {
  const r = await fetch(
    `https://blob.vercel-storage.com?prefix=${STORE_KEY}&limit=1`,
    { headers: { authorization: `Bearer ${BLOB_TOKEN}` } }
  );
  const j = await r.json();
  const blob = j.blobs?.[0];
  if (!blob) return [];
  const d = await fetch(blob.url);
  return d.ok ? d.json() : [];
}

async function writeRecipes(recipes) {
  await fetch("https://blob.vercel-storage.com", {
    method:  "PUT",
    headers: {
      authorization:      `Bearer ${BLOB_TOKEN}`,
      "x-vercel-filename": STORE_KEY,
      "content-type":      "application/json",
      "x-allow-overwrite": "1",
    },
    body: JSON.stringify(recipes),
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (!BLOB_TOKEN)
    return new Response(JSON.stringify({ error: "BLOB_READ_WRITE_TOKEN 未設定" }), { status: 500, headers: H });

  const id = new URL(req.url).pathname.split("/").pop();
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: H });

  try {
    const recipes = await readRecipes();

    if (req.method === "GET") {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: H });
      return new Response(JSON.stringify(recipe), { headers: H });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const idx  = recipes.findIndex(r => r.id === id);
      if (idx < 0) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: H });
      const updated = { ...recipes[idx], ...body, id, updatedAt: Date.now() };
      recipes[idx]  = updated;
      await writeRecipes(recipes);
      return new Response(JSON.stringify({ ok: true, recipe: updated }), { headers: H });
    }

    if (req.method === "DELETE") {
      const filtered = recipes.filter(r => r.id !== id);
      await writeRecipes(filtered);
      return new Response(JSON.stringify({ ok: true }), { headers: H });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: H });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: H });
  }
}
