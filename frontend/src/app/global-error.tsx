'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('❌ Global Error:', error);

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Global Error</h1>
      <pre className="bg-gray-100 text-left p-4 rounded overflow-auto text-sm">
        {error?.message || JSON.stringify(error, null, 2)}
      </pre>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
