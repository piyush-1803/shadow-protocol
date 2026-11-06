import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Shadow Protocol — Go dark. Stay in.',description:'A private real-world multiplayer survival game. Your city. Your strategy. Your escape.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
