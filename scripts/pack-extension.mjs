// Packs extension/ into public/downloads/5am-apply-extension.zip so the site can
// offer it as a download. Runs before every build (npm "prebuild").
//
// The site's own address (NEXT_PUBLIC_SITE_URL) becomes the extension's default
// server and is allowed to connect it in one click, so self-hosted copies work too.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "extension");
const OUT = join(root, "public", "downloads", "5am-apply-extension.zip");
const SKIP = new Set(["README.md", "STORE.md"]);

function list(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? list(p) : [p];
  });
}

let origin = "";
try {
  origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "").origin;
} catch {}

const entries = list(SRC)
  .map((abs) => ({ name: relative(SRC, abs).split(sep).join("/"), data: readFileSync(abs) }))
  .filter((e) => !SKIP.has(e.name))
  .map((e) => {
    if (e.name === "manifest.json" && origin && !new URL(origin).port) {
      const m = JSON.parse(e.data);
      m.externally_connectable.matches = [...new Set([`${origin}/*`, ...m.externally_connectable.matches])];
      return { ...e, data: Buffer.from(JSON.stringify(m, null, 2) + "\n") };
    }
    if (e.name === "defaults.js" && origin) {
      return { ...e, data: Buffer.from(`globalThis.DEFAULT_SERVER = ${JSON.stringify(origin)};\n`) };
    }
    return e;
  });

// Minimal ZIP writer (deflate, UTF-8 names, fixed timestamp for reproducible builds).
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const parts = [];
const central = [];
let offset = 0;
for (const { name, data } of entries) {
  const nameBuf = Buffer.from(name, "utf8");
  const body = deflateRawSync(data, { level: 9 });
  const crc = crc32(data) >>> 0;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  parts.push(local, nameBuf, body);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(0, 12);
  entry.writeUInt16LE(DOS_DATE, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(body.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(nameBuf.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}
const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([...parts, directory, end]));
console.log(`Packed ${entries.length} extension files → public/downloads/5am-apply-extension.zip${origin ? ` (server ${origin})` : ""}`);
