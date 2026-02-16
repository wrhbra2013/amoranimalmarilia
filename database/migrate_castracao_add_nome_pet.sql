-- Script para adicionar coluna nome_pet na tabela castracao
-- Executar este script no banco de dados PostgreSQL

-- Adicionar coluna nome_pet se não existir
ALTER TABLE castracao ADD COLUMN IF NOT EXISTS nome_pet VARCHAR(255);

-- Verificar a estrutura atual da tabela
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'castracao'
ORDER BY ordinal_position;
