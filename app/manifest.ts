import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest { return { name:'FitTrack AI', short_name:'FitTrack', description:'Your personal fitness workspace', start_url:'/', scope:'/', display:'standalone', background_color:'#11150f', theme_color:'#11150f', icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}] }; }
