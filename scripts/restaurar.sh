#!/usr/bin/env bash
# =============================================================================
# Restaura o banco a partir de um arquivo gerado por scripts/backup.sh.
# DONO: Pessoa B. Roda no servidor, na pasta do sistema:
#
#   scripts/restaurar.sh backups/banco_ideias-AAAAMMDD-HHMMSS.dump
#
# SUBSTITUI TODO o conteudo atual do banco pelo do arquivo. Por seguranca:
#   1. confere que o arquivo e um backup valido
#   2. pede para digitar RESTAURAR (ou passe --sim para automacao)
#   3. faz um backup do estado atual em backups/antes-de-restaurar/
#   4. desliga a aplicacao, recria o banco vazio e restaura
#   5. aplica migracoes pendentes (backup antigo + sistema novo) e religa
#
# O .env tem de ser o MESMO do ambiente que gerou o backup (DOCUMENTO_CHAVE e
# DOCUMENTO_PEPPER), senao os CPFs restaurados ficam ilegiveis.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

ARQUIVO="${1:-}"
CONFIRMACAO="${2:-}"

if [ -z "$ARQUIVO" ] || [ ! -f "$ARQUIVO" ]; then
  echo "Uso: scripts/restaurar.sh backups/banco_ideias-AAAAMMDD-HHMMSS.dump [--sim]" >&2
  exit 1
fi
if [ -z "$(docker compose ps --status running -q db)" ]; then
  echo "ERRO: o banco (conteiner db) nao esta ligado. Rode: docker compose up -d db" >&2
  exit 1
fi

echo "[1/6] Conferindo o arquivo..."
if ! docker compose exec -T db pg_restore --list < "$ARQUIVO" > /dev/null; then
  echo "ERRO: $ARQUIVO nao e um backup valido." >&2
  exit 1
fi

if [ "$CONFIRMACAO" != "--sim" ]; then
  echo
  echo "ATENCAO: TODO o conteudo atual do banco sera substituido por:"
  echo "  $ARQUIVO"
  read -r -p "Digite RESTAURAR para continuar: " resposta
  [ "$resposta" = "RESTAURAR" ] || { echo "Cancelado. Nada foi alterado."; exit 1; }
fi

echo "[2/6] Backup de seguranca do estado atual..."
BACKUP_MANTER_DIAS=3650 scripts/backup.sh backups/antes-de-restaurar

falhou() {
  echo >&2
  echo "ERRO durante a restauracao. A aplicacao esta DESLIGADA." >&2
  echo "Para voltar ao estado anterior, restaure o backup de seguranca:" >&2
  echo "  ls -t backups/antes-de-restaurar/ | head -1" >&2
  echo "  scripts/restaurar.sh backups/antes-de-restaurar/<arquivo> --sim" >&2
}
trap falhou ERR

echo "[3/6] Desligando a aplicacao..."
docker compose stop app

echo "[4/6] Recriando o banco vazio..."
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS banco_ideias WITH (FORCE)" \
  -c "CREATE DATABASE banco_ideias"'

echo "[5/6] Restaurando os dados..."
docker compose exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d banco_ideias --no-owner --exit-on-error' < "$ARQUIVO"

echo "[6/6] Migracoes pendentes e religando a aplicacao..."
docker compose run --rm migrar
docker compose up -d --wait app

trap - ERR
echo
echo "Restauracao concluida a partir de $ARQUIVO."
