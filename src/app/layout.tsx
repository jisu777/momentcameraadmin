import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Moment License Admin",
  description: "Invite code and license code management for Moment Camera"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
