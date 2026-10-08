import { BotaoLink } from "@/components/ui/Botao";

/**
 * Ideia inexistente OU ainda em triagem: mesma resposta, para nao revelar
 * que um protocolo existe antes de ser publicado.
 */
export default function IdeiaNaoEncontrada() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-marca">Ideia não encontrada</h1>
      <p>
        Não há ideia publicada com este protocolo. Ideias recém-enviadas só aparecem aqui depois da
        triagem da Secretaria. Se você é o autor, consulte a situação em Acompanhar minha ideia.
      </p>
      <div className="flex flex-wrap gap-3">
        <BotaoLink href="/consulta">Ver ideias publicadas</BotaoLink>
        <BotaoLink href="/acompanhar" variante="contorno">
          Acompanhar minha ideia
        </BotaoLink>
      </div>
    </div>
  );
}
