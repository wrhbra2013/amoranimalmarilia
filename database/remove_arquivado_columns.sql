-- Script para remover colunas de arquivado das tabelas
-- Executar este script no banco de dados PostgreSQL

-- 1. Remover colunas arquivado e arquivado_em da tabela mutirao_inscricao
ALTER TABLE mutirao_inscricao DROP COLUMN IF EXISTS arquivado;
ALTER TABLE mutirao_inscricao DROP COLUMN IF EXISTS arquivado_em;

-- 2. Remover colunas arquivado e arquivado_em da tabela castracao
ALTER TABLE castracao DROP COLUMN IF EXISTS arquivado;
ALTER TABLE castracao DROP COLUMN IF EXISTS arquivado_em;

-- 3. Verificar a estrutura atual das tabelas após as alterações
SELECT 
    'mutirao_inscricao' as tabela,
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'mutirao_inscricao'
ORDER BY ordinal_position;

SELECT 
    'castracao' as tabela,
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'castracao'
ORDER BY ordinal_position;

-- 4. Verificar se houve algum impacto nos dados (opcional)
-- SELECT COUNT(*) as total_registros FROM mutirao_inscricao WHERE arquivado = true;
-- SELECT COUNT(*) as total_registros FROM castracao WHERE arquivado = true;