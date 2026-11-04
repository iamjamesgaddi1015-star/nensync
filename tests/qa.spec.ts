import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

// Independent acceptance of the explicitly labeled local demo. These checks do
// not certify hosted Supabase Auth, PostgreSQL concurrency, email or Realtime.
const artifacts = path.resolve("../../../audits/nensync/evidence");

async function openWorkspace(page: Page) {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Daily standup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Three Must-Wins", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("3 / 3 active", { exact: true })).toBeVisible();
}

test("NS-04/08/13: standup autosaves, compiles exact user text and offers copy fallback", async ({
  page,
}) => {
  await openWorkspace(page);
  const today = page.locator("textarea[name=today_text]");
  const text =
    "QA handoff: preserve <literal> text, accents café, and a second line.\nThen finish the recovery check.";
  await today.fill(text);
  await expect(page.locator("#standup .save-status")).toHaveText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator("textarea[name=today_text]")).toHaveValue(text);
  await page
    .getByRole("button", { name: "Compile Standup", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Your standup, ready to share",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Report preview")).toHaveValue(
    new RegExp("QA handoff: preserve <literal>"),
  );
  await dialog.getByLabel("Copy format").selectOption("plain");
  await expect(dialog.getByLabel("Report preview")).not.toHaveValue(
    /\*\*Today\*\*/,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("QA denied clipboard")),
      },
    });
  });
  await dialog
    .getByRole("button", { name: "Copy Standup", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("report is selected");
  await expect(dialog.getByLabel("Report preview")).toBeFocused();
  await dialog
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compile Standup", exact: true }),
  ).toBeFocused();
});

test("NS-05/08/13: all task CRUD transitions preserve the three-task boundary", async ({
  page,
}) => {
  await openWorkspace(page);
  await expect(
    page.getByRole("button", { name: "Add a priority", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Ship account settings", exact: true })
    .click();
  await expect(page.getByText("2 / 3 active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Add a priority", exact: true })
    .click();
  let editor = page.getByRole("dialog", {
    name: "Make room for a priority",
    exact: true,
  });
  await editor.getByLabel("Task title", { exact: true }).fill("QA priority");
  await editor.getByLabel("Tag", { exact: true }).fill("QA checks");
  await editor
    .getByRole("button", { name: "Add priority", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByText("3 / 3 active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Edit QA priority", exact: true })
    .click();
  editor = page.getByRole("dialog", {
    name: "Edit your priority",
    exact: true,
  });
  await editor
    .getByLabel("Task title", { exact: true })
    .fill("QA priority updated");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "QA priority updated", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Completed today", { exact: false })
    .filter({ has: page.locator("span") })
    .first()
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reopen Ship account settings",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Edit QA priority updated", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Edit your priority", exact: true })
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Delete this task?",
    exact: true,
  });
  await expect(deletion).toBeVisible();
  await deletion
    .getByRole("button", { name: "Keep task", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "QA priority updated", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit QA priority updated", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Edit your priority", exact: true })
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await deletion
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(page.getByText("2 / 3 active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Reopen Ship account settings", exact: true })
    .click();
  await expect(page.getByText("3 / 3 active", { exact: true })).toBeVisible();
  await expect(page.locator("#sign-off textarea")).toHaveValue(
    /Ship account settings \(reopened\)/,
  );
});

test("NS-04/13: offline writing stays protected and saves after reconnection", async ({
  page,
  context,
}) => {
  await openWorkspace(page);
  await context.setOffline(true);
  await expect(
    page.getByText("Offline · some actions need a connection", { exact: true }),
  ).toBeVisible();
  await page
    .locator("textarea[name=today_text]")
    .fill("Offline QA draft to preserve on reconnection.");
  await expect(
    page.getByRole("checkbox", { name: "Ship account settings", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await expect(page.locator("#standup .save-status")).toHaveText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator("textarea[name=today_text]")).toHaveValue(
    "Offline QA draft to preserve on reconnection.",
  );
});

test("NS-04: simultaneous standup drafts require an explicit conflict choice", async ({
  page,
  context,
}) => {
  await openWorkspace(page);
  const other = await context.newPage();
  await openWorkspace(other);
  const local = page.locator("textarea[name=today_text]");
  await local.dispatchEvent("compositionstart");
  await local.fill("My intentionally unsaved conflict draft.");
  await other
    .locator("textarea[name=today_text]")
    .fill("Saved from a second tab.");
  await expect(other.locator("#standup .save-status")).toHaveText(
    "Saved on this device",
  );
  const conflict = page.getByRole("dialog", {
    name: "Two drafts need your choice",
    exact: true,
  });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText(
    "My intentionally unsaved conflict draft.",
  );
  await expect(conflict).toContainText("Saved from a second tab.");
  await local.dispatchEvent("compositionend");
  await conflict
    .getByRole("button", { name: "Save my draft", exact: true })
    .click();
  await expect(conflict).not.toBeVisible();
  await expect(page.locator("#standup .save-status")).toHaveText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.locator("textarea[name=today_text]")).toHaveValue(
    "My intentionally unsaved conflict draft.",
  );
  await other.close();
});

test("NS-06/07/13: timer presets, pause, resume, recovery and cancellation work", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "25m", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page
    .getByLabel("Focus on task")
    .selectOption({ label: "Ship account settings" });
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "50m", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const paused = await page.getByRole("timer").textContent();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("timer")).toHaveText(paused!);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#focus")).toContainText(
    "Working on Ship account settings",
  );
  await page.getByRole("button", { name: "End session", exact: true }).click();
  const end = page.getByRole("dialog", {
    name: "End this interval?",
    exact: true,
  });
  await end.getByRole("button", { name: "Keep going", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await end.getByRole("button", { name: "End session", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-facts")).toContainText("1h 40m");
  await page.getByRole("button", { name: "5m break", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await expect(page.locator("#focus")).toContainText(
    "Breaks never count toward focus time",
  );
});

test("NS-06: expired demo interval recovers once on return without duplicating credit", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "25m", exact: true }).click();
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  // Synthetic local persistence fixture emulates returning after an elapsed tab.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("nensync.demo.v1")!);
    data.snapshot.timer.ends_at = new Date(Date.now() - 1000).toISOString();
    localStorage.setItem("nensync.demo.v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  await page.reload();
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  await expect(page.locator("#sign-off textarea")).toHaveValue(
    /2h 5m across 4 intervals/,
  );
});

test("NS-12: Light/Dark/System persists and explicit selection overrides OS changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openWorkspace(page);
  const appearance = page.getByLabel("Appearance", { exact: true }).first();
  await appearance.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(7, 22, 43)");
  await page.reload();
  await expect(appearance).toHaveValue("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(7, 22, 43)");
  await appearance.selectOption("system");
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(232, 246, 255)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(7, 22, 43)");
  await appearance.selectOption("light");
  await expect
    .poll(() =>
      page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(232, 246, 255)");
});

test("NS-08/13: EOD copy uses confirmed totals and the selected text format", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          document.documentElement.dataset.qaCopied = text;
          return Promise.resolve();
        },
      },
    });
  });
  const report = page.locator("#sign-off");
  await report
    .getByRole("button", { name: "Copy EOD Report", exact: true })
    .click();
  await expect(report.getByRole("status")).toContainText("Copied.");
  const markdown = await page.locator("html").getAttribute("data-qa-copied");
  expect(markdown).toContain("**Completed today**");
  expect(markdown).toContain("1h 40m across 3 intervals");
  await report
    .getByRole("combobox", { name: "Format", exact: true })
    .selectOption("plain");
  await report
    .getByRole("button", { name: "Copy EOD Report", exact: true })
    .click();
  const plain = await page.locator("html").getAttribute("data-qa-copied");
  expect(plain).toContain("Completed today");
  expect(plain).not.toContain("**Completed today**");
});

test("NS-09/13: layouts reflow and every daily section remains reachable", async ({
  page,
}) => {
  await openWorkspace(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    for (const [name, id] of [
      ["Standup", "standup"],
      ["Focus", "focus"],
      ["Sign-off", "sign-off"],
    ]) {
      await page
        .getByRole("navigation", { name: "Workspace sections" })
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await page
      .getByRole("button", { name: "Compile Standup", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Compile Standup", exact: true }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "Copy EOD Report", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Copy EOD Report", exact: true }),
    ).toBeInViewport();
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(artifacts, `qa-${width}-light.png`),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Your workspace settings", exact: true }),
  ).toBeVisible();
});

test("NS-10/13: profile save, export and confirmed demo reset are functional", async ({
  page,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", {
    name: "Your workspace settings",
    exact: true,
  });
  await settings.getByLabel("Your name", { exact: true }).fill("Taylor QA");
  await settings
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(settings).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Taylor");
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await settings
    .getByRole("button", { name: "Export my records", exact: true })
    .click();
  await expect((await download).suggestedFilename()).toMatch(
    /^nensync-.*\.json$/,
  );
  await settings
    .getByRole("button", { name: "Find device drafts", exact: true })
    .click();
  await expect(settings.getByRole("status")).toContainText(
    "No protected device drafts",
  );
  await settings
    .getByRole("button", { name: "Reset demo", exact: true })
    .click();
  const reset = page.getByRole("dialog", {
    name: "Reset this demo?",
    exact: true,
  });
  await reset
    .getByRole("button", { name: "Keep my workspace", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Taylor");
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  await settings
    .getByRole("button", { name: "Reset demo", exact: true })
    .click();
  await reset.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alex");
});

test("NS-01/13: public authentication links have real destinations and honest connection state", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "clear head",
  );
  await page
    .getByRole("link", { name: "Forgot password?", exact: true })
    .click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page
    .getByRole("link", { name: "Back to sign in", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.locator("input[name=password]")).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.locator("input[name=password]")).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByRole("link", { name: "Explore the interactive preview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.goto("/auth/callback?next=https://example.invalid");
  await expect(page).toHaveURL(/\/sign-in\?error=link$/);
});

test("NS-09: automated accessibility scan covers populated light and dark workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openWorkspace(page);
  for (const theme of ["light", "dark"]) {
    await page
      .getByLabel("Appearance", { exact: true })
      .first()
      .selectOption(theme);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: path.join(artifacts, `qa-1440-${theme}.png`),
      fullPage: true,
    });
  }
});
