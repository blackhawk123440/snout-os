'use client';

import Link from 'next/link';

type Variant = 'bookings' | 'pets' | 'messages' | 'reports';

const CONTENT: Record<
  Variant,
  { title: string; body: string; linkLabel?: string; href?: string }
> = {
  bookings: {
    title: 'Next steps',
    body: 'View booking details to see times, sitter info, and visit reports. Need to reschedule? Contact your sitter from the booking or Messages.',
    linkLabel: 'Book a visit',
    href: '/client/bookings/new',
  },
  pets: {
    title: 'How it works',
    body: 'Keep pet profiles up to date so your sitter has the right info for each visit. You can add or edit pets from your profile.',
    linkLabel: 'Profile',
    href: '/client/profile',
  },
  messages: {
    title: 'Support',
    body: 'Message your sitter about upcoming visits or ask questions. For account or billing help, contact support.',
    linkLabel: 'Help',
    href: '/help',
  },
  reports: {
    title: 'Next steps',
    body: 'Visit reports are sent after each visit. View details and media from the report. Questions? Reply in Messages.',
    linkLabel: 'Messages',
    href: '/client/messages',
  },
};

export function ClientListSecondaryModule({ variant }: { variant: Variant }) {
  const { title, body, linkLabel, href } = CONTENT[variant];
  return (
    <aside
      className="hidden rounded-lg border border-border-default bg-surface-secondary/80 p-4 lg:block"
      aria-label={title}
    >
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 text-sm text-text-secondary">{body}</p>
      {linkLabel && href && (
        <Link
          href={href}
          className="mt-2 inline-block text-sm font-medium text-text-secondary hover:text-text-primary hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </aside>
  );
}
