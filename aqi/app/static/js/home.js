document.addEventListener('DOMContentLoaded', () => {
    carregarSalas();
});

async function carregarSalas() {
    try {
        const response = await fetch('/api/salas');
        const salas = await response.json();

        const grid = document.getElementById('grid-salas');
        grid.innerHTML = ''; 

        salas.forEach(sala => {
            const card = document.createElement('div');
            card.className = 'card-sala';
            
            card.innerHTML = `
                <div class="card-content" onclick="abrirDashboard(${sala.id})">
                    <h3>${sala.nome}</h3>
                    <p>${sala.descricao || 'Sem descrição'}</p>
                </div>
                
                <button class="btn-delete" onclick="event.stopPropagation(); confirmarExclusao(${sala.id}, '${sala.nome}')">
                    <i class="ph ph-trash"></i>
                </button>
            `;
            
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar salas:", error);
    }
}

function abrirDashboard(id) {
    window.location.href = `/dashboard?sala_id=${id}`;
}

async function confirmarExclusao(id, nome) {
    const confirmacao = confirm(`Tem certeza que deseja EXCLUIR a sala "${nome}"?\nTodos os dados históricos dela serão perdidos para sempre.`);

    if (confirmacao) {
        try {
            const response = await fetch(`/api/salas/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                carregarSalas();
            } else {
                alert("Erro ao excluir sala.");
            }
        } catch (error) {
            console.error("Erro:", error);
            alert("Erro ao conectar com o servidor.");
        }
    }
}

function abrirModal() {
    const modal = document.getElementById('modal-sala');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function fecharModal() {
    const modal = document.getElementById('modal-sala');
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

async function salvarSala() {
    const idValue = document.getElementById('id-sala').value;
    const nomeValue = document.getElementById('nome-sala').value;
    const descValue = document.getElementById('desc-sala').value;

    if (!idValue || !nomeValue) {
        alert("O ID e o Nome da sala são obrigatórios!");
        return;
    }

    const payload = {
        id: parseInt(idValue, 10), 
        nome: nomeValue,
        descricao: descValue
    };

    try {
        const response = await fetch('/api/salas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erro desconhecido ao criar a sala");
        }

        alert("Sala criada com sucesso!");
        fecharModal(); 
        location.reload(); 

    } catch (error) {
        alert("Erro: " + error.message);
    }
}