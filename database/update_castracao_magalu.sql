-- Script para atualizar a tabela castracao na VM da Magalu
-- Executar este script no banco de dados PostgreSQL

-- 1. Garantir que a coluna 'tipo' existe na tabela castracao
ALTER TABLE castracao ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'padrao';

-- 2. Atualizar registros existentes que têm tipo NULL para 'padrao'
UPDATE castracao SET tipo = 'padrao' WHERE tipo IS NULL;

-- 3. Adicionar coluna nome_pet para armazenar o nome do pet (opcional)
ALTER TABLE castracao ADD COLUMN IF NOT EXISTS nome_pet VARCHAR(255);

-- 4. Criar índice para melhorar performance nas consultas por tipo (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_castracao_tipo ON castracao(tipo);

-- 5. Verificar os tipos existentes após atualização
SELECT tipo, COUNT(*) as total FROM castracao GROUP BY tipo;

-- 5. Verificar se há registros órfãos na tabela mutirao_castracao que precisam ser migrados (opcional)
-- SELECT COUNT(*) FROM mutirao_castracao;
