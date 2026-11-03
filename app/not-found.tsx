import Link from 'next/link';
export default function NotFound() { return <main className="workspace shell-not-found"><span className="shell-overline">404 · PAGE NOT FOUND</span><h1>Let’s get you back on track.</h1><p>This page doesn’t exist.</p><Link href="/" className="shell-button">Back to your dashboard</Link></main>; }
