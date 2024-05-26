'use client';

import { Tldraw } from "tldraw";

export default function Home() {
  return (
    <main>
      <Tldraw className="fixed inset-0" hideUi/>
    </main>
  );
}
