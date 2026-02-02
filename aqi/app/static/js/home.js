// Carrega as salas ao abrir a página
document.addEventListener('DOMContentLoaded', carregarSalas);

async function carregarSalas() {
    const res = await fetch('/api/salas');
    const salas = await res.json();
    const grid = document.getElementById('grid-salas');
    
    grid.innerHTML = '';

    salas.forEach(sala => {
        // Cria o card HTML para cada sala
        const card = document.createElement('a');
        card.className = 'card-sala';
        // Redireciona para o dashboard passando o ID da sala
        card.href = `/dashboard?sala_id=${sala.id}`; 
        
        card.innerHTML = `
            <h3>${sala.nome}</h3>
            <p>${sala.descricao || 'Sem descrição'}</p>
        `;
        grid.appendChild(card);
    });
}

// Funções do Modal
function abrirModal() {
    document.getElementById('modal-sala').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modal-sala').classList.add('hidden');
}

async function salvarSala() {
    const nome = document.getElementById('nome-sala').value;
    const desc = document.getElementById('desc-sala').value;

    if (!nome) return alert("Digite um nome!");

    const res = await fetch('/api/salas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, descricao: desc })
    });

    if (res.ok) {
        fecharModal();
        carregarSalas();
        document.getElementById('nome-sala').value = '';
    } else {
        alert("Erro ao salvar sala");
    }
}