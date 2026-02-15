function confirmDelete(id) {
    if (confirm('Tem certeza de que deseja excluir esta coleta? Esta ação não poderá ser desfeita.')) {
        window.location.href = `/delete/coleta/${id}`;
    }
}
