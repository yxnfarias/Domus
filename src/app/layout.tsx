import type { Metadata } from 'next'
import { Unbounded, DM_Sans, DM_Mono } from 'next/font/google'
import '@/styles/globals.css'

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-unbounded',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Domus — Qualificação Inteligente de Leads Imobiliários',
  description: 'Plataforma de análise e pré-qualificação automatizada de crédito habitacional para corretores de alto padrão.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${unbounded.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
