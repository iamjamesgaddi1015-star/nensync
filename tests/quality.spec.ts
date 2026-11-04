import { test, expect } from "@playwright/test";

test("invalid task and profile forms focus the field that needs correction", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("checkbox", { name: "Ship account settings", exact: true })
    .click();
  await expect(page.getByText("2 / 3 active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Add a priority", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Make room for a priority" });
  await editor
    .getByRole("button", { name: "Add priority", exact: true })
    .click();
  await expect(editor.getByLabel("Task title", { exact: true })).toBeFocused();
  await expect(editor.getByRole("alert")).toContainText("Add a title");
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", {
    name: "Your workspace settings",
  });
  await settings.getByLabel("Your name", { exact: true }).fill("");
  await settings
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(settings.getByLabel("Your name", { exact: true })).toBeFocused();
});
test("expired previous-day drafts are deleted on entry without touching other accounts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const text = {
      yesterday_text: "Synthetic expired text",
      today_text: "",
      blockers_text: "",
    };
    const draft = JSON.stringify({
      text,
      version: 1,
      savedAt: Date.now() - 8 * 86400000,
    });
    localStorage.setItem(
      "nensync.draft.demo.11111111-1111-4111-8111-111111111111.2000-01-01",
      draft,
    );
    localStorage.setItem("nensync.draft.demo.other-account.2000-01-01", draft);
  });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Daily standup", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem(
          "nensync.draft.demo.11111111-1111-4111-8111-111111111111.2000-01-01",
        ),
      ),
    )
    .toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("nensync.draft.demo.other-account.2000-01-01"),
    ),
  ).not.toBeNull();
});
test("account endpoints reject foreign-origin requests and callbacks keep redirects on site", async ({
  request,
}) => {
  for (const route of ["/api/account", "/api/password"]) {
    const r = await request.fetch(route, {
      method: route === "/api/account" ? "DELETE" : "POST",
      headers: {
        Origin: "https://unrelated.example",
        "Content-Type": "application/json",
      },
      data: { password: "synthetic-test-input" },
    });
    expect(r.status()).toBe(403);
  }
  for (const route of [
    "/auth/callback?next=https://unrelated.example",
    "/auth/confirm?type=recovery",
  ]) {
    const r = await request.get(route, { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    const destination = new URL(r.headers().location, r.url());
    expect(destination.origin).toBe(new URL(r.url()).origin);
    expect(destination.pathname + destination.search).toBe(
      "/sign-in?error=link",
    );
    expect(
      r
        .headers()
        ["cache-control"].split(",")
        .map((value) => value.trim()),
    ).toContain("no-store");
  }
});
