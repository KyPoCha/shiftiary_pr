/// <reference types="@cloudflare/workers-types" />

import { drizzle } from "drizzle-orm/d1";
import { asc, desc } from "drizzle-orm";
import {
  accountGroups as seedAccountGroups,
  accounts as seedAccounts,
  auditEvents as seedAuditEvents,
  customers as seedCustomers,
  featureTogglesByAccount as seedFeatureTogglesByAccount,
  generatorRulesByAccount as seedGeneratorRulesByAccount,
  shadowLoginPolicies as seedShadowLoginPolicies,
} from "../features/accounts/data/accounts";
import type { AppliedConfigurationEvent } from "../features/text-configuration/types";
import { analyzeTextConfigurationWithAi } from "./ai/analyze-text-configuration";
import * as schema from "./db/schema";

type Env = {
  DB: D1Database;
  ENVIRONMENT: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type AdminDataSnapshot = {
  customers: typeof seedCustomers;
  accountGroups: typeof seedAccountGroups;
  accounts: typeof seedAccounts;
  featureTogglesByAccount: typeof seedFeatureTogglesByAccount;
  shadowLoginPolicies: typeof seedShadowLoginPolicies;
  generatorRulesByAccount: typeof seedGeneratorRulesByAccount;
  auditEvents: typeof seedAuditEvents;
  textConfigurationRuns: AppliedConfigurationEvent[];
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return jsonResponse({}, 204);
      }

      if (url.pathname === "/api/admin-data" && request.method === "GET") {
        await seedIfEmpty(env);
        return jsonResponse(await readAdminSnapshot(env));
      }

      if (url.pathname === "/api/admin-data" && request.method === "PUT") {
        const snapshot = (await request.json()) as AdminDataSnapshot;
        await replaceAdminSnapshot(env, snapshot);
        return jsonResponse(await readAdminSnapshot(env));
      }

      if (url.pathname === "/api/text-configuration/analyze" && request.method === "POST") {
        const payload = (await request.json()) as { input?: string };
        const input = payload.input?.trim();

        if (!input) {
          return jsonResponse({ error: "Text input is required" }, 400);
        }

        return jsonResponse(await analyzeTextConfigurationWithAi(input, env));
      }

      if (url.pathname === "/api/text-configuration/apply" && request.method === "POST") {
        const payload = (await request.json()) as {
          customerId: string;
          accountId?: string | null;
          originalText: string;
          structuredIntent: unknown;
          preview: unknown;
          appliedBy?: string;
        };
        const now = new Date().toISOString();
        const db = drizzle(env.DB, { schema });

        await db.insert(schema.textConfigurationRuns).values({
          id: `txt-${Date.now().toString(36)}`,
          accountId: payload.accountId ?? null,
          appliedBy: payload.appliedBy ?? "Current Admin",
          createdAt: now,
          customerId: payload.customerId,
          originalText: payload.originalText,
          previewJson: JSON.stringify(payload.preview),
          structuredIntentJson: JSON.stringify(payload.structuredIntent),
        });

        return jsonResponse({ ok: true, createdAt: now });
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : "Unexpected API error",
        },
        500,
      );
    }
  },
};

async function readAdminSnapshot(env: Env): Promise<AdminDataSnapshot> {
  const db = drizzle(env.DB, { schema });
  const [
    customerRows,
    accountRows,
    groupRows,
    memberRows,
    toggleRows,
    shadowRows,
    generatorRuleRows,
    auditRows,
    textRunRows,
  ] = await Promise.all([
    db.select().from(schema.customers).orderBy(asc(schema.customers.name)),
    db.select().from(schema.accounts).orderBy(asc(schema.accounts.name)),
    db.select().from(schema.accountGroups).orderBy(asc(schema.accountGroups.name)),
    db.select().from(schema.accountGroupMembers),
    db.select().from(schema.featureToggles),
    db.select().from(schema.shadowLoginPolicies),
    db.select().from(schema.generatorRules),
    db.select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.createdAt)),
    db.select().from(schema.textConfigurationRuns).orderBy(desc(schema.textConfigurationRuns.createdAt)),
  ]);

  return {
    customers: customerRows.map((row) => ({
      id: row.id,
      contractTier: row.contractTier,
      legalName: row.legalName,
      name: row.name,
      region: row.region,
    })),
    accountGroups: groupRows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      description: row.description,
      memberAccountIds: memberRows.filter((member) => member.groupId === row.id).map((member) => member.accountId),
      name: row.name,
    })),
    accounts: accountRows.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      department: row.department,
      groupIds: memberRows.filter((member) => member.accountId === row.id).map((member) => member.groupId),
      lastScheduleGeneratedAt: row.lastScheduleGeneratedAt,
      name: row.name,
      owner: row.owner,
      plan: row.plan,
      seats: row.seats,
      status: row.status,
      timezone: row.timezone,
      workers: row.workers,
    })),
    featureTogglesByAccount: groupByAccount(toggleRows),
    shadowLoginPolicies: Object.fromEntries(shadowRows.map((row) => [row.accountId, row])),
    generatorRulesByAccount: Object.fromEntries(generatorRuleRows.map((row) => [row.accountId, row])),
    auditEvents: auditRows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      action: row.action,
      actor: row.actor,
      createdAt: row.createdAt,
      severity: row.severity,
      target: row.target,
    })),
    textConfigurationRuns: textRunRows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      appliedBy: row.appliedBy,
      changeCount: safeJsonArrayLength(row.previewJson),
      createdAt: row.createdAt,
      customerId: row.customerId,
      originalText: row.originalText,
      summary: buildTextRunSummary(row.previewJson, row.accountId),
    })),
  };
}

async function replaceAdminSnapshot(env: Env, snapshot: AdminDataSnapshot) {
  const db = drizzle(env.DB, { schema });

  await db.delete(schema.textConfigurationRuns);
  await db.delete(schema.auditEvents);
  await db.delete(schema.generatorRules);
  await db.delete(schema.shadowLoginPolicies);
  await db.delete(schema.featureToggles);
  await db.delete(schema.accountGroupMembers);
  await db.delete(schema.accountGroups);
  await db.delete(schema.accounts);
  await db.delete(schema.customers);

  await insertSnapshot(env, snapshot);
}

async function seedIfEmpty(env: Env) {
  const customerCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM customers").first<{ count: number }>();
  const toggleCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM feature_toggles").first<{ count: number }>();

  if (!customerCount?.count || !toggleCount?.count) {
    await replaceAdminSnapshot(env, {
      customers: seedCustomers,
      accountGroups: seedAccountGroups,
      accounts: seedAccounts,
      auditEvents: seedAuditEvents,
      featureTogglesByAccount: seedFeatureTogglesByAccount,
      generatorRulesByAccount: seedGeneratorRulesByAccount,
      shadowLoginPolicies: seedShadowLoginPolicies,
      textConfigurationRuns: [],
    });
  }
}

async function insertSnapshot(env: Env, snapshot: AdminDataSnapshot) {
  const db = drizzle(env.DB, { schema });

  for (const customer of snapshot.customers) {
    await db.insert(schema.customers).values(customer);
  }

  for (const { groupIds: _groupIds, ...account } of snapshot.accounts) {
    await db.insert(schema.accounts).values(account);
  }

  for (const { memberAccountIds: _memberAccountIds, ...group } of snapshot.accountGroups) {
    await db.insert(schema.accountGroups).values(group);
  }

  const groupMembers = snapshot.accountGroups.flatMap((group) =>
    group.memberAccountIds.map((accountId) => ({
      accountId,
      groupId: group.id,
    })),
  );

  for (const groupMember of groupMembers) {
    await db.insert(schema.accountGroupMembers).values(groupMember);
  }

  const featureToggleRows = Object.entries(snapshot.featureTogglesByAccount).flatMap(([accountId, toggles]) =>
    toggles.map((toggle) => ({ ...toggle, accountId })),
  );

  for (const featureToggle of featureToggleRows) {
    await db.insert(schema.featureToggles).values(featureToggle);
  }

  const shadowRows = Object.values(snapshot.shadowLoginPolicies);

  for (const shadowRow of shadowRows) {
    await db.insert(schema.shadowLoginPolicies).values(shadowRow);
  }

  const generatorRuleRows = Object.values(snapshot.generatorRulesByAccount);

  for (const generatorRule of generatorRuleRows) {
    await db.insert(schema.generatorRules).values(generatorRule);
  }

  for (const auditEvent of snapshot.auditEvents) {
    await db.insert(schema.auditEvents).values(auditEvent);
  }

  for (const textRun of snapshot.textConfigurationRuns ?? []) {
    await db.insert(schema.textConfigurationRuns).values({
      accountId: textRun.accountId,
      appliedBy: textRun.appliedBy,
      createdAt: textRun.createdAt,
      customerId: textRun.customerId,
      id: textRun.id,
      originalText: textRun.originalText,
      previewJson: JSON.stringify({ changes: textRun.changeCount, summary: textRun.summary }),
      structuredIntentJson: JSON.stringify({ source: "snapshot" }),
    });
  }
}

function safeJsonArrayLength(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.length;
    }

    if (parsed && typeof parsed === "object" && "changes" in parsed) {
      return Number((parsed as { changes: unknown }).changes) || 0;
    }
  } catch {
    return 0;
  }

  return 0;
}

function buildTextRunSummary(previewJson: string, accountId: string | null) {
  try {
    const parsed = JSON.parse(previewJson) as { summary?: unknown };

    if (typeof parsed.summary === "string") {
      return parsed.summary;
    }
  } catch {
    return accountId ? `Configuration applied to ${accountId}` : "Configuration applied";
  }

  const changeCount = safeJsonArrayLength(previewJson);
  return `${changeCount} changes applied${accountId ? ` to ${accountId}` : ""}`;
}

function groupByAccount(rows: Array<typeof schema.featureToggles.$inferSelect>) {
  return rows.reduce<Record<string, Array<Omit<typeof rows[number], "accountId">>>>((result, row) => {
    const { accountId, ...toggle } = row;
    result[accountId] = [...(result[accountId] ?? []), toggle];
    return result;
  }, {});
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    headers: {
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    status,
  });
}
