export const config = { runtime: "edge" };

const TOKEN = process.env.GITHUB_TOKEN;
const REPO  = process.env.GITHUB_REPO;
const FILE  = "data/recipes.json";
const API   = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

const H = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const ghHeaders = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "recipe-app",
};

async function readFile() {
  const r = await fetch(API, { headers: ghHeaders });
  if (r.status === 404) return { recipes: [], sha: null };
  const j = await r.json();
  const content = JSON.parse(atob(j.content.replace(/\n/g, "")));
  return { recipes: content, sha: j.sha };
}

async function writeFile(recipes, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(recipes, null, 2))));
  const body = { message: "update recipes", content, ...(sha ? { sha } : {}) };
  await fetch(API, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
  if (!TOKEN || !REPO)
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN / GITHUB_REPO 未設定" }), { status: 500, headers: H });

  const id = new URL(req.url).pathname.split("/").pop();

  try {
    const { recipes, sha } = await readFile();

    if (req.method === "GET") {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: H });
      return new Response(JSON.stringify(recipe), { headers: H });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const idx = recipes.findIndex(r => r.id === id);
      if (idx < 0) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: H });
      recipes[idx] = { ...recipes[idx], ...body, id, updatedAt: Date.now() };
      await writeFile(recipes, sha);
      return new Response(JSON.stringify({ ok: true, recipe: recipes[idx] }), { headers: H });
    }

    if (req.method === "DELETE") {
      const filtered = recipes.filter(r => r.id !== id);
      await writeFile(filtered, sha);
      return new Response(JSON.stringify({ ok: true }), { headers: H });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: H });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: H });
  }
}
