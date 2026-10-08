"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { urlAbsoluta } from "@/lib/url";
import { enviarIdeia, type EstadoCadastro } from "./acoes";

/**
 * Assistente de cadastro em 4 passos (especificacao, secao 3.1).
 *
 * Melhoria progressiva:
 *   - SEM JS: os passos 1 a 3 aparecem juntos num <form> unico, com validacao
 *     nativa do navegador; o servidor revalida tudo e devolve a pagina com
 *     erros ou com o protocolo.
 *   - COM JS: um passo por vez, foco no titulo do passo, erros junto ao campo
 *     e rascunho do passo 2 em sessionStorage (nunca o documento).
 */

type Passo = 1 | 2 | 3;

const CAMPOS_PASSO: Record<2 | 3, string[]> = {
  2: ["temaId", "titulo", "descricao", "bairro", "rpa"],
  3: ["tipoAutor", "documento", "nome", "email", "telefone", "cienciaTratamento"],
};
const CAMPOS_RASCUNHO = CAMPOS_PASSO[2];
const CHAVE_RASCUNHO = "bil-rascunho-ideia";

const NOMES_PASSO = ["Já existe?", "A ideia", "Identificação", "Confirmação"];

const RPAS = [
  "RPA 1 — Centro",
  "RPA 2 — Norte",
  "RPA 3 — Noroeste",
  "RPA 4 — Oeste",
  "RPA 5 — Sudoeste",
  "RPA 6 — Sul",
];

interface Props {
  temas: { id: string; nome: string }[];
  iniciadoEm: string;
  chaveIdempotencia: string;
  versaoAviso: string;
  limites: { titulo: number; descricao: number; descricaoMin: number };
}

type Controle = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Mensagem em portugues para a validacao nativa de um controle. */
function mensagemValidade(el: Controle): string | null {
  const v = el.validity;
  if (v.valid) return null;
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement) return "Escolha uma opção.";
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      return "Para enviar, confirme que está ciente do tratamento dos dados.";
    }
    return "Preencha este campo.";
  }
  if (v.tooShort && "minLength" in el) return `Use pelo menos ${el.minLength} caracteres.`;
  if (v.tooLong && "maxLength" in el) return `Use no máximo ${el.maxLength} caracteres.`;
  if (v.typeMismatch) return "Informe um e-mail válido, como voce@exemplo.com.";
  return "Confira este campo.";
}

function passoDoCampo(campo: string): Passo {
  return CAMPOS_PASSO[2].includes(campo) ? 2 : 3;
}

export function AssistenteCadastro(props: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoCadastro, FormData>(enviarIdeia, {
    fase: "inicial",
  });
  // false no HTML do servidor, true depois da hidratacao.
  const js = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [passo, setPasso] = useState<Passo>(1);
  const [errosCliente, setErrosCliente] = useState<Record<string, string>>({});
  const [tipoAutor, setTipoAutor] = useState(
    estado.fase === "erro" ? (estado.valores.tipoAutor ?? "FISICA") : "FISICA",
  );
  const [contagem, setContagem] = useState({ titulo: 0, descricao: 0 });
  const [anuncio, setAnuncio] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const titulosPasso = useRef<Record<number, HTMLHeadingElement | null>>({});
  const tituloConfirmacao = useRef<HTMLHeadingElement>(null);
  const resumoErro = useRef<HTMLDivElement>(null);

  // Liga o modo passo a passo e restaura o rascunho (so campos da ideia).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const salvo = sessionStorage.getItem(CHAVE_RASCUNHO);
      if (salvo) {
        const rascunho = JSON.parse(salvo) as Record<string, string>;
        for (const campo of CAMPOS_RASCUNHO) {
          const el = form.elements.namedItem(campo) as Controle | null;
          if (el && !el.value && rascunho[campo]) el.value = rascunho[campo];
        }
      }
    } catch {
      // Armazenamento indisponivel: o rascunho e so conveniencia.
    }
    atualizarContagem();
    // Executa uma vez, ao montar.
  }, []);

  // Resposta nova do servidor: leva o cidadao ao passo com erro (ajuste de
  // estado durante a renderizacao, como recomenda o React).
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    if (estado.fase === "erro") {
      setErrosCliente({});
      const primeiro = Object.keys(estado.erros)[0];
      setPasso(primeiro ? passoDoCampo(primeiro) : 3);
      setTipoAutor(estado.valores.tipoAutor ?? "FISICA");
    }
  }

  // Efeitos da resposta no DOM: foco e limpeza do rascunho.
  useEffect(() => {
    if (estado.fase === "erro") {
      requestAnimationFrame(() => {
        atualizarContagem();
        resumoErro.current?.focus();
      });
    } else if (estado.fase === "ok") {
      try {
        sessionStorage.removeItem(CHAVE_RASCUNHO);
      } catch {
        // ignorado
      }
      requestAnimationFrame(() => tituloConfirmacao.current?.focus());
    }
  }, [estado]);

  function atualizarContagem() {
    const form = formRef.current;
    if (!form) return;
    const valor = (nome: string) =>
      ((form.elements.namedItem(nome) as Controle | null)?.value ?? "").length;
    setContagem({ titulo: valor("titulo"), descricao: valor("descricao") });
  }

  function salvarRascunho() {
    const form = formRef.current;
    if (!form) return;
    const rascunho: Record<string, string> = {};
    for (const campo of CAMPOS_RASCUNHO) {
      rascunho[campo] = (form.elements.namedItem(campo) as Controle | null)?.value ?? "";
    }
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho));
    } catch {
      // ignorado
    }
  }

  /** Valida os campos de um passo no navegador. Retorna true se ok. */
  function validarPasso(p: 2 | 3): boolean {
    const form = formRef.current;
    if (!form) return true;
    const novos: Record<string, string> = {};
    let primeiro: Controle | null = null;
    for (const campo of CAMPOS_PASSO[p]) {
      const el = form.elements.namedItem(campo) as Controle | null;
      if (!el) continue;
      const msg = mensagemValidade(el);
      if (msg) {
        novos[campo] = msg;
        primeiro ??= el;
      }
    }
    setErrosCliente((atuais) => {
      const semPasso = Object.fromEntries(
        Object.entries(atuais).filter(([c]) => !CAMPOS_PASSO[p].includes(c)),
      );
      return { ...semPasso, ...novos };
    });
    primeiro?.focus();
    return primeiro === null;
  }

  function irPara(p: Passo) {
    setPasso(p);
    setAnuncio(`Passo ${p} de 4: ${NOMES_PASSO[p - 1]}`);
    requestAnimationFrame(() => titulosPasso.current[p]?.focus());
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    if (!js) return;
    if (!validarPasso(2)) {
      e.preventDefault();
      irPara(2);
      return;
    }
    if (!validarPasso(3)) e.preventDefault();
  }

  const erro = (campo: string): string | undefined =>
    errosCliente[campo] ?? (estado.fase === "erro" ? estado.erros[campo as never] : undefined);

  const valores = estado.fase === "erro" ? estado.valores : {};
  const visivel = (p: Passo) => !js || passo === p;
  const passoAtual = estado.fase === "ok" ? 4 : js ? passo : null;
  const ehPJ = tipoAutor === "JURIDICA";

  return (
    <div className="mt-5">
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <ol className="mb-6 flex flex-wrap gap-1.5" aria-label="Etapas do envio">
        {NOMES_PASSO.map((nome, i) => {
          const n = i + 1;
          const atual = passoAtual === n;
          const feito = passoAtual !== null && n < passoAtual;
          return (
            <li
              key={nome}
              aria-current={atual ? "step" : undefined}
              className={
                "min-w-28 flex-1 border-t-4 pt-1.5 text-[13px] font-semibold " +
                (atual
                  ? "border-azul-acao text-azul-cmr"
                  : feito
                    ? "border-verde-cmr text-verde-cmr"
                    : "border-linha text-cinza")
              }
            >
              {n}. {nome}
              {feito && <span className="sr-only"> (concluído)</span>}
            </li>
          );
        })}
      </ol>

      {estado.fase === "ok" ? (
        <Confirmacao estado={estado} js={js} tituloRef={tituloConfirmacao} />
      ) : (
        <form
          key={estado.fase === "erro" ? estado.tentativa : 0}
          ref={formRef}
          action={enviar}
          onSubmit={aoEnviar}
          onChange={(e) => {
            const nome = (e.target as EventTarget & { name?: string }).name ?? "";
            if (CAMPOS_RASCUNHO.includes(nome)) salvarRascunho();
          }}
          onInput={atualizarContagem}
          noValidate={js}
          className="rounded-lg border border-linha bg-white p-5 shadow-sm sm:p-6"
        >
          <input type="hidden" name="iniciadoEm" value={props.iniciadoEm} />
          <input type="hidden" name="chaveIdempotencia" value={props.chaveIdempotencia} />
          <input type="hidden" name="versaoAviso" value={props.versaoAviso} />
          {/* Campo-armadilha: fora da tela e fora da ordem de tabulacao. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="site">Não preencha este campo</label>
            <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {estado.fase === "erro" && (
            <div ref={resumoErro} tabIndex={-1}>
              <Alerta tipo="erro" titulo="Não foi possível enviar">
                {estado.mensagem}
                {Object.keys(estado.erros).length > 0 && " Veja as mensagens junto aos campos."}
              </Alerta>
            </div>
          )}

          {/* ---------------- Passo 1 ---------------- */}
          <fieldset hidden={!visivel(1)} className="mb-6">
            <legend className="sr-only">Passo 1 de 4: sua ideia já existe?</legend>
            <h2
              ref={(el) => {
                titulosPasso.current[1] = el;
              }}
              tabIndex={-1}
              className="text-lg font-bold text-azul-medio"
            >
              Sua ideia já foi proposta por outra pessoa?
            </h2>
            <p className="mt-1 text-sm text-cinza">
              Antes de enviar, vale{" "}
              <Link href="/consulta">consultar as ideias publicadas</Link>. Se já
              existir algo parecido, apoiar a ideia existente dá mais força a ela do
              que criar um registro repetido. Esta etapa é opcional.
            </p>
            {js && (
              <div className="mt-5 flex justify-end border-t border-linha pt-4">
                <Botao onClick={() => irPara(2)}>Não encontrei — continuar</Botao>
              </div>
            )}
          </fieldset>

          {/* ---------------- Passo 2 ---------------- */}
          <fieldset hidden={!visivel(2)} className="mb-6">
            <legend className="sr-only">Passo 2 de 4: a ideia</legend>
            <h2
              ref={(el) => {
                titulosPasso.current[2] = el;
              }}
              tabIndex={-1}
              className="text-lg font-bold text-azul-medio"
            >
              Descreva sua ideia
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoSelecao
                id="temaId"
                name="temaId"
                rotulo="Tema"
                obrigatorio
                erro={erro("temaId")}
                defaultValue={valores.temaId ?? ""}
              >
                <option value="">Escolha um tema</option>
                {props.temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </CampoSelecao>
              <CampoSelecao
                id="rpa"
                name="rpa"
                rotulo="Região (RPA)"
                dica="Opcional — usado só em estatísticas."
                erro={erro("rpa")}
                defaultValue={valores.rpa ?? ""}
              >
                <option value="">Não informar</option>
                {RPAS.map((r, i) => (
                  <option key={r} value={i + 1}>
                    {r}
                  </option>
                ))}
              </CampoSelecao>
              <CampoTexto
                id="titulo"
                name="titulo"
                rotulo="Título da ideia"
                dica={`Uma frase curta, de 5 a ${props.limites.titulo} caracteres. Ex.: Criação de ecopontos nos bairros.`}
                obrigatorio
                minLength={5}
                maxLength={props.limites.titulo}
                erro={erro("titulo")}
                defaultValue={valores.titulo ?? ""}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <CampoAreaTexto
                  id="descricao"
                  name="descricao"
                  rotulo="Descrição"
                  dica={`Explique o problema e a solução que você propõe. Entre ${props.limites.descricaoMin} e ${props.limites.descricao} caracteres.`}
                  obrigatorio
                  minLength={props.limites.descricaoMin}
                  maxLength={props.limites.descricao}
                  rows={7}
                  erro={erro("descricao")}
                  defaultValue={valores.descricao ?? ""}
                />
                {js && (
                  <p className="mt-0.5 text-right text-xs text-cinza" aria-live="off">
                    {contagem.descricao} de {props.limites.descricao} caracteres
                  </p>
                )}
              </div>
              <CampoTexto
                id="bairro"
                name="bairro"
                rotulo="Bairro"
                dica="Opcional. Ex.: Boa Viagem."
                maxLength={100}
                erro={erro("bairro")}
                defaultValue={valores.bairro ?? ""}
              />
            </div>
            {js && (
              <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-linha pt-4">
                <Botao variante="secundario" onClick={() => irPara(1)}>
                  Voltar
                </Botao>
                <Botao onClick={() => validarPasso(2) && irPara(3)}>Continuar</Botao>
              </div>
            )}
          </fieldset>

          {/* ---------------- Passo 3 ---------------- */}
          <fieldset hidden={!visivel(3)}>
            <legend className="sr-only">Passo 3 de 4: identificação</legend>
            <h2
              ref={(el) => {
                titulosPasso.current[3] = el;
              }}
              tabIndex={-1}
              className="text-lg font-bold text-azul-medio"
            >
              Identificação do autor
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoSelecao
                id="tipoAutor"
                name="tipoAutor"
                rotulo="Tipo de autor"
                obrigatorio
                erro={erro("tipoAutor")}
                defaultValue={valores.tipoAutor ?? "FISICA"}
                onChange={(e) => setTipoAutor(e.target.value)}
              >
                <option value="FISICA">Pessoa física (cidadão)</option>
                <option value="JURIDICA">Pessoa jurídica (entidade)</option>
              </CampoSelecao>
              <CampoTexto
                id="documento"
                name="documento"
                rotulo={js ? (ehPJ ? "CNPJ" : "CPF") : "CPF ou CNPJ"}
                dica={
                  ehPJ
                    ? "Os 14 números do CNPJ, com ou sem pontuação."
                    : "Os 11 números do CPF, com ou sem pontuação."
                }
                obrigatorio
                inputMode="numeric"
                autoComplete="off"
                maxLength={18}
                erro={erro("documento")}
              />
              <CampoTexto
                id="nome"
                name="nome"
                rotulo={js && ehPJ ? "Razão social" : "Nome completo"}
                obrigatorio
                minLength={3}
                maxLength={200}
                autoComplete={ehPJ ? "organization" : "name"}
                erro={erro("nome")}
                defaultValue={valores.nome ?? ""}
                className="sm:col-span-2"
              />
              <CampoTexto
                id="email"
                name="email"
                type="email"
                rotulo="E-mail"
                dica="Usado só para avisos sobre esta ideia."
                obrigatorio
                autoComplete="email"
                erro={erro("email")}
                defaultValue={valores.email ?? ""}
              />
              <CampoTexto
                id="telefone"
                name="telefone"
                type="tel"
                rotulo="Telefone"
                dica="Opcional. Ex.: (81) 90000-0000."
                autoComplete="tel"
                maxLength={20}
                erro={erro("telefone")}
                defaultValue={valores.telefone ?? ""}
              />
            </div>

            <h3 className="mt-6 text-base font-bold text-azul-medio">Privacidade</h3>
            <Alerta titulo="Como seus dados são tratados">
              <p>
                A Resolução nº 2.690/2018 exige a identificação de quem apresenta
                uma ideia. Por isso o CPF ou CNPJ é obrigatório: ele é guardado
                cifrado, usado só para conferência interna e para você acompanhar
                a ideia, e <strong>nunca aparece na consulta pública</strong>.
                E-mail e telefone servem apenas para contato sobre esta ideia.
              </p>
              <p className="mt-1 text-xs text-cinza">
                Texto provisório, sujeito à homologação (versão {props.versaoAviso}).
              </p>
            </Alerta>

            <Consentimento
              nome="cienciaTratamento"
              obrigatorio
              padrao={valores.cienciaTratamento ?? false}
              erro={erro("cienciaTratamento")}
              titulo="Estou ciente do tratamento dos meus dados"
              texto="Li o aviso acima e sei que a Câmara vai tratar meus dados para analisar e dar andamento a esta ideia, como exige a Resolução nº 2.690/2018."
            />
            <Consentimento
              nome="autorizaNomePublico"
              padrao={valores.autorizaNomePublico ?? false}
              titulo="Autorizo divulgar meu nome (opcional)"
              texto="Se marcar, seu nome aparece como autor na consulta pública. Se não marcar, aparece “Cidadão(ã) do Recife”. Você pode mudar de ideia depois."
            />

            <p className="mt-4 text-sm text-cinza">
              Lembre-se: a adoção de uma ideia é decisão de cada vereador. Enviar não
              garante que ela vire projeto de lei.
            </p>

            <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-linha pt-4">
              {js && (
                <Botao variante="secundario" onClick={() => irPara(2)}>
                  Voltar
                </Botao>
              )}
              <Botao type="submit" disabled={enviando} className="ml-auto">
                {enviando ? "Enviando…" : "Enviar ideia para a Câmara"}
              </Botao>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}

function Consentimento(props: {
  nome: string;
  titulo: string;
  texto: string;
  obrigatorio?: boolean;
  padrao?: boolean;
  erro?: string;
}) {
  const idErro = `${props.nome}-erro`;
  return (
    <div className="mb-2.5">
      <label
        htmlFor={props.nome}
        className="flex items-start gap-2.5 rounded-md border-[1.5px] border-linha bg-campo px-3.5 py-3 text-sm"
      >
        <input
          id={props.nome}
          name={props.nome}
          type="checkbox"
          required={props.obrigatorio}
          defaultChecked={props.padrao}
          aria-invalid={props.erro ? true : undefined}
          aria-describedby={props.erro ? idErro : undefined}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          <strong className="block">
            {props.titulo}
            {props.obrigatorio && (
              <>
                {" "}
                <span className="text-vermelho-cmr" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(obrigatório)</span>
              </>
            )}
          </strong>
          {props.texto}
        </span>
      </label>
      <p
        id={idErro}
        aria-live="polite"
        className="mt-1 text-[13px] font-semibold text-vermelho-cmr empty:hidden"
      >
        {props.erro ?? ""}
      </p>
    </div>
  );
}

function Confirmacao({
  estado,
  js,
  tituloRef,
}: {
  estado: Extract<EstadoCadastro, { fase: "ok" }>;
  js: boolean;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  function baixarComprovante() {
    const texto = [
      "BANCO DE IDEIAS LEGISLATIVAS — CÂMARA MUNICIPAL DO RECIFE",
      "Comprovante de envio de ideia",
      "",
      `Protocolo: ${estado.protocolo}`,
      `Token de acompanhamento: ${estado.token}`,
      `Enviado em: ${new Date().toLocaleString("pt-BR")}`,
      `Prazo de triagem: até ${estado.prazoTriagem}`,
      "",
      `Acompanhe em: ${urlAbsoluta("/acompanhar")}`,
      "Guarde este comprovante: o token não pode ser recuperado.",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-${estado.protocolo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="titulo-confirmacao" className="rounded-lg border border-linha bg-white p-5 shadow-sm sm:p-6">
      <h2
        id="titulo-confirmacao"
        ref={tituloRef}
        tabIndex={-1}
        className="text-lg font-bold text-verde-cmr"
      >
        Ideia registrada com sucesso
      </h2>
      <p className="mt-1 text-sm">
        Guarde o número de protocolo e o token. Com eles você acompanha o andamento
        em <Link href="/acompanhar">Acompanhar minha ideia</Link>.
      </p>

      <dl className="my-5 rounded-lg border-2 border-dashed border-verde-cmr bg-verde-fundo px-4 py-6 text-center">
        <dt className="text-xs font-bold uppercase tracking-widest text-cinza">
          Número de protocolo
        </dt>
        <dd className="my-1.5 font-mono text-3xl font-extrabold tracking-wider text-verde-cmr">
          {estado.protocolo}
        </dd>
        <dt className="mt-3 text-xs font-bold uppercase tracking-widest text-cinza">
          Token de acompanhamento
        </dt>
        <dd className="mt-2 inline-block rounded border border-linha bg-white px-3 py-1 font-mono text-base">
          {estado.token}
        </dd>
      </dl>

      <Alerta tipo="atencao" titulo="Próximo passo: triagem">
        Sua ideia será analisada pela Secretaria em até{" "}
        <strong>{estado.prazoTriagem}</strong>. Se for aprovada, passa a constar na
        consulta pública e fica disponível aos gabinetes. Se for arquivada, você poderá
        ler o motivo em Acompanhar. A adoção é decisão de cada vereador.
      </Alerta>

      {js && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Botao onClick={baixarComprovante}>Baixar comprovante</Botao>
          <Botao variante="secundario" onClick={() => window.print()}>
            Imprimir
          </Botao>
        </div>
      )}
    </section>
  );
}
