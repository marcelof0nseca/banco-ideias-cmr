"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { caminho } from "@/lib/sistema/url";
import type { StatusIdeia } from "@/prisma/gen/client";
import { anonimizarAcao, localizarAcao, revogarAcao, type EstadoBusca } from "./acoes";

/**
 * Busca do titular pelo CPF/CNPJ e acoes LGPD. O documento vai no corpo do
 * POST e o resultado volta no estado da acao (nunca na URL). Funciona sem JS
 * (useActionState com Server Action). DONO: Pessoa B.
 */

const FORMATO = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Recife" });

export function BuscaTitular() {
  const [estado, acao, buscando] = useActionState<EstadoBusca, FormData>(localizarAcao, { fase: "inicial" });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form action={acao} className="grid items-end gap-4 sm:grid-cols-[12rem_minmax(0,18rem)_auto] sm:justify-start">
            <CampoSelecao id="tipo-titular" rotulo="Tipo" name="tipo" defaultValue="FISICA">
              <option value="FISICA">CPF</option>
              <option value="JURIDICA">CNPJ</option>
            </CampoSelecao>
            <CampoTexto id="documento-titular" rotulo="Documento do titular" name="documento" inputMode="numeric" autoComplete="off" obrigatorio />
            <Botao type="submit" disabled={buscando}>
              {buscando ? "Buscando…" : "Localizar"}
            </Botao>
          </form>
        </CardContent>
      </Card>

      {estado.fase === "erro" && <Alerta tipo="atencao" titulo="Titular não localizado">{estado.mensagem}</Alerta>}

      {estado.fase === "ok" && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg text-marca">{estado.titular.nome}</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {estado.titular.tipo === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física"} · {estado.titular.documentoMascarado}
              {estado.titular.anonimizadoEm && " · anonimizado"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="font-semibold">E-mail</dt><dd className="break-all">{estado.titular.email || "—"}</dd></div>
              <div><dt className="font-semibold">Telefone</dt><dd>{estado.titular.telefone ?? "—"}</dd></div>
              <div>
                <dt className="font-semibold">Divulgação do nome</dt>
                <dd>{estado.titular.nomePublico ? "Autorizada" : "Não autorizada"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Consentimento</dt>
                <dd>
                  {FORMATO.format(new Date(estado.titular.consentimentoEm))}
                  <span className="block text-xs text-muted-foreground">Aviso versão {estado.titular.avisoPrivacidadeVersao}</span>
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="font-semibold text-marca">Ideias deste titular</h3>
              <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border">
                {estado.titular.ideias.map((i) => (
                  <li key={i.protocolo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span><span className="font-mono">{i.protocolo}</span> · {i.titulo}</span>
                    <SeloStatus status={i.status as StatusIdeia} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 border-t border-border pt-5 lg:grid-cols-3">
              <form method="post" action={caminho("/api/painel/titular/exportar")} className="flex flex-col gap-2">
                <input type="hidden" name="autorId" value={estado.titular.id} />
                <p className="text-sm"><strong>Acesso aos dados.</strong> Baixa um arquivo com tudo o que o sistema guarda sobre o titular.</p>
                <Botao type="submit" variante="secundario">Exportar dados (JSON)</Botao>
              </form>

              <form action={revogarAcao} className="flex flex-col gap-2">
                <input type="hidden" name="autorId" value={estado.titular.id} />
                <p className="text-sm"><strong>Revogar consentimento.</strong> O nome deixa de aparecer na consulta pública na hora.</p>
                <Botao type="submit" variante="contorno" disabled={!estado.titular.nomePublico}>
                  {estado.titular.nomePublico ? "Revogar divulgação do nome" : "Nome já não é divulgado"}
                </Botao>
              </form>

              {!estado.titular.anonimizadoEm && (
                <form action={anonimizarAcao} className="flex flex-col gap-2">
                  <input type="hidden" name="autorId" value={estado.titular.id} />
                  <p className="text-sm"><strong>Anonimizar.</strong> Apaga documento, e-mail e telefone. Não tem volta.</p>
                  {/* Checkbox nativo, como no cadastro: funciona sem JS. */}
                  <label
                    htmlFor="confirmo-anonimizar"
                    className="flex items-start gap-3 rounded-lg border border-input bg-card p-3 text-sm has-checked:border-destructive has-checked:bg-vermelho-fundo"
                  >
                    <input
                      id="confirmo-anonimizar"
                      type="checkbox"
                      name="confirmo"
                      value="sim"
                      required
                      className="mt-0.5 size-5 shrink-0 accent-primary"
                    />
                    <span>O próprio titular pediu a eliminação dos dados.</span>
                  </label>
                  <Botao type="submit" variante="perigo">Anonimizar titular</Botao>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
