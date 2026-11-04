import { test, expect, type Page } from "@playwright/test";

type AlarmSpy = {
  chimes: number;
  prompts: number;
  contexts: number;
  closed: number;
  permission: NotificationPermission;
  answer: NotificationPermission;
  blockedAudio: boolean;
  queuedLocks: number;
  notifications: { title: string; body: string; tag: string }[];
};
declare global {
  interface Window {
    __alarmSpy: AlarmSpy;
    __releaseAlarm?: () => Promise<void>;
  }
}

// Synthetic platform spies prove API attempts and privacy, not OS delivery or
// that a human heard audio. No provider/account/browser permission is changed.
async function installSpies(
  page: Page,
  options: {
    permission?: NotificationPermission;
    answer?: NotificationPermission;
    unsupported?: boolean;
    blockedAudio?: boolean;
    noLocks?: boolean;
    blockedStorage?: boolean;
    queueAlarmLocks?: boolean;
  } = {},
) {
  await page.addInitScript((options) => {
    const spy: AlarmSpy = {
      chimes: 0,
      prompts: 0,
      contexts: 0,
      closed: 0,
      permission: options.permission ?? "default",
      answer: options.answer ?? "granted",
      blockedAudio: options.blockedAudio ?? false,
      queuedLocks: 0,
      notifications: [],
    };
    window.__alarmSpy = spy;
    class Audio {
      state = "suspended";
      currentTime = 0;
      destination = {};
      constructor() {
        spy.contexts++;
      }
      resume() {
        if (spy.blockedAudio)
          return Promise.reject(new Error("synthetic blocked audio"));
        this.state = "running";
        return Promise.resolve();
      }
      close() {
        this.state = "closed";
        spy.closed++;
        return Promise.resolve();
      }
      createGain() {
        return {
          connect() {},
          disconnect() {},
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
        };
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime() {} },
          connect() {},
          disconnect() {},
          onended: null,
          start() {
            spy.chimes++;
          },
          stop() {},
        };
      }
    }
    class DesktopNotification {
      static get permission() {
        return spy.permission;
      }
      static requestPermission() {
        spy.prompts++;
        spy.permission = spy.answer;
        return Promise.resolve(spy.permission);
      }
      onclick: (() => void) | null = null;
      constructor(title: string, options: NotificationOptions = {}) {
        spy.notifications.push({
          title,
          body: options.body ?? "",
          tag: options.tag ?? "",
        });
      }
      close() {}
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: Audio,
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: DesktopNotification,
    });
    if (options.unsupported) Reflect.deleteProperty(window, "Notification");
    if (options.noLocks)
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: undefined,
      });
    if (options.blockedStorage) {
      const get = Storage.prototype.getItem;
      const set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key: string) {
        if (key.startsWith("nensync.alarm."))
          throw new DOMException(
            "Synthetic alarm storage denial",
            "SecurityError",
          );
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.startsWith("nensync.alarm."))
          throw new DOMException(
            "Synthetic alarm storage denial",
            "SecurityError",
          );
        return set.call(this, key, value);
      };
    }
    if (options.queueAlarmLocks) {
      const request = navigator.locks.request.bind(navigator.locks);
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: {
          request(name: string, callback: (lock: unknown) => Promise<unknown>) {
            if (!name.startsWith("nensync.alarm.claim."))
              return request(name, callback);
            spy.queuedLocks++;
            return new Promise((resolve) => {
              window.__releaseAlarm = async () => {
                resolve(await callback(null));
              };
            });
          },
        },
      });
    }
  }, options);
}
async function open(page: Page) {
  await page.goto("/demo");
  await expect(
    page.getByRole("group", { name: "Completion alarm", exact: true }),
  ).toBeVisible();
}
async function start(page: Page, kind: "focus" | "break" = "focus") {
  await page
    .getByRole("button", {
      name: kind === "break" ? "5m break" : "25m",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
}
async function shorten(page: Page, milliseconds = 1800) {
  await page.evaluate((milliseconds) => {
    const data = JSON.parse(localStorage.getItem("nensync.demo.v1")!);
    data.snapshot.timer.ends_at = new Date(
      Date.now() + milliseconds,
    ).toISOString();
    localStorage.setItem("nensync.demo.v1", JSON.stringify(data));
    window.dispatchEvent(
      new StorageEvent("storage", { key: "nensync.demo.v1" }),
    );
  }, milliseconds);
}
async function counts(page: Page) {
  return page.evaluate(() => ({
    chimes: window.__alarmSpy.chimes,
    notifications: window.__alarmSpy.notifications.length,
    prompts: window.__alarmSpy.prompts,
  }));
}

test("NS-14: permission is explicit, sound/test settings work and mute persists", async ({
  page,
}) => {
  await installSpies(page);
  await open(page);
  expect(await counts(page)).toEqual({
    chimes: 0,
    notifications: 0,
    prompts: 0,
  });
  await page.getByRole("button", { name: "Test alarm", exact: true }).click();
  await expect.poll(async () => (await counts(page)).chimes).toBe(1);
  await expect(page.locator(".alarm-status")).toContainText(
    "Test chime played",
  );
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Sound", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Enable desktop notifications", exact: true })
    .click();
  await expect.poll(async () => (await counts(page)).prompts).toBe(1);
  const disable = page.getByRole("button", {
    name: "Turn off desktop notifications",
    exact: true,
  });
  await expect(disable).toHaveAttribute("aria-pressed", "true");
  await disable.click();
  await expect(
    page.getByRole("button", {
      name: "Enable desktop notifications",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "false");
  expect((await counts(page)).prompts).toBe(1);
});

for (const kind of ["focus", "break"] as const) {
  test(`NS-14: ${kind} completion alerts once with a private generic notification`, async ({
    page,
  }) => {
    await installSpies(page);
    await open(page);
    await page
      .getByRole("button", {
        name: "Enable desktop notifications",
        exact: true,
      })
      .click();
    await start(page, kind);
    await shorten(page);
    await expect.poll(async () => (await counts(page)).notifications).toBe(1);
    expect((await counts(page)).chimes).toBe(1);
    const messages = await page.evaluate(() => window.__alarmSpy.notifications);
    expect(messages[0].title).toBe(
      kind === "break" ? "Break finished" : "Focus interval finished",
    );
    expect(messages[0].body).toBe("Return to NenSync when you're ready.");
    expect(JSON.stringify(messages)).not.toMatch(
      /Alex|Ship account|Client Work|onboarding/,
    );
    await expect(
      page.getByRole("button", { name: "Start focus", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1400);
    expect((await counts(page)).notifications).toBe(1);
    expect((await counts(page)).chimes).toBe(1);
    await expect(page.locator(".daily-facts")).toContainText(
      kind === "break" ? "1h 40m" : "2h 5m",
    );
  });
}

test("NS-14: denied notification permission does not repeatedly prompt or block muted timer completion", async ({
  page,
}) => {
  await installSpies(page, { answer: "denied" });
  await open(page);
  const enable = page.getByRole("button", {
    name: "Enable desktop notifications",
    exact: true,
  });
  await enable.click();
  await expect(page.locator(".alarm-status")).toContainText("not enabled");
  await enable.click();
  await expect(page.locator(".alarm-status")).toContainText("blocked");
  expect((await counts(page)).prompts).toBe(1);
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  await start(page);
  await shorten(page);
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  expect(await counts(page)).toEqual({
    chimes: 0,
    notifications: 0,
    prompts: 1,
  });
});

test("NS-14: unsupported notification and blocked sound show recovery while the timer remains usable", async ({
  page,
}) => {
  await installSpies(page, { unsupported: true, blockedAudio: true });
  await open(page);
  await page
    .getByRole("button", { name: "Enable desktop notifications", exact: true })
    .click();
  await expect(page.locator(".alarm-status")).toContainText("unavailable");
  await page.getByRole("button", { name: "Test alarm", exact: true }).click();
  await expect(page.locator(".alarm-status")).toContainText(
    "Sound is unavailable or blocked",
  );
  await start(page);
  await shorten(page);
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  expect(await counts(page)).toEqual({
    chimes: 0,
    notifications: 0,
    prompts: 0,
  });
});

test("NS-14: an offline deadline still alerts without claiming a saved interval", async ({
  page,
  context,
}) => {
  await installSpies(page);
  await open(page);
  await page
    .getByRole("button", { name: "Enable desktop notifications", exact: true })
    .click();
  await start(page);
  await shorten(page, 2500);
  await context.setOffline(true);
  await expect(page.locator("#focus")).toContainText("Offline");
  await expect.poll(async () => (await counts(page)).notifications).toBe(1);
  expect((await counts(page)).chimes).toBe(1);
  await expect(page.locator(".daily-facts")).toContainText("1h 40m");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  expect((await counts(page)).notifications).toBe(1);
});

test("NS-14: pause and early cancellation stay silent; recovered historical completion does not replay", async ({
  page,
}) => {
  await installSpies(page);
  await open(page);
  await page
    .getByRole("button", { name: "Enable desktop notifications", exact: true })
    .click();
  await start(page);
  await shorten(page, 2500);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(2800);
  expect((await counts(page)).notifications).toBe(0);
  expect((await counts(page)).chimes).toBe(0);
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await page
    .getByRole("dialog", { name: "End this interval?", exact: true })
    .getByRole("button", { name: "End session", exact: true })
    .click();
  await start(page);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("nensync.demo.v1")!);
    data.snapshot.timer.ends_at = new Date(Date.now() - 1000).toISOString();
    localStorage.setItem("nensync.demo.v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  expect((await counts(page)).notifications).toBe(0);
  expect((await counts(page)).chimes).toBe(0);
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
});

test("NS-14: alarm-storage denial retains sound and completion with a clear limitation", async ({
  page,
}) => {
  await installSpies(page, { blockedStorage: true });
  await open(page);
  await expect(page.locator(".alarm-status")).toContainText(
    "storage is unavailable",
  );
  await start(page);
  await shorten(page);
  await expect.poll(async () => (await counts(page)).chimes).toBe(1);
  await expect(page.locator(".alarm-status")).toContainText(
    "suppression is limited",
  );
  await expect(
    page.getByRole("button", { name: "Start focus", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".daily-facts")).toContainText("2h 5m");
  expect((await counts(page)).notifications).toBe(0);
});

test("NS-14: signing out cancels a queued alert and closes audio resources", async ({
  page,
}) => {
  await installSpies(page, { queueAlarmLocks: true });
  await open(page);
  await page
    .getByRole("button", { name: "Enable desktop notifications", exact: true })
    .click();
  await start(page);
  await shorten(page);
  await expect
    .poll(() => page.evaluate(() => window.__alarmSpy.queuedLocks))
    .toBe(1);
  expect((await counts(page)).chimes).toBe(0);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("nensync-signed-out")),
  );
  await page.evaluate(async () => {
    await window.__releaseAlarm?.();
  });
  await expect
    .poll(() => page.evaluate(() => window.__alarmSpy.closed))
    .toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect((await counts(page)).chimes).toBe(0);
  expect((await counts(page)).notifications).toBe(0);
});

for (const noLocks of [false, true]) {
  test(`NS-14: two armed tabs deliver a single alert ${noLocks ? "without" : "with"} Web Locks`, async ({
    page,
    context,
  }) => {
    await installSpies(page, { permission: "granted", noLocks });
    await open(page);
    await page
      .getByRole("button", {
        name: "Enable desktop notifications",
        exact: true,
      })
      .click();
    await start(page);
    const other = await context.newPage();
    await installSpies(other, { permission: "granted", noLocks });
    await open(other);
    await expect(
      other.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Test alarm", exact: true })
      .click();
    await expect.poll(async () => (await counts(other)).chimes).toBe(1);
    await other.evaluate(() => {
      window.__alarmSpy.chimes = 0;
    });
    await shorten(page, 2500);
    await expect
      .poll(
        async () =>
          (await counts(page)).notifications +
          (await counts(other)).notifications,
      )
      .toBe(1);
    await page.waitForTimeout(1600);
    expect((await counts(page)).chimes + (await counts(other)).chimes).toBe(1);
    expect(
      (await counts(page)).notifications + (await counts(other)).notifications,
    ).toBe(1);
    await expect(page.locator(".daily-facts")).toContainText("2h 5m");
    await expect(other.locator(".daily-facts")).toContainText("2h 5m");
    await other.close();
  });
}
