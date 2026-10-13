# Guia de implantação para a TI da Câmara

Referência: especificação, seção 11. Tudo abaixo foi preparado e testado pela dupla;
os passos marcados como **TI** dependem de acesso à infraestrutura da Câmara.

## 1. Segredos (gerar uma vez e guardar fora do repositório)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # DOCUMENTO_CHAVE (cifra do CPF)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # DOCUMENTO_PEPPER (hash do CPF)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # AUTH_SECRET (sessão do painel)
```

Guardar em cofre de segredos. **Nunca** no Git. Perder a `DOCUMENTO_CHAVE` torna os CPFs
irrecuperáveis; trocá-la exige recifrar a tabela `autor` (procedimento a combinar).

## 2. Arquivo `.env.producao` (no servidor, fora do Git)

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@db:5432/banco_ideias?schema=public"
POSTGRES_USER="USUARIO"
POSTGRES_PASSWORD="SENHA-FORTE"
DOCUMENTO_CHAVE="..."
DOCUMENTO_PEPPER="..."
AUTH_SECRET="..."
TRIAGEM_SLA_DIAS_UTEIS="15"
LIMITE_CADASTRO_POR_IP_HORA="5"
LIMITE_IDEIAS_POR_DOCUMENTO_DIA="3"
```

## 3. Imagem, migração e subida

```bash
# Cenário 1 - subdomínio (recomendado)
docker compose -f docker-compose.prod.yml build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://bancodeideias.recife.pe.leg.br

# Cenário 2 - rota no portal: acrescente
#   --build-arg NEXT_PUBLIC_BASE_PATH=/participacao-popular/banco-de-ideias

docker compose -f docker-compose.prod.yml run --rm migrar   # aplica as migrações
docker compose -f docker-compose.prod.yml up -d app
curl http://127.0.0.1:3000/api/health                        # {"status":"ok","banco":"ok"}
```

> **Trocar de cenário exige gerar a imagem de novo** (`NEXT_PUBLIC_*` entram no build).
> Nenhuma linha de código muda.

A migração `20261008120100_tramitacao_append_only` instala o gatilho que impede
`UPDATE`/`DELETE` na tabela `tramitacao` (trilha imutável, seção 6.3). Em produção,
**não rodar o seed** (só dados de teste).

Primeiro administrador: criar pelo banco uma vez (ou rodar o seed num ambiente de
homologação e trocar as senhas); depois, tudo pelo painel em `/admin/acessos`.

## 4. Rede, TLS e Nginx — **TI**

1. DNS do subdomínio **ou** regra no proxy do portal.
2. Certificado TLS (Let's Encrypt ou institucional).
3. Nginx: `nginx/subdominio.conf` ou `nginx/proxy-portal.conf`. A aplicação escuta só em `127.0.0.1:3000`.

## 5. Segurança já embutida na aplicação

| Item | Onde |
|---|---|
| Content Security Policy com nonce por requisição | `proxy.ts` + `lib/seguranca/csp.ts` |
| HSTS, X-Frame-Options, nosniff, Referrer e Permissions-Policy | `next.config.ts` |
| Sessão HttpOnly/SameSite=Lax/Secure, 30 min / 8 h | `lib/seguranca/auth.ts` |
| Checagem de origem (CSRF) nas APIs com sessão | `lib/seguranca/origem.ts` |
| Limite de taxa (cadastro, apoio, acompanhar) | `lib/seguranca/limite.ts` |
| Processo sem root no contêiner | `Dockerfile` |

**Única origem externa liberada na CSP: o VLibras.** Verificamos no navegador que o plugin
oficial busca os próprios arquivos em `vlibras.gov.br` **e** no repositório oficial
`cdn.jsdelivr.net/gh/spbgovbr-vlibras/`. A CSP libera só esse caminho do CDN. Se o firewall
da Câmara filtrar saída, esses dois destinos precisam estar liberados para o navegador do cidadão.

## 6. Backup (seção 11.4) — **TI**

- Cópia completa diária + arquivamento contínuo de WAL; retenção 30 dias / 12 meses, cifrada, fora do servidor.
- RPO 15 min · RTO 4 h · **teste de restauração trimestral documentado**.
- O volume `banco_ideias_dados` (ou o PostgreSQL da TI) é o que precisa de backup. A aplicação não guarda arquivos.

## 7. Monitoramento

- `GET /api/health` → 200 com `{"status":"ok"}`; 503 se o banco cair.
- Logs: `docker compose -f docker-compose.prod.yml logs -f app`. A aplicação não registra CPF, senha nem token.

## 8. Pendências que dependem da Câmara (seção 13.2)

- [ ] Homologar prazos de retenção (Procuradoria / Encarregado de Dados).
- [ ] Confirmar se há protocolo institucional já em uso (se sim, `lib/ideias/protocolo.ts` passa a referenciá-lo).
- [ ] Lista oficial de temas, motivos e gabinetes (editável em `/admin/listas` e `/admin/acessos`).
- [ ] Manual de identidade visual (cores exatas).
- [ ] Responsável pela operação da Triagem e pelo atendimento a titulares (LGPD).
- [ ] Teste de intrusão antes da entrada em produção (seção 8.7).
