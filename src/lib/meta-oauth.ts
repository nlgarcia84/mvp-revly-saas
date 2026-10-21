export type MetaOAuthProvider = "facebook" | "instagram";

/**
 * Returns the exact callback URL sent to Meta both when starting OAuth and
 * when exchanging the authorization code.  An explicit provider URL is
 * useful when the public app URL (or a deployment alias) is not the URL
 * registered in the Meta dashboard.
 */
export function getMetaRedirectUri(
  provider: MetaOAuthProvider,
  requestUrl: string,
): string {
  const configuredUri =
    provider === "facebook"
      ? process.env.META_FACEBOOK_REDIRECT_URI
      : process.env.META_INSTAGRAM_REDIRECT_URI;
  const configuredBase =
    configuredUri || process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin;

  if (configuredUri) {
    const parsedUri = new URL(configuredUri);
    if (!["http:", "https:"].includes(parsedUri.protocol)) {
      throw new Error(`META_${provider.toUpperCase()}_REDIRECT_URI debe usar http o https`);
    }

    // A configured value is already the contract registered in Meta. Preserve
    // it byte-for-byte (including a trailing slash) because Meta compares it
    // literally during both the authorization and code-exchange requests.
    return configuredUri;
  }

  const redirectUri = new URL(
    `/api/${provider}/callback`,
    configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`,
  );

  if (!["http:", "https:"].includes(redirectUri.protocol)) {
    throw new Error(`META_${provider.toUpperCase()}_REDIRECT_URI debe usar http o https`);
  }

  // Normalize only URLs derived from the app origin. Meta compares
  // redirect_uri literally.
  redirectUri.search = "";
  redirectUri.hash = "";
  redirectUri.pathname = redirectUri.pathname.replace(/\/+$/, "");
  return redirectUri.toString();
}
