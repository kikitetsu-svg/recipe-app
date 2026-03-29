export const config = { runtime: "edge" };

const TOKEN = process.env.GITHUB_TOKEN;
const REPO  = process.env.GITHUB_REPO;   // 例: kikitetsu-8284/recipe-app
const FILE  = "data/recipes.json";
const API   = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

const H = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  try {
    if (req.method === "GET") {
      const { recipes } = await readFile();
      return new Response(JSON.stringify(recipes), { headers: H });
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (!body.id || !body.name)
        return new Response(JSON.stringify({ error: "id と name は必須" }), { status: 400, headers: H });

      const { recipes, sha } = await readFile();
      const recipe = {
        id: body.id, name: body.name,
        category:    body.category    || "",
        cookTime:    body.cookTime    || "",
        servings:    body.servings    || "",
        note:        body.note        || "",
        sourceUrl:   body.sourceUrl   || "",
        ingredients: body.ingredients || [],
        steps:       body.steps       || [],
        images:      body.images      || [],
        createdAt:   body.createdAt   || Date.now(),
        updatedAt:   Date.now(),
      };
      recipes.unshift(recipe);
      await writeFile(recipes, sha);
      return new Response(JSON.stringify({ ok: true, recipe }), { headers: H });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: H });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: H });
  }
}
