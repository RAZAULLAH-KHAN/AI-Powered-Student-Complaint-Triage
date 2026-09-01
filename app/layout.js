import './globals.css';

export const metadata = {
  title: 'AI Student Complaint Triage Assistant',
  description: 'AI-powered system to classify, prioritize, route, and respond to student complaints with human oversight.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
