# Guia de implantação para a TI da Câmara

Rascunho inicial (evolui até a Fase 5). Referência: especificação, seção 11.

## Segredos (gerar e guardar fora do repositório)

```bash
# Chave de cifra do CPF (AES-256-GCM) e pepper do hash — 32 bytes base64 cada
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # DOCUMENTO_CHAVE
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # DOCUMENTO_PEPPER
# Segredo de sessão (Fase 2+)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # AUTH_SECRET
```

Guardar em cofre de segredos ou variáveis de ambiente do serviço. **Nunca** no Git.
A rotação da `DOCUMENTO_CHAVE` exige recifragem em lote (procedimento na Fase 5).

## Variáveis de ambiente de produção

Ver `.env.example`. As que mudam conforme o cenário de integração:

- **Subdomínio:** `NEXT_PUBLIC_BASE_PATH=""`
- **Rota no portal:** `NEXT_PUBLIC_BASE_PATH="/participacao-popular/banco-de-ideias"`

## Banco de dados

```bash
npm ci
npm run db:generate
npx prisma migrate deploy   # aplica as migrações versionadas (sem seed em produção)
```

A migração `20261008120100_tramitacao_append_only` instala o gatilho que impede
`UPDATE`/`DELETE` na tabela `tramitacao` (trilha de auditoria imutável, seção 6.3).

## Rede e TLS

1. DNS do subdomínio **ou** regra no proxy do portal.
2. Certificado TLS (Let's Encrypt ou institucional).
3. Nginx: usar `nginx/subdominio.conf` ou `nginx/proxy-portal.conf`.

## Backup (seção 11.4)

- Cópia completa diária + arquivamento contínuo de WAL.
- Retenção: 30 dias (diário) / 12 meses (mensal), cifrado, fora do servidor de app.
- RPO 15 min · RTO 4 h · **teste de restauração trimestral documentado**.

## Pendências que dependem da Câmara (seção 13.2)

- [ ] Homologar prazos de retenção (Procuradoria / Encarregado de Dados).
- [ ] Confirmar se há protocolo institucional já em uso (se sim, referenciar em vez de criar numeração).
- [ ] Fornecer lista oficial de temas e de gabinetes.
- [ ] Fornecer manual de identidade visual (cores exatas).
- [ ] Definir responsável pela operação da Triagem.
