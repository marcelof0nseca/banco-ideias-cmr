import { FileSearch, Lightbulb, Scale } from "lucide-react";
import { BotaoLink } from "@/components/ui/Botao";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prazoTriagem } from "@/lib/cadastro";

/**
 * Pagina de apresentacao do programa (dono: Pessoa A, semana 1).
 * Texto provisorio - a versao final acompanha o texto entregue ao portal.
 */

const etapas = (prazo: string) => [
  {
    icone: Lightbulb,
    titulo: "1. Você envia",
    texto: "Qualquer pessoa ou entidade apresenta sua ideia, identificada por CPF ou CNPJ.",
  },
  {
    icone: FileSearch,
    titulo: "2. A Secretaria faz a triagem",
    texto: `Em até ${prazo} a ideia é publicada ou arquivada, com o motivo informado a você.`,
  },
  {
    icone: Scale,
    titulo: "3. Os gabinetes analisam",
    texto: "Ideias publicadas ficam disponíveis aos vereadores, que podem adotá-las como projeto de lei.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="titulo-inicio" className="max-w-3xl">
        <h1 id="titulo-inicio" className="text-3xl font-bold text-azul-cmr sm:text-4xl">
          Sua ideia pode virar lei no Recife
        </h1>
        <p className="mt-4 text-lg">
          O Banco de Ideias Legislativas é o canal da Câmara Municipal do Recife
          para qualquer pessoa apresentar sugestões de projetos de lei
          (Resolução nº 2.690/2018).
        </p>
        <p className="mt-3 text-muted-foreground">
          A adoção de uma ideia é decisão de cada parlamentar: nem toda ideia
          publicada se transforma em projeto de lei.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <BotaoLink href="/participar">Enviar uma ideia</BotaoLink>
          <BotaoLink href="/consulta" variante="contorno">
            Consultar ideias
          </BotaoLink>
        </div>
      </section>

      <section aria-labelledby="titulo-como-funciona">
        <h2 id="titulo-como-funciona" className="text-xl font-bold text-azul-cmr">
          Como funciona
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {etapas(prazoTriagem()).map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo}>
              <Card className="h-full">
                <CardHeader>
                  <Icone aria-hidden="true" className="size-6 text-azul-medio" />
                  <CardTitle className="text-base font-semibold text-azul-cmr">{titulo}</CardTitle>
                  <CardDescription>{texto}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
