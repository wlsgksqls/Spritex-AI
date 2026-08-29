import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2 incremental cache yet — generation is in-request and results are
// returned as data URLs. Add r2IncrementalCache when a bucket exists.
export default defineCloudflareConfig({});
