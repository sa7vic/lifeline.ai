import { beforeEach, describe, expect, it } from "vitest";
import i18n, { changeLanguage, getCurrentLocale } from "../index";
import { createFormatters } from "../format";

describe("i18n behavior", () => {
  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage("en");
  });

  it("switches language and updates RTL direction", async () => {
    await changeLanguage("ar");

    expect(getCurrentLocale()).toBe("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(localStorage.getItem("lifeline_locale")).toBe("ar");
  });

  it("falls back to english when locale is unsupported", async () => {
    await changeLanguage("fr");

    expect(getCurrentLocale()).toBe("en");
    expect(i18n.t("auth.sendSosNow")).toBe("Send SOS now");
  });

  it("formats date, number, and currency by locale", () => {
    const en = createFormatters("en");
    const ar = createFormatters("ar");

    expect(en.formatDateTime(Date.now())).not.toBe("");
    expect(en.formatNumber(12345.678)).not.toBe("");
    expect(en.formatCurrency(3499.5, "USD")).toContain("$");
    expect(ar.isRtl).toBe(true);
  });
});
