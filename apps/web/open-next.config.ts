import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Next.js on Cloudflare Workers. No incremental cache or other bindings: the pages are rendered per request
// (the language comes from a cookie) and the data lives in the realtime Worker.
export default defineCloudflareConfig();
