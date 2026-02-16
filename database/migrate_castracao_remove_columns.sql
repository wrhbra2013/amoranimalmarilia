-- Script para migrar a tabela castracao removendo colunas desnecessárias
-- Executar este script no banco de dados PostgreSQL
-- Data: 2026-02-15

-- 1. Remover a coluna pet_localidade (não é mais necessária - locality agora é do tutor)
ALTER TABLE castracao DROP COLUMN IF EXISTS pet_localidade;

-- 2. Remover a coluna arquivo (não é mais utilizada)
ALTER TABLE castracao DROP COLUMN IF EXISTS arquivo;

-- 3. Verificar a estrutura atual da tabela
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'castracao'
ORDER BY ordinal_position;

-- 4. Verificar se há registros com dados importantes antes de continuar
-- SELECT id, ticket, nome, nome_pet, locality FROM castracao LIMIT 10;
