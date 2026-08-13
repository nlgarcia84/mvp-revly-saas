import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  display: "swap",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Revly | Gestión de reviews para negocios",
  description: "Plantilla inicial para un SaaS",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es" suppressHydrationWarning className={geist.variable}>
      <head>
        <meta
          name="facebook-domain-verification"
          content="q0cuhren9qaoveld4k75eycg5ji027"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-slate-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100 transition-colors"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
