-- Adicionar colunas faltantes para mutirao_inscricao
-- Data: 2026-03-13

-- Campos do responsável
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS endereco VARCHAR(255);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE mutirao_inscricao ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Remover coluna localities se existir e não for usada
-- ALTER TABLE mutirao_inscricao DROP COLUMN IF EXISTS localidades;
