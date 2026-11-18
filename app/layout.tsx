import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'Kaya Capital','description':'A Malaysian party board game'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
