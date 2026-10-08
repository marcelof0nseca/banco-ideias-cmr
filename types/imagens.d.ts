/**
 * Tipos de `import logo from "@/public/x.png"` e do proprio Next.
 *
 * O next-env.d.ts traz as mesmas referencias, mas e gerado por `next dev` /
 * `next build` e fica fora do Git. Na CI o typecheck roda antes de qualquer
 * build: sem este arquivo, o import do logo no Cabecalho falha.
 */
/// <reference types="next" />
/// <reference types="next/image-types/global" />
