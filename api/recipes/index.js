export const config = { runtime: "edge" };

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const STORE_KEY  = "recipes.json";

const H = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ── Vercel Blob helpers ────────────────────────────────────────────────
async function listBlob() {
  const r = await fetch(
    `https://blob.vercel-storage.com?prefix=${STORE_KEY}&limit=1`,
    { headers: { authorization: `Bearer ${BLOB_TOKEN}` } }
  );
  const j = await r.json();
  return j.blobs?.[0] ?? null;
}

async function readRecipes() {
  const blob = await listBlob();
  if (!blob) return [];
  const r = await fetch(blob.url);
  return r.ok ? r.json() : [];
}

async function writeRecipes(recipes) {
  const body = JSON.stringify(recipes);
  await fetch("https://blob.vercel-storage.com", {
    method:  "PUT",
    headers: {
      authorization:      `Bearer ${BLOB_TOKEN}`,
      "x-vercel-filename": STORE_KEY,
      "content-type":      "application/json",
      "x-allow-overwrite": "1",
    },
    body,
  });
}

// ── Handler ────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (!BLOB_TOKEN)
    return new Response(JSON.stringify({ error: "BLOB_READ_WRITE_TOKEN 未設定" }), { status: 500, headers: H });

  try {
    if (req.method === "GET") {
      const recipes = await readRecipes();
      return new Response(JSON.stringify(recipes), { headers: H });
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (!body.id || !body.name)
        return new Response(JSON.stringify({ error: "id と name は必須" }), { status: 400, headers: H });

      const recipes = await readRecipes();
      const recipe  = {
        id: body.id, name: body.name,
        category: body.category || "", cookTime: body.cookTime || "",
        servings: body.servings || "", note: body.note || "",
        sourceUrl: body.sourceUrl || "",
        ingredients: body.ingredients || [], steps: body.steps || [],
        images: body.images || [],
        createdAt: body.createdAt || Date.now(),
        updatedAt: body.updatedAt || Date.now(),
      };
      recipes.unshift(recipe);
      await writeRecipes(recipes);
      return new Response(JSON.stringify({ ok: true, recipe }), { headers: H });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: H });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: H });
  }
}
