export const metadata = {
  title: "Our Family Sandwich Tour",
  description: "25 of the world's best sandwiches — one a week",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
          .star-btn { transition: transform 0.1s; }
          .star-btn:active { transform: scale(0.9); }
        `}} />
      </head>
      <body className="bg-amber-50 min-h-screen">{children}</body>
    </html>
  );
}
