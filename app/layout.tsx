import './globals.css';
import './game.css';
import './branding.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'Kaya Capital — Build your kampung, kacau your kawan.','description':'A fast, social Malaysian property party game for 2–8 players.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
