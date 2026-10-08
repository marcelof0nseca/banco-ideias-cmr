-- =============================================================================
-- Tramitacao: tabela append-only  (especificacao, secao 6.3 e 8.4/A08)
--
-- A linha do tempo publica e a trilha de auditoria de mudanca de situacao sao
-- a mesma tabela. Para que o historico tenha valor probatorio, o banco recusa
-- qualquer UPDATE ou DELETE sobre "tramitacao": so INSERT e SELECT.
--
-- Isso e reforco no banco, alem da regra na aplicacao. Mesmo um acesso direto
-- ao Postgres com o usuario da aplicacao nao consegue reescrever o historico.
-- =============================================================================

CREATE OR REPLACE FUNCTION tramitacao_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'tramitacao e append-only: % nao e permitido (secao 6.3)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tramitacao_sem_update
  BEFORE UPDATE ON "tramitacao"
  FOR EACH ROW EXECUTE FUNCTION tramitacao_append_only();

CREATE TRIGGER trg_tramitacao_sem_delete
  BEFORE DELETE ON "tramitacao"
  FOR EACH ROW EXECUTE FUNCTION tramitacao_append_only();
