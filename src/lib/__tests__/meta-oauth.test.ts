import { getMetaRedirectUri } from "@/lib/meta-oauth";

describe("getMetaRedirectUri", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.META_FACEBOOK_REDIRECT_URI;
    delete process.env.META_INSTAGRAM_REDIRECT_URI;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses the configured app origin without adding a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.revly.es/";

    expect(getMetaRedirectUri("facebook", "https://alias.example/api/facebook/connect"))
      .toBe("https://www.revly.es/api/facebook/callback");
  });

  it("allows the exact callback registered for a provider", () => {
    process.env.META_INSTAGRAM_REDIRECT_URI =
      "https://instagram.example/api/instagram/callback/";

    expect(getMetaRedirectUri("instagram", "https://alias.example/api/instagram/connect"))
      .toBe("https://instagram.example/api/instagram/callback/");
  });

  it("falls back to the request origin when no public URL is configured", () => {
    expect(getMetaRedirectUri("facebook", "http://localhost:3000/api/facebook/connect"))
      .toBe("http://localhost:3000/api/facebook/callback");
  });
});
