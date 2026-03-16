/**
 * Messages Layout - Server-side route protection
 * 
 * Redirects sitters to /sitter/inbox
 * Note: Client-side redirect also exists in page.tsx as fallback
 */

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side redirect is handled by middleware
  // Client-side redirect is handled in page.tsx
  return <>{children}</>;
}
