const fs = require("fs");
const path = require("path");

const CURRENT_REPOS = [
  "gitsy",
  "cbox",
  "tools-wiki",
  "agent-skills",
  "tokeninsights",
  "models.dev-website",
  "models.dev-rss",
  "key-keeper",
  "plasma-tools",
];

const PAST_REPOS = [
  "blogster",
  "design-system-boilerplate",
  "browser-or-node",
  "dev-landing-page",
  "typy",
];

const BLOG_FEED_URL = "https://dineshpandiyan.com/blog/feed.xml";
const README_PATH = path.join(__dirname, "..", "README.md");

async function fetchJSON(url) {
  const headers = {};
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        link: linkMatch[1].trim(),
      });
    }
  }
  return items;
}

async function buildRepoList(repos) {
  const lines = [];
  for (const repo of repos) {
    try {
      const data = await fetchJSON(
        `https://api.github.com/repos/flexdinesh/${repo}`,
      );
      const stars = data.stargazers_count;
      const desc = data.description;
      const url = data.html_url;
      if (desc) {
        lines.push(`- **[${repo}](${url})** | ${stars} stars | ${desc}`);
      } else {
        lines.push(`- **[${repo}](${url})** | ${stars} stars`);
      }
    } catch (err) {
      console.error(`Error fetching ${repo}:`, err.message);
      lines.push(`- **${repo}** | (failed to fetch)`);
    }
  }
  return lines.join("\n");
}

async function buildBlogList() {
  const xml = await fetchText(BLOG_FEED_URL);
  const items = parseRSS(xml);
  return items
    .slice(0, 6)
    .map((item) => `- [${item.title}](${item.link})`)
    .join("\n");
}

function replaceSection(content, startMarker, endMarker, newContent) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Markers not found: ${startMarker} / ${endMarker}`);
  }
  return (
    content.substring(0, startIdx + startMarker.length) +
    "\n" +
    newContent +
    "\n" +
    content.substring(endIdx)
  );
}

async function main() {
  let readme = fs.readFileSync(README_PATH, "utf-8");

  console.log("Updating current projects...");
  const currentProjects = await buildRepoList(CURRENT_REPOS);
  readme = replaceSection(
    readme,
    "<!-- CURRENT-PROJECTS:START -->",
    "<!-- CURRENT-PROJECTS:END -->",
    currentProjects,
  );

  console.log("Updating past popular projects...");
  const pastProjects = await buildRepoList(PAST_REPOS);
  readme = replaceSection(
    readme,
    "<!-- PAST-PROJECTS:START -->",
    "<!-- PAST-PROJECTS:END -->",
    pastProjects,
  );

  console.log("Updating blog posts...");
  const blogPosts = await buildBlogList();
  readme = replaceSection(
    readme,
    "<!-- BLOG-POST-LIST:START -->",
    "<!-- BLOG-POST-LIST:END -->",
    blogPosts,
  );

  fs.writeFileSync(README_PATH, readme);
  console.log("README.md updated successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
