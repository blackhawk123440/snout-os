'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="mt-4 min-h-[44px] rounded-lg bg-surface-inverse px-6 text-sm font-medium text-text-inverse"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
