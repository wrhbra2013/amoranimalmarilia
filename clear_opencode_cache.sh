#!/bin/bash
# Script para limpar cache do opencode e manter versão free

echo "🧹 Limpando cache do opencode..."

# Remove node_modules do diretório de config do opencode
rm -rf ~/.config/opencode/node_modules 2>/dev/null
echo "   ✓ node_modules removido"

# Remove cache adicional se existir
rm -rf ~/.cache/opencode 2>/dev/null
echo "   ✓ cache adicional removido"

# Remove .opencode na pasta do projeto
rm -rf .opencode 2>/dev/null
echo "   ✓ .opencode local removido"

echo ""
echo "✅ Cache do opencode limpo com sucesso!"
echo "   Na próxima execução, as dependências serão baixadas automaticamente."
