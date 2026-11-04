import type { Metadata, Viewport } from 'next';
import './globals.css';
import { OfflineSupport } from '@/components/features/offline';
export const metadata: Metadata = { title: { default:'FitTrack AI · Your fitness workspace', template:'%s · FitTrack AI' }, description:'Food, movement, and progress. Your personal fitness workspace.', appleWebApp:{capable:true,statusBarStyle:'default',title:'FitTrack AI'}, icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'} };
export const viewport: Viewport = { width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: dark)',color:'#11150f'},{media:'(prefers-color-scheme: light)',color:'#f5f6f0'}] };
const themeScript = `(function(){try{var t=localStorage.getItem('fittrack-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}<OfflineSupport/></body></html>; }
