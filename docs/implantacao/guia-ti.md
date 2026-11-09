# Guia de implantação e operação — TI da Câmara

Como colocar o **Banco de Ideias Legislativas** no ar num servidor Linux com Docker,
e como mantê-lo funcionando. Referência: especificação técnica, seções 11 e 12.

Todos os comandos deste guia são executados pelo CI a cada mudança no código
(`.github/workflows/ci.yml`, job `conteiner`). Se algum passo não funcionar como
descrito, é defeito: avise a equipe.

**Sumário**

1. [Visão rápida](#1-visão-rápida)
2. [Requisitos do servidor](#2-requisitos-do-servidor)
3. [Variáveis de configuração (`.env`)](#3-variáveis-de-configuração-env)
4. [Primeira implantação, passo a passo](#4-primeira-implantação-passo-a-passo)
5. [Operação e manutenção](#5-operação-e-manutenção)
6. [Problemas comuns](#6-problemas-comuns)
7. [Segurança já embutida](#7-segurança-já-embutida)
8. [Pendências que dependem da Câmara](#8-pendências-que-dependem-da-câmara)

---

## 1. Visão rápida

```
 Navegador ──HTTPS──▶ Nginx do servidor ──▶ 127.0.0.1:3000 ┌──────────────┐
                      (TLS, porta 443)                      │ conteiner app │ Next.js
                                                            └──────┬───────┘
                                                                   │ rede interna do Docker
                                                            ┌──────▼───────┐
                                                            │ conteiner db  │ PostgreSQL 16
                                                            └──────┬───────┘
                                                                   │
                                                     volume banco_ideias_dados
```

| Peça | O que é | Arquivo |
|---|---|---|
| `app` | A aplicação (Next.js, Node 22). Escuta **só** em `127.0.0.1:3000`. | `Dockerfile`, `docker-compose.yml` |
| `db` | PostgreSQL 16. **Sem porta aberta**: só a `app` alcança. | `docker-compose.yml` |
| `migrar` | Contêiner de manutenção: aplica migrações e cria o administrador. Roda e termina. | `docker-compose.yml` |
| Nginx | Fica **fora** do Docker, no servidor. Faz o HTTPS e repassa para a `app`. | `nginx/` |
| Configuração | Segredos e endereços, num arquivo `.env` que **não** vai para o Git. | `.env.example` |
| Backup | Scripts de cópia e restauração do banco. | `scripts/` |

A aplicação não grava arquivos: **todo o estado está no banco** (volume
`banco_ideias_dados`) e no `.env`.

---

## 2. Requisitos do servidor

| Item | Mínimo | Observação |
|---|---|---|
| Sistema | Linux 64 bits (x86_64) | Testado em **Ubuntu Server 24.04 LTS**. Debian 12 também serve (no passo 4.1, troque `ubuntu` por `debian` nos dois endereços do Docker). |
| CPU | 2 vCPU | |
| Memória | 4 GB | A geração da imagem (`build`) é o momento de maior uso. |
| Disco | 20 GB livres | Imagens (~2 GB) + banco + backups locais. |
| Docker Engine | 24 ou mais novo | Instalação no passo 4.1. |
| Docker Compose | plugin **v2.20** ou mais novo | Comando `docker compose` (com espaço). O antigo `docker-compose` (com hífen) **não** serve. |
| Outros | `git`, `openssl`, `curl` | Já vêm no Ubuntu Server ou entram no passo 4.1. |
| Nginx | o que a TI já usa | Faz o HTTPS. Modelos prontos em `nginx/`. |

**Portas**

| Porta | Quem abre | Acesso |
|---|---|---|
| 443 (e 80, só para redirecionar) | Nginx | Internet |
| 3000 | contêiner `app` | **Só o próprio servidor** (`127.0.0.1`) |
| 5432 | contêiner `db` | **Nenhum**: só a rede interna do Docker |

**Saída de rede**

- **Para instalar e gerar a imagem:** `download.docker.com`, `registry-1.docker.io`
  (Docker Hub), `registry.npmjs.org` e o GitLab, para o `git clone`.
- **Com o sistema no ar:** o servidor não precisa de saída. O **navegador do cidadão**
  carrega o tradutor de Libras (VLibras) de `vlibras.gov.br` e
  `cdn.jsdelivr.net/gh/spbgovbr-vlibras/`.

---

## 3. Variáveis de configuração (`.env`)

O modelo é o arquivo [`.env.example`](../../.env.example), que traz cada variável
explicada e **nenhum valor real**. O `.env` de verdade fica só no servidor:
o `.gitignore` o mantém fora do Git e o `.dockerignore`, fora da imagem.

| Variável | Obrigatória | Para que serve | Como gerar | Quando muda, o que fazer |
|---|---|---|---|---|
| `POSTGRES_USER` | sim | Usuário dono do banco | pode manter `bancoideias` | não mude depois da 1ª subida |
| `POSTGRES_PASSWORD` | sim | Senha do banco | `openssl rand -hex 24` | só vale na **1ª subida**; para trocar, ver 5.8 |
| `DATABASE_URL` | sim | Endereço que a aplicação usa para o banco. Repete usuário e senha; o servidor é `db` | — | `docker compose up -d app` |
| `DOCUMENTO_CHAVE` | sim | Cifra os CPF/CNPJ no banco (AES-256) | `openssl rand -base64 32` | **nunca mude**: os CPFs gravados ficariam ilegíveis |
| `DOCUMENTO_PEPPER` | sim | Segredo do resumo que permite achar um CPF sem decifrá-lo | `openssl rand -hex 32` | **nunca mude**: a busca por titular para |
| `AUTH_SECRET` | sim | Assina o cookie de login do painel | `openssl rand -hex 32` | `docker compose up -d app` (todos entram de novo) |
| `NEXT_PUBLIC_SITE_URL` | sim | Domínio público, **sem caminho** | — | gerar a imagem de novo (5.3) |
| `NEXT_PUBLIC_BASE_PATH` | não | Vazio = subdomínio próprio. `/participacao-popular/banco-de-ideias` = pasta no portal | — | gerar a imagem de novo (5.3) |
| `NEXT_PUBLIC_URL_CAMARA` | não | Link "voltar ao portal" | — | gerar a imagem de novo (5.3) |
| `TRIAGEM_SLA_DIAS_UTEIS` | não (15) | Prazo da triagem, em dias úteis | — | `docker compose up -d app` |
| `LIMITE_CADASTRO_POR_IP_HORA` | não (5) | Ideias por endereço IP por hora | — | `docker compose up -d app` |
| `LIMITE_IDEIAS_POR_DOCUMENTO_DIA` | não (3) | Ideias por CPF/CNPJ por dia | — | `docker compose up -d app` |

> **Guarde uma cópia do `.env` em cofre de senhas, separada dos backups do banco.**
> Um backup do banco sem a `DOCUMENTO_CHAVE` e o `DOCUMENTO_PEPPER` não recupera os CPFs.

---

## 4. Primeira implantação, passo a passo

Os comandos abaixo partem de um Ubuntu Server 24.04 recém-instalado, acessado por SSH
com um usuário que tem `sudo`. Cada passo termina com um **Confira**: só siga para o
próximo passo quando a conferência der o resultado esperado.

### 4.1 Instalar Docker, Compose e git

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

**Saia do SSH e entre de novo**: o seu usuário só passa a usar o Docker sem `sudo`
depois de reentrar.

**Confira:**

```bash
docker compose version     # Docker Compose version v2.20 ou maior
docker run --rm hello-world   # termina com "Hello from Docker!"
```

### 4.2 Baixar o sistema

```bash
sudo mkdir -p /opt/banco-de-ideias
sudo chown "$USER": /opt/banco-de-ideias
git clone https://gitlab.com/camara.recife/banco-de-ideias.git /opt/banco-de-ideias
cd /opt/banco-de-ideias
```

O repositório é privado: o `git clone` pede um usuário do GitLab com acesso ao projeto
(ou um *deploy token* de leitura). **Todos os comandos daqui em diante rodam dentro de
`/opt/banco-de-ideias`.**

**Confira:**

```bash
ls docker-compose.yml Dockerfile .env.example scripts/backup.sh   # os quatro aparecem
```

### 4.3 Criar o `.env` com segredos novos

```bash
cp .env.example .env
chmod 600 .env

SENHA_BD=$(openssl rand -hex 24)
sed -i \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$SENHA_BD|" \
  -e "s|COLE_A_SENHA_AQUI|$SENHA_BD|" \
  -e "s|^DOCUMENTO_CHAVE=.*|DOCUMENTO_CHAVE=$(openssl rand -base64 32)|" \
  -e "s|^DOCUMENTO_PEPPER=.*|DOCUMENTO_PEPPER=$(openssl rand -hex 32)|" \
  -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -hex 32)|" \
  .env
unset SENHA_BD
```

Depois abra o arquivo (`nano .env`) e ajuste a seção **4. ENDEREÇO PÚBLICO**:

| Cenário | `NEXT_PUBLIC_SITE_URL` | `NEXT_PUBLIC_BASE_PATH` |
|---|---|---|
| Subdomínio próprio (recomendado) | `https://bancodeideias.recife.pe.leg.br` | vazio |
| Pasta dentro do portal | `https://www.recife.pe.leg.br` | `/participacao-popular/banco-de-ideias` |

Os dois cenários estão explicados em [`integracao-portal.md`](integracao-portal.md).

**Confira:**

```bash
# Nao pode imprimir NADA (nenhum segredo vazio, nenhum texto de exemplo sobrando):
grep -E '^(POSTGRES_PASSWORD|DOCUMENTO_CHAVE|DOCUMENTO_PEPPER|AUTH_SECRET)=$|COLE_A_SENHA' .env

# A senha do banco aparece igual nas duas linhas:
grep -E '^POSTGRES_PASSWORD=|^DATABASE_URL=' .env

ls -l .env      # -rw------- (so o dono le)
```

Agora **guarde uma cópia do `.env` no cofre de senhas da TI**.

### 4.4 Gerar as imagens

```bash
docker compose build
```

Leva de 2 a 10 minutos, conforme o servidor e a rede. Os valores `NEXT_PUBLIC_*` do
`.env` entram na imagem neste momento.

**Confira:**

```bash
docker image ls | grep banco-ideias    # aparecem banco-ideias-app e banco-ideias-migrar
```

### 4.5 Ligar o banco

```bash
docker compose up -d --wait db
```

**Confira:**

```bash
docker compose ps    # linha "db" com STATUS "Up ... (healthy)"
```

### 4.6 Criar as tabelas (migrações)

```bash
docker compose run --rm migrar
```

Isso cria todas as tabelas e instala a trava que impede apagar ou alterar o histórico
de tramitação (especificação, seção 6.3). Pode ser rodado de novo sem risco: só aplica
o que falta.

**Confira:** o comando termina sem `Error` e informa que as migrações foram aplicadas.

> **Não rode `npm run db:seed` em produção.** O seed **apaga o banco** e põe dados
> fictícios; ele existe só para desenvolvimento e homologação.

### 4.7 Criar o primeiro administrador

```bash
docker compose run --rm migrar npm run admin:criar
```

O comando pergunta nome, e-mail institucional e senha (mínimo de 12 caracteres, digitada
duas vezes, sem aparecer na tela). A criação fica registrada na trilha de auditoria. Os
demais usuários (Triagem, Gabinetes, outros administradores) são criados **pelo painel**,
em **Administração › Acessos**.

**Confira:** a mensagem final é `Pronto: administrador criado.`

### 4.8 Ligar a aplicação

```bash
docker compose up -d --wait app
```

O comando espera a aplicação responder; leva cerca de 30 segundos.

**Confira:**

```bash
docker compose ps
# "app" e "db" com STATUS "Up ... (healthy)"

curl -s http://127.0.0.1:3000/api/health
# {"status":"ok","banco":"ok",...}

curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/consulta
# 200
```

> **Quer ver o site antes do Nginx?** Do seu computador, abra um túnel SSH:
> `ssh -L 3000:127.0.0.1:3000 usuario@servidor` e acesse `http://localhost:3000`.
> Com o cenário "pasta no portal", acrescente o caminho:
> `http://localhost:3000/participacao-popular/banco-de-ideias`.
> Use o túnel, e **não** `http://IP-do-servidor:3000`: a porta não está aberta para fora
> e, sem HTTPS, o navegador recusa o cookie de login (exceto em `localhost`).

### 4.9 Nginx e HTTPS

Use o modelo do cenário escolhido:

- **Subdomínio:** [`nginx/subdominio.conf`](../../nginx/subdominio.conf) é um site completo.

  ```bash
  sudo cp nginx/subdominio.conf /etc/nginx/sites-available/banco-de-ideias.conf
  sudo nano /etc/nginx/sites-available/banco-de-ideias.conf
  # ajuste ssl_certificate e ssl_certificate_key para os certificados da Camara
  sudo ln -s /etc/nginx/sites-available/banco-de-ideias.conf /etc/nginx/sites-enabled/
  ```

- **Pasta no portal:** [`nginx/proxy-portal.conf`](../../nginx/proxy-portal.conf) é um
  bloco `location` que entra **dentro** do `server { }` que já atende o portal.

Depois, nos dois casos:

```bash
sudo nginx -t                    # "syntax is ok" e "test is successful"
sudo systemctl reload nginx
```

Se o servidor tiver firewall `ufw`, libere só o Nginx:
`sudo ufw allow 'Nginx Full'`. As portas 3000 e 5432 **não** devem ser liberadas.

**Confira:**

```bash
curl -s https://bancodeideias.recife.pe.leg.br/api/health      # {"status":"ok",...}
curl -sI http://bancodeideias.recife.pe.leg.br/ | head -1      # 301 (vai para HTTPS)
```

Pelo navegador: abra o endereço público, entre em **/login** com o administrador do
passo 4.7 e confira que o painel abre.

### 4.10 Agendar o backup diário

```bash
sudo mkdir -p /var/backups/banco-de-ideias
sudo chown "$USER": /var/backups/banco-de-ideias
crontab -e
```

Acrescente a linha abaixo (backup todo dia às 2h; guarda 30 dias):

```
0 2 * * * cd /opt/banco-de-ideias && scripts/backup.sh /var/backups/banco-de-ideias >> /var/backups/banco-de-ideias/backup.log 2>&1
```

**Confira:** rode uma vez à mão e veja o arquivo criado.

```bash
scripts/backup.sh /var/backups/banco-de-ideias
# Backup pronto: /var/backups/banco-de-ideias/banco_ideias-AAAAMMDD-HHMMSS.dump (...)
```

Esses arquivos ficam no próprio servidor. Inclua a pasta `/var/backups/banco-de-ideias`
na cópia externa que a TI já faz (seção 5.6).

**Pronto: o sistema está no ar.**

---

## 5. Operação e manutenção

Sempre dentro da pasta do sistema: `cd /opt/banco-de-ideias`.

### 5.1 Ver a situação

```bash
docker compose ps                         # app e db devem estar "(healthy)"
curl -s http://127.0.0.1:3000/api/health  # {"status":"ok","banco":"ok"} — 503 se o banco cair
docker stats --no-stream                  # uso de CPU e memoria por conteiner
```

O endereço `/api/health` serve para o monitoramento da TI (Zabbix, Uptime Kuma etc.):
responde **200** quando está tudo bem e **503** quando o banco não responde.

### 5.2 Logs

```bash
docker compose logs -f app                # acompanha ao vivo (Ctrl+C para sair)
docker compose logs --since 1h app        # ultima hora
docker compose logs --tail 200 db         # ultimas 200 linhas do banco
```

A aplicação **não** registra CPF, senha nem token. Os logs ficam no Docker e são
apagados quando o contêiner é recriado; se a TI precisar guardá-los, configure o
*logging driver* do Docker (journald, syslog) no servidor.

Quem fez o quê no painel (logins, revelação de CPF, exportações, gestão de usuários) fica
na **trilha de auditoria** dentro do banco, em **Administração › Auditoria**.

### 5.3 Atualizar para uma nova versão

```bash
cd /opt/banco-de-ideias
scripts/backup.sh /var/backups/banco-de-ideias    # 1. backup antes de tudo
git pull                                          # 2. baixa a versao nova
docker compose build                              # 3. gera as imagens novas
docker compose run --rm migrar                    # 4. aplica migracoes novas (se houver)
docker compose up -d --wait app                   # 5. troca a aplicacao
curl -s http://127.0.0.1:3000/api/health          # 6. confere: {"status":"ok",...}
```

O site fica fora do ar só alguns segundos, no passo 5.

**Voltar para a versão anterior** se algo der errado:

```bash
git log --oneline -5                 # ache o codigo da versao anterior
git checkout <codigo>
docker compose build
docker compose up -d --wait app
```

Se a versão nova tiver alterado o banco (o passo 4 aplicou migração), volte também o
banco: restaure o backup do passo 1 (seção 5.5). Ao terminar, volte para a linha
principal com `git checkout main` antes da próxima atualização.

### 5.4 Reiniciar, parar e ligar

```bash
docker compose restart app       # reinicia a aplicacao (mesma configuracao)
docker compose up -d app         # recria a aplicacao lendo o .env de novo
docker compose stop              # para tudo (dados preservados)
docker compose up -d --wait      # liga tudo
```

> `restart` **não** relê o `.env`. Mudou o `.env`? Use `docker compose up -d app`.
>
> **Nunca use `docker compose down -v`**: o `-v` apaga o volume do banco, com todas as
> ideias. O `docker compose down`, sem `-v`, é seguro.

Os contêineres têm `restart: unless-stopped`: voltam sozinhos se o servidor reiniciar.

### 5.5 Backup e restauração do banco

**Fazer um backup agora:**

```bash
scripts/backup.sh /var/backups/banco-de-ideias
```

O script gera `banco_ideias-AAAAMMDD-HHMMSS.dump`, confere que o arquivo abre, deixa
permissão só para o dono (o arquivo tem dados pessoais) e apaga os backups com mais de
30 dias nessa pasta. Para mudar o prazo: `BACKUP_MANTER_DIAS=90 scripts/backup.sh ...`.

**Restaurar** (substitui **todo** o banco pelo conteúdo do arquivo):

```bash
ls -t /var/backups/banco-de-ideias/*.dump | head      # escolha o arquivo
scripts/restaurar.sh /var/backups/banco-de-ideias/banco_ideias-AAAAMMDD-HHMMSS.dump
```

O script confere o arquivo e pede para digitar `RESTAURAR`. Antes de mexer em qualquer
coisa, ele guarda o estado atual em `backups/antes-de-restaurar/`. Depois desliga a
aplicação, restaura, aplica migrações pendentes e religa. Se algo falhar no meio, ele
mostra como voltar ao estado anterior.

> O `.env` usado na restauração tem de ter as **mesmas** `DOCUMENTO_CHAVE` e
> `DOCUMENTO_PEPPER` do ambiente que gerou o backup.

**Teste de restauração** (especificação, seção 11.4: trimestral, documentado): restaure o
backup mais recente num servidor de homologação, seguindo esta seção, e registre a data e
o resultado.

### 5.6 Cópia do volume (alternativa) e cópia externa

O `scripts/backup.sh` é o backup recomendado, porque roda com o sistema no ar. A
alternativa é copiar o **volume inteiro** do banco, com tudo parado; serve, por exemplo,
para mudar de servidor.

**Copiar o volume:**

```bash
docker compose stop app db
docker run --rm -v banco-ideias_banco_ideias_dados:/dados:ro -v /var/backups/banco-de-ideias:/destino \
  alpine:3.20 tar czf /destino/volume-$(date +%Y%m%d).tar.gz -C /dados .
docker compose up -d --wait db app
```

**Restaurar o volume** (apaga o banco atual e põe a cópia no lugar):

```bash
docker compose down
docker volume rm banco-ideias_banco_ideias_dados
docker compose up --no-start db
docker run --rm -v banco-ideias_banco_ideias_dados:/dados -v /var/backups/banco-de-ideias:/origem \
  alpine:3.20 tar xzf /origem/volume-AAAAMMDD.tar.gz -C /dados
docker compose up -d --wait db app
```

**Cópia externa:** os backups precisam sair do servidor. A pasta
`/var/backups/banco-de-ideias` deve entrar na rotina de backup externo da TI, cifrada,
com a retenção da especificação (seção 11.4: 30 dias / 12 meses). O `.env` vai para o
cofre de senhas, **separado** desses backups.

> **Perda máxima de dados (RPO).** Com o backup diário do passo 4.10, uma falha total do
> servidor pode perder até 24 horas de dados. A especificação pede **RPO de 15 minutos**,
> o que exige arquivamento contínuo do PostgreSQL (WAL) pela TI. Enquanto isso não
> existir, encurte o intervalo no `crontab` (por exemplo, a cada hora: `0 * * * *`). O
> banco é pequeno e o backup leva segundos.

### 5.7 Recuperar o acesso de um administrador

Esqueceu a senha ou a conta foi bloqueada por tentativas erradas:

```bash
docker compose run --rm migrar npm run admin:criar -- --redefinir --email fulano@recife.pe.leg.br
```

O comando pede a senha nova, desbloqueia a conta e registra o evento na auditoria. Para
usuários de Triagem e de Gabinete, a senha é redefinida pelo administrador no painel.

### 5.8 Trocar a senha do banco

O PostgreSQL só lê `POSTGRES_PASSWORD` na primeira subida. Para trocar depois:

```bash
NOVA=$(openssl rand -hex 24); echo "$NOVA"
docker compose exec db psql -U bancoideias -d banco_ideias \
  -c "ALTER USER bancoideias PASSWORD '$NOVA'"
nano .env        # troque a senha em POSTGRES_PASSWORD e dentro do DATABASE_URL
docker compose up -d --wait app
unset NOVA
```

Atualize a cópia do `.env` no cofre.

### 5.9 Espaço em disco

```bash
docker system df          # quanto as imagens, conteineres e volumes ocupam
docker image prune -f     # apaga imagens antigas que sobraram das atualizacoes
du -sh /var/backups/banco-de-ideias
```

O `docker image prune` não toca no volume do banco.

---

## 6. Problemas comuns

> Seção mantida pela Pessoa A, a partir do teste de implantação em servidor limpo.
> Os itens abaixo são o ponto de partida.

| Sintoma | Causa provável | Solução |
|---|---|---|
| `permission denied while trying to connect to the Docker daemon` | O usuário não está no grupo `docker`, ou não reentrou no SSH | `sudo usermod -aG docker "$USER"`, sair e entrar de novo |
| `required variable POSTGRES_PASSWORD is missing` (ou `POSTGRES_USER`) | `.env` ausente, fora da pasta, ou com a variável vazia | Estar em `/opt/banco-de-ideias` e refazer o passo 4.3 |
| `docker: 'compose' is not a docker command` | Falta o plugin Compose v2 | Instalar `docker-compose-plugin` (passo 4.1) |
| `app` fica `unhealthy` ou reiniciando; log com `password authentication failed` | Senha do `DATABASE_URL` diferente da do banco (ou o banco foi criado antes com outra senha) | Conferir as duas linhas do passo 4.3; se o banco já existia, seção 5.8 |
| Log com `DOCUMENTO_CHAVE deve ter 32 bytes` | Chave gerada de outro jeito | `openssl rand -base64 32` (só num banco **novo**; num banco em uso, recupere a chave do cofre) |
| O login não fica salvo (volta para a tela de login) | Acesso por `http://` num endereço que não é `localhost`: o cookie é só HTTPS | Acessar pelo Nginx com HTTPS, ou pelo túnel SSH (passo 4.8) |
| Mudei o `.env` e nada mudou | `restart` não relê o `.env`; `NEXT_PUBLIC_*` exigem imagem nova | `docker compose up -d app`; para `NEXT_PUBLIC_*`, `docker compose build` antes |
| Links do site sem estilo, ou página 404 no cenário "pasta no portal" | `NEXT_PUBLIC_BASE_PATH` diferente do `location` do Nginx | Os dois têm de ser exatamente `/participacao-popular/banco-de-ideias`; depois `docker compose build && docker compose up -d app` |
| O cidadão recebe "muitas tentativas" ao cadastrar | Muitas pessoas na mesma rede (evento) ou o Nginx não repassa o IP real | Conferir `X-Real-IP` no Nginx; aumentar `LIMITE_CADASTRO_POR_IP_HORA` |

---

## 7. Segurança já embutida

| Item | Onde |
|---|---|
| Content Security Policy com nonce por requisição | `proxy.ts` + `lib/seguranca/csp.ts` |
| HSTS, X-Frame-Options, nosniff, Referrer e Permissions-Policy | `next.config.ts` |
| Sessão HttpOnly/SameSite=Lax/Secure, 30 min parado / 8 h no máximo | `lib/seguranca/auth.ts` |
| Senhas com argon2id; bloqueio após tentativas erradas | `lib/seguranca/senha.ts` |
| CPF/CNPJ cifrado (AES-256-GCM) e mascarado nas telas | `lib/seguranca/documento.ts` |
| Checagem de origem (CSRF) nas APIs com sessão | `lib/seguranca/origem.ts` |
| Limite de taxa (cadastro, apoio, acompanhar) | `lib/seguranca/limite.ts` |
| Histórico de tramitação imutável (trava no banco) | migração `20261008120100_tramitacao_append_only` |
| Trilha de auditoria | `lib/seguranca/auditoria.ts` |
| Processo sem root; nenhum segredo dentro da imagem | `Dockerfile` (conferido no CI) |
| Banco sem porta aberta; contêiner do banco não recebe as chaves do CPF | `docker-compose.yml` (conferido no CI) |

**Única origem externa liberada na CSP: o VLibras** (`vlibras.gov.br` e
`cdn.jsdelivr.net/gh/spbgovbr-vlibras/`). Se o firewall da Câmara filtrar saída, esses
dois destinos precisam estar liberados para o navegador do cidadão.

---

## 8. Pendências que dependem da Câmara

Especificação, seção 13.2.

- [ ] Escolher o cenário (subdomínio ou pasta no portal), criar o DNS ou a regra no proxy e emitir o certificado TLS.
- [ ] Servidor conforme a seção 2 deste guia.
- [ ] Backup externo cifrado e arquivamento contínuo (WAL) para atingir RPO 15 min / RTO 4 h (seção 5.6).
- [ ] Homologar prazos de retenção (Procuradoria / Encarregado de Dados).
- [ ] Confirmar se há protocolo institucional já em uso (se sim, `lib/ideias/protocolo.ts` passa a referenciá-lo).
- [ ] Lista oficial de temas, motivos e gabinetes (editável em **Administração › Listas** e **› Acessos**).
- [ ] Manual de identidade visual (cores exatas).
- [ ] Responsável pela operação da Triagem e pelo atendimento a titulares (LGPD).
- [ ] Teste de intrusão antes da entrada em produção (seção 8.7).
