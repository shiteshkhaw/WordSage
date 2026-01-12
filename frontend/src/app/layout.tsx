import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from './providers';
import { NotificationProvider, NotificationContainer } from '@/components/notifications';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WordSage - AI Writing Assistant',
  description: 'Your intelligent writing companion for professionals and freelancers',
  other: {
    'razorpay-checkout': 'https://checkout.razorpay.com/v1/checkout.js',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className={inter.className}>
        <NotificationProvider>
          <SessionProvider>{children}</SessionProvider>
          <NotificationContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}
