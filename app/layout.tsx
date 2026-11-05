import type { Metadata, Viewport } from 'next';
import './globals.css';
import { appearanceScript } from '@/lib/appearance';
import { OfflineSupport } from '@/components/features/offline';
export const metadata: Metadata = { title: { default:'FitAi · Train smarter. Fuel better.', template:'%s · FitAi' }, description:'Food, movement, and progress. Your personal fitness workspace.', appleWebApp:{capable:true,statusBarStyle:'default',title:'FitAi'}, icons:{icon:[{url:'/favicon-16x16.png?v=fitai-arm-9',sizes:'16x16',type:'image/png'},{url:'/favicon-32x32.png?v=fitai-arm-9',sizes:'32x32',type:'image/png'},{url:'/icon-512.png?v=fitai-arm-9',sizes:'512x512',type:'image/png'}],apple:[{url:'/apple-touch-icon.png?v=fitai-arm-9',sizes:'180x180',type:'image/png'}]} };
export const viewport: Viewport = { width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: dark)',color:'#100c1a'},{media:'(prefers-color-scheme: light)',color:'#f7f4fc'}] };
const themeScript = appearanceScript;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}<OfflineSupport/></body></html>; }
