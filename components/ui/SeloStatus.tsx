import type { StatusIdeia } from "@/prisma/gen/client";
import { APARENCIA_STATUS, type FormaSelo } from "./status";

/** Forma desenhada ao lado do texto. Decorativa: o texto ja diz tudo. */
function Forma({ forma }: { forma: FormaSelo }) {
  const comum = {
    width: 10,
    height: 10,
    viewBox: "0 0 10 10",
    "aria-hidden": true,
    focusable: false,
    className: "shrink-0",
  } as const;

  switch (forma) {
    case "triangulo":
      return (
        <svg {...comum}>
          <path d="M5 0.5 9.5 9.5H0.5Z" fill="currentColor" />
        </svg>
      );
    case "anel":
      return (
        <svg {...comum}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "circulo":
      return (
        <svg {...comum}>
          <circle cx="5" cy="5" r="4.5" fill="currentColor" />
        </svg>
      );
    case "losango":
      return (
        <svg {...comum}>
          <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
        </svg>
      );
    case "check":
      return (
        <svg {...comum}>
          <path
            d="M1 5.5 4 8.5 9 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "quadrado":
      return (
        <svg {...comum}>
          <rect x="1" y="1" width="8" height="8" fill="currentColor" />
        </svg>
      );
  }
}

/** Selo de situacao da ideia: cor + forma + texto. */
export function SeloStatus({ status }: { status: StatusIdeia }) {
  const { rotulo, forma, classes } = APARENCIA_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold ${classes}`}
    >
      <Forma forma={forma} />
      {rotulo}
    </span>
  );
}
