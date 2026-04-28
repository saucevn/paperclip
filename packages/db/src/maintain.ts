/**
 * Database maintenance script for Paperclip.
 *
 * Performs the following in order:
 *   1. Connects to the configured database (external PostgreSQL or embedded).
 *   2. Checks migration status and applies any pending migrations.
 *   3. Verifies the schema is up-to-date after migration.
 *   4. Prints a health summary (schema status, table count).
 *
 * Exit codes:
 *   0 — maintenance complete, schema up-to-date
 *   1 — unrecoverable error (connection failure, migration error, schema still stale)
 *
 * Usage:
 *   pnpm db:maintain
 *   tsx src/maintain.ts
 *
 * Environment:
 *   DATABASE_URL               — use an external PostgreSQL instance
 *   PAPERCLIP_HOME             — base directory for embedded postgres data
 *   PAPERCLIP_INSTANCE_ID      — instance identifier (default: "default")
 *   PAPERCLIP_MIGRATION_SKIP   — set to "true" to skip migration and only report status
 */

import { applyPendingMigrations, inspectMigrations, reconcilePendingMigrationHistory } from "./client.js";
import { resolveMigrationConnection } from "./migration-runtime.js";

const SKIP_MIGRATION = process.env.PAPERCLIP_MIGRATION_SKIP === "true";

function toError(error: unknown, context = "Database maintenance failed"): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(`${context}: ${error}`);
  try {
    return new Error(`${context}: ${JSON.stringify(error)}`);
  } catch {
    return new Error(`${context}: ${String(error)}`);
  }
}

async function main(): Promise<void> {
  const resolved = await resolveMigrationConnection();
  console.log(`[db:maintain] Connected via ${resolved.source}`);

  try {
    // --- 1. Inspect current migration state ---
    let state = await inspectMigrations(resolved.connectionString);

    // --- 2. Attempt drift repair before deciding to apply ---
    if (state.status === "needsMigrations" && state.reason === "pending-migrations") {
      const repair = await reconcilePendingMigrationHistory(resolved.connectionString);
      if (repair.repairedMigrations.length > 0) {
        console.log(
          `[db:maintain] Repaired ${repair.repairedMigrations.length} drifted migration journal entr${repair.repairedMigrations.length === 1 ? "y" : "ies"}: ${repair.repairedMigrations.join(", ")}`,
        );
        state = await inspectMigrations(resolved.connectionString);
      }
    }

    // --- 3. Apply pending migrations (unless skipped) ---
    if (state.status === "upToDate") {
      console.log(
        `[db:maintain] Schema is up-to-date (${state.tableCount} table${state.tableCount === 1 ? "" : "s"}, ${state.appliedMigrations.length} migration${state.appliedMigrations.length === 1 ? "" : "s"} applied)`,
      );
    } else {
      const pending = state.pendingMigrations;
      console.log(
        `[db:maintain] ${pending.length} pending migration${pending.length === 1 ? "" : "s"}: ${pending.join(", ")}`,
      );

      if (SKIP_MIGRATION) {
        console.error("[db:maintain] PAPERCLIP_MIGRATION_SKIP=true — not applying migrations. Schema is stale.");
        process.exit(1);
      }

      console.log(`[db:maintain] Applying ${pending.length} pending migration${pending.length === 1 ? "" : "s"}...`);
      await applyPendingMigrations(resolved.connectionString);

      // --- 4. Verify completion ---
      const after = await inspectMigrations(resolved.connectionString);
      if (after.status !== "upToDate") {
        const remaining = after.status === "needsMigrations" ? after.pendingMigrations : [];
        throw new Error(
          `Migrations incomplete after apply — still pending: ${remaining.join(", ")}`,
        );
      }

      console.log(
        `[db:maintain] Migrations applied successfully (${after.tableCount} table${after.tableCount === 1 ? "" : "s"}, ${after.appliedMigrations.length} migration${after.appliedMigrations.length === 1 ? "" : "s"} applied)`,
      );
    }

    console.log("[db:maintain] Done.");
  } finally {
    await resolved.stop();
  }
}

main().catch((error) => {
  const err = toError(error, "Database maintenance failed");
  process.stderr.write(`[db:maintain] ERROR: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
