import { AlarmClock, Clock3, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { BotaoLink } from "@/components/ui/Botao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prazo } from "@/lib/painel/prazo";
import { mensagemErro, mensagemOk } from "@/lib/painel/retorno";
import { cn } from "@/lib/sistema/utils";

/**
 * Blocos visuais reaproveitados pelas telas do painel. Mesma linguagem da
 * area publica (Card do shadcn, tokens da Camara). DONO: Pessoa B.
 */

/** Titulo da pagina + texto de apoio + acoes opcionais a direita. */
export function CabecalhoPagina({
  sobretitulo,
  titulo,
  children,
  acoes,
}: {
  sobretitulo?: string;
  titulo: string;
  children?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {sobretitulo && (
          <p className="text-sm font-semibold tracking-wide text-marca-medio uppercase">{sobretitulo}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-marca">{titulo}</h1>
        {children && <div className="mt-1 text-muted-foreground">{children}</div>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** Cartao de numero (mesmo desenho do "Numero" da tela publica de Indicadores). */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: number | string;
  detalhe?: string;
  destaque?: "alerta";
}) {
  return (
    <Card className={cn("h-full", destaque === "alerta" && "border-vermelho-cmr/50 bg-vermelho-fundo")}>
      <CardHeader>
        <CardDescription className="font-medium">{rotulo}</CardDescription>
        <CardTitle
          className={cn("text-3xl font-semibold", destaque === "alerta" ? "text-vermelho-cmr" : "text-marca")}
        >
          {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
        </CardTitle>
      </CardHeader>
      {detalhe && <CardContent className="text-xs text-muted-foreground">{detalhe}</CardContent>}
    </Card>
  );
}

/** Selo do prazo de triagem: texto + icone + cor (a cor nunca e o unico sinal). */
export function SeloPrazo({ prazo }: { prazo: Prazo }) {
  const aparencia = {
    "no-prazo": { Icone: Clock3, classes: "text-verde-cmr border-verde-cmr bg-verde-fundo" },
    perto: { Icone: AlarmClock, classes: "text-ambar-cmr border-ambar-cmr bg-ambar-fundo" },
    vencido: { Icone: ShieldAlert, classes: "text-vermelho-cmr border-vermelho-cmr bg-vermelho-fundo" },
  }[prazo.situacao];
  const { Icone } = aparencia;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        aparencia.classes,
      )}
    >
      <Icone aria-hidden="true" className="size-3.5" />
      {prazo.texto}
    </span>
  );
}

/** Pagina acessada por perfil sem permissao. */
export function SemPermissao({ area, inicio }: { area: string; inicio: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Alerta tipo="atencao" titulo="Sem permissão para esta área">
        Seu perfil não tem acesso à área de {area}. Se precisar, peça a liberação à administração do sistema.
      </Alerta>
      <div>
        <BotaoLink href={inicio} variante="contorno">
          Ir para a minha área
        </BotaoLink>
      </div>
    </div>
  );
}

/** Retorno de uma acao (?ok= / ?erro= na URL, funciona sem JS). */
export function Retorno({ ok, erro }: { ok?: string | null; erro?: string | null }) {
  const sucesso = mensagemOk(ok);
  const falha = mensagemErro(erro);
  if (falha) {
    return (
      <Alerta tipo="erro" titulo="Não foi possível concluir">
        {falha}
      </Alerta>
    );
  }
  if (sucesso) {
    return (
      <Alerta tipo="sucesso" titulo="Pronto">
        {sucesso}
      </Alerta>
    );
  }
  return null;
}
