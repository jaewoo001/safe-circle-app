'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), { ssr: false,
  loading: () => <p>Loading Map...</p>
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full h-screen">
        <Map />
      </div>
    </main>
  );
}