import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("capacitor-web");
const forbiddenPatterns = [
  ["server-only database URL name", /DATABASE_URL/],
  ["server-only MTA key name", /MTA_BUS_API_KEY/],
  ["Prisma client", /@prisma\/client/],
  ["development server URL", /(?:localhost|127\.0\.0\.1|192\.168\.)[:/]\d{2,5}/],
  ["service-worker registration", /serviceWorker\.register/],
];

async function collectFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry);
    const metadata = await stat(absolutePath);
    if (metadata.isDirectory()) files.push(...await collectFiles(absolutePath));
    else files.push(absolutePath);
  }

  return files;
}

const files = await collectFiles(outputDirectory);
const relativeFiles = files.map((file) => path.relative(outputDirectory, file));

if (!relativeFiles.includes("index.html")) {
  throw new Error("Native bundle is missing capacitor-web/index.html.");
}
if (relativeFiles.some((file) => /^(?:sw\.js|sw\.js\.map|workbox-)/.test(file))) {
  throw new Error("Native bundle must not contain web service-worker artifacts.");
}

for (const file of files.filter((candidate) => /\.(?:html|js|css|json)$/.test(candidate))) {
  const contents = await readFile(file, "utf8");
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(contents)) {
      throw new Error(`Native bundle contains forbidden ${label} in ${path.relative(outputDirectory, file)}.`);
    }
  }
}

console.log(`Verified native bundle: ${files.length} files, no server secrets/modules or service worker.`);
