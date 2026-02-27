-- Remover constraint unique do ticket na tabela castracao
ALTER TABLE castracao DROP CONSTRAINT IF EXISTS castracao_ticket_key;
