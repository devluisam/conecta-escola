import { cn } from "@/lib/utils"

type LogoMarkProps = {
  className?: string
  /** "light" para fundos escuros (azul-marinho), "dark" para fundos claros. */
  tone?: "light" | "dark"
}

/**
 * Marca original: um livro aberto cujas páginas sustentam três nós conectados —
 * conhecimento (livro) + pessoas em rede (nós) + tecnologia (as ligações).
 */
export function LogoMark({ className, tone = "dark" }: LogoMarkProps) {
  const page = tone === "light" ? "#4B9CF0" : "#1877D2"
  const pageShade = tone === "light" ? "#2F86E0" : "#1265B6"
  const line = tone === "light" ? "#EAF4FF" : "#071D3A"
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-10 shrink-0", className)}
      role="img"
      aria-hidden="true"
    >
      {/* ligações da rede */}
      <path
        d="M11 15.5 Q24 3 37 15.5"
        fill="none"
        stroke={line}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="0.1 3.6"
      />
      <path d="M24 9.5 V21" stroke={line} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 15.5 L18 21.5 M37 15.5 L30 21.5" stroke={line} strokeWidth="1.8" strokeLinecap="round" />
      {/* nós */}
      <circle cx="11" cy="15.5" r="3.4" fill={page} />
      <circle cx="37" cy="15.5" r="3.4" fill={page} />
      <circle cx="24" cy="8" r="4" fill="#F5B942" />
      {/* livro aberto */}
      <path d="M24 26 C18.5 22.6 11.5 21.6 5 22.6 V40 C11.5 39 18.5 40 24 43.4 Z" fill={page} />
      <path d="M24 26 C29.5 22.6 36.5 21.6 43 22.6 V40 C36.5 39 29.5 40 24 43.4 Z" fill={pageShade} />
      <path
        d="M9 27.4 C13 27 17 27.6 20.4 29.4 M9 31.6 C13 31.2 17 31.8 20.4 33.6 M27.6 29.4 C31 27.6 35 27 39 27.4 M27.6 33.6 C31 31.8 35 31.2 39 31.6"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

type LogoProps = LogoMarkProps & {
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

export function Logo({ className, tone = "dark", showText = true, size = "md" }: LogoProps) {
  const markSize = { sm: "size-8", md: "size-10", lg: "size-14" }[size]
  const textSize = { sm: "text-[13px]", md: "text-[15px]", lg: "text-xl" }[size]
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className={markSize} />
      {showText && (
        <span className={cn("flex flex-col font-extrabold leading-[1.05] tracking-tight", textSize)}>
          <span className={tone === "light" ? "text-white" : "text-navy"}>CONECTA</span>
          <span className={tone === "light" ? "text-[#4B9CF0]" : "text-brand"}>ESCOLA</span>
        </span>
      )}
      {!showText && <span className="sr-only">Conecta Escola</span>}
    </span>
  )
}
