#!/usr/bin/env bash
# =============================================================================
# Backup do banco do Banco de Ideias. DONO: Pessoa B.
# Roda no servidor, na pasta do sistema, com o sistema no ar:
#
#   scripts/backup.sh                 (grava em backups/)
#   scripts/backup.sh /mnt/backup     (grava em outra pasta)
#
# Gera um arquivo banco_ideias-AAAAMMDD-HHMMSS.dump (formato do pg_dump,
# comprimido), confere que ele e legivel e apaga os da mesma pasta com mais
# de BACKUP_MANTER_DIAS dias (padrao 30).
#
# O arquivo tem dados pessoais (e-mails, CPFs cifrados): fica so com
# permissao do dono (600). Copie para fora do servidor.
# ATENCAO: o backup NAO inclui o .env. Sem DOCUMENTO_CHAVE e DOCUMENTO_PEPPER
# os CPFs restaurados ficam ilegiveis - guarde o .env em cofre separado.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="${1:-backups}"
MANTER_DIAS="${BACKUP_MANTER_DIAS:-30}"

if [ -z "$(docker compose ps --status running -q db)" ]; then
  echo "ERRO: o banco (conteiner db) nao esta ligado. Rode: docker compose up -d db" >&2
  exit 1
fi

umask 077
mkdir -p "$DESTINO"
ARQUIVO="$DESTINO/banco_ideias-$(date +%Y%m%d-%H%M%S).dump"
PARCIAL="$ARQUIVO.parcial"
trap 'rm -f "$PARCIAL"' EXIT

echo "Gerando backup do banco..."
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d banco_ideias --format=custom --no-owner' > "$PARCIAL"

# Um backup que nao abre nao serve: confere antes de dar como pronto.
if ! docker compose exec -T db pg_restore --list < "$PARCIAL" > /dev/null; then
  echo "ERRO: o arquivo gerado nao e um backup valido." >&2
  exit 1
fi
mv "$PARCIAL" "$ARQUIVO"
echo "Backup pronto: $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"

# Rotacao: so apaga backups deste sistema, nesta pasta.
find "$DESTINO" -maxdepth 1 -name 'banco_ideias-*.dump' -mtime +"$MANTER_DIAS" -print -delete \
  | sed 's/^/Apagado (mais de '"$MANTER_DIAS"' dias): /'
