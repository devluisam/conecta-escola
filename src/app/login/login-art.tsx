import { BookOpen, Lock, TrendingUp, Users, Wifi } from "lucide-react"
import { LogoMark } from "@/components/brand/logo"

const orbit = [
  { Icon: Wifi, angle: -90, color: "text-brand" },
  { Icon: Users, angle: -18, color: "text-success" },
  { Icon: TrendingUp, angle: 54, color: "text-[#E8762C]" },
  { Icon: Lock, angle: 126, color: "text-brand" },
  { Icon: BookOpen, angle: 198, color: "text-violet" },
]

/** Composição gráfica da área institucional: livro ao centro, serviços em órbita. */
export function LoginArt() {
  const r = 132
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]" aria-hidden>
      <svg viewBox="0 0 360 360" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1877D2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1877D2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="180" cy="180" r="170" fill="url(#glow)" />
        <circle cx="180" cy="180" r={r} fill="none" stroke="#EAF4FF" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="0.1 9" strokeLinecap="round" />
        <circle cx="180" cy="180" r="84" fill="none" stroke="#4B9CF0" strokeOpacity="0.25" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid size-36 place-items-center rounded-[2rem] bg-white/[0.06] ring-1 ring-white/15 backdrop-blur-sm">
          <LogoMark tone="light" className="size-24" />
        </div>
      </div>
      {orbit.map(({ Icon, angle, color }, i) => {
        const rad = (angle * Math.PI) / 180
        const x = 50 + ((r / 360) * 100) * Math.cos(rad)
        const y = 50 + ((r / 360) * 100) * Math.sin(rad)
        return (
          <span
            key={i}
            className="absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] motion-safe:animate-[float_6s_ease-in-out_infinite]"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * -1.2}s` }}
          >
            <Icon className={`size-6 ${color}`} />
          </span>
        )
      })}
      <style>{`@keyframes float{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 6px))}}`}</style>
    </div>
  )
}
