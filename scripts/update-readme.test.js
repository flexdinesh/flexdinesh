const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("uses canonical repository names after redirects and preserves static content", async () => {
  const source = fs.readFileSync(path.join(__dirname, "update-readme.js"), "utf8");
  const readme = [
    "# Static intro",
    "<!-- CURRENT-PROJECTS:START -->",
    "Old current projects",
    "<!-- CURRENT-PROJECTS:END -->",
    "<!-- PAST-PROJECTS:START -->",
    "Old past projects",
    "<!-- PAST-PROJECTS:END -->",
    "<!-- BLOG-POST-LIST:START -->",
    "Old blog posts",
    "<!-- BLOG-POST-LIST:END -->",
    "Static footer",
  ].join("\n");
  let output;
  const requestedRepos = [];

  await vm.runInNewContext(source, {
    __dirname,
    console: { log() {}, error(message) { throw new Error(message); } },
    process: { env: {} },
    require(name) {
      if (name === "path") return path;
      if (name === "fs") {
        return {
          readFileSync: () => readme,
          writeFileSync: (_filename, content) => { output = content; },
        };
      }
      throw new Error(`Unexpected module: ${name}`);
    },
    async fetch(url) {
      if (url.startsWith("https://api.github.com/repos/flexdinesh/")) {
        const repo = url.split("/").pop();
        requestedRepos.push(repo);
        const name = `renamed-${repo}`;
        return {
          ok: true,
          json: async () => ({
            name,
            html_url: `https://github.com/flexdinesh/${name}`,
            description: repo === "zero" ? null : "Latest description",
            stargazers_count: 42,
          }),
        };
      }
      assert.equal(url, "https://dineshpandiyan.com/blog/feed.xml");
      return {
        ok: true,
        text: async () => "<rss><item><title>Latest post</title><link>https://example.com/post</link></item></rss>",
      };
    },
  });

  assert.ok(requestedRepos.includes("zero"));
  assert.ok(!requestedRepos.includes("servef"));
  assert.ok(output.startsWith("# Static intro\n"));
  assert.ok(output.endsWith("\nStatic footer"));
  assert.ok(output.includes("- **[renamed-diffx](https://github.com/flexdinesh/renamed-diffx)** | Latest description"));
  assert.ok(output.includes("- **[renamed-zero](https://github.com/flexdinesh/renamed-zero)**\n"));
  assert.ok(output.includes("- **[renamed-blogster](https://github.com/flexdinesh/renamed-blogster)** | 42 stars | Latest description"));
  assert.ok(output.includes("- [Latest post](https://example.com/post)"));
  assert.ok(!output.includes("Old "));
});
