#!/usr/bin/env node

import module from "node:module";

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

// Android app detection
const isAndroidApp = process.argv.includes("--android-app") || process.env.ANDROID_APP === "1";

if (isAndroidApp) {
  await import("./dist/android-entry.js");
} else {
  await import("./dist/entry.js");
}
