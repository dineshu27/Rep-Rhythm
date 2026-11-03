'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="shell-placeholder shell-error" role="alert"><span className="shell-overline">LET’S TRY THAT AGAIN</span><h1>This page couldn’t load.</h1><p>Your saved prototype logs remain on this device. Retry, or return home.</p><button className="shell-button" onClick={reset}>Try again</button><Link href="/" className="shell-text-link">Back to home</Link></div>; }
