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
            
            // Layout do Card
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

// Lógica de Exclusão
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

// Funções do Modal de Criar Sala 
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
    // 1. Coleta os valores dos campos
    const idValue = document.getElementById('id-sala').value;
    const nomeValue = document.getElementById('nome-sala').value;
    const descValue = document.getElementById('desc-sala').value;

    // 2. Validação básica
    if (!idValue || !nomeValue) {
        alert("O ID e o Nome da sala são obrigatórios!");
        return;
    }

    // 3. Monta o pacote de dados (Payload)
    const payload = {
        id: parseInt(idValue, 10), // Converte o ID para número inteiro
        nome: nomeValue,
        descricao: descValue
    };

    // 4. Faz a requisição ao servidor
    try {
        const response = await fetch('/api/salas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Se o servidor retornar um erro (ex: 400 ou 403)
        if (!response.ok) {
            throw new Error(data.error || "Erro desconhecido ao criar a sala");
        }

        // Se deu tudo certo
        alert("Sala criada com sucesso!");
        fecharModal(); 
        location.reload(); // Atualiza a página para ver a nova sala na lista

    } catch (error) {
        // Captura e exibe qualquer erro (ex: ID já existente ou falha na rede)
        alert("Erro: " + error.message);
    }
}