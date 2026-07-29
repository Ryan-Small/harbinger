import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // cdk synth stages the Docker build context — a copy of the repo,
        // other packages' tests included — under cdk.out/. Without this
        // scoping, vitest discovers those copies and fails resolving their
        // workspace imports.
        include: ["test/**/*.test.ts"],
    },
});
