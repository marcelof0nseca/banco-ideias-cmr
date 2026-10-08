import { BotaoLink } from "@/components/ui/Botao";

/**
 * Pagina de apresentacao do programa (dono: Pessoa A, semana 1).
 * Texto provisorio - a versao final acompanha o texto entregue ao portal.
 */
export default function Home() {
  return (
    <section aria-labelledby="titulo-inicio" className="max-w-3xl">
      <h1 id="titulo-inicio" className="text-3xl font-bold text-azul-cmr">
        Sua ideia pode virar lei no Recife
      </h1>
      <p className="mt-4 text-tinta">
        O Banco de Ideias Legislativas é o canal da Câmara Municipal do Recife
        para qualquer pessoa apresentar sugestões de projetos de lei
        (Resolução nº 2.690/2018). A Secretaria faz a triagem e as ideias
        aprovadas ficam disponíveis para os gabinetes dos vereadores.
      </p>
      <p className="mt-3 text-cinza">
        A adoção de uma ideia é decisão de cada parlamentar: nem toda ideia
        publicada se transforma em projeto de lei.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <BotaoLink href="/participar">Enviar uma ideia</BotaoLink>
        <BotaoLink href="/consulta" variante="secundario">
          Consultar ideias
        </BotaoLink>
      </div>
    </section>
  );
}
