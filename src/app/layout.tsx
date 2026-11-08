import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Providers } from "@/components/providers"
import { APP_NAME, APP_SLOGAN } from "@/lib/config"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${APP_SLOGAN} Plataforma de acompanhamento escolar para alunos, professores e gestão.`,
  applicationName: APP_NAME,
  icons: { icon: "/icon.svg" },
}

export const viewport: Viewport = {
  themeColor: "#071D3A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
