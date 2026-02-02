from flask import Blueprint, jsonify, request, render_template
from app.extensions import db
from app.models.sensor_data import SensorData
from app.models.sala import Sala
from app.controllers.conforto_termico_controller import ConfortoTermicoController

bp = Blueprint('sensors', __name__)


#ROTAS DO FRONTEND
@bp.route('/')
def index():
    """Renderiza a tela inicial com a lista de salas."""
    return render_template('home.html')

@bp.route('/dashboard')
def dashboard():
    """Renderiza o dashboard. O Javascript vai ler o ?sala_id=X da URL."""
    return render_template('dashboard.html')


# API: GERENCIAMENTO DE SALAS
@bp.route('/api/salas', methods=['GET'])
def listar_salas():
    """Lista todas as salas cadastradas para o Grid da Home."""
    salas = Sala.query.all()
    return jsonify([sala.to_json() for sala in salas])

@bp.route('/api/salas', methods=['POST'])
def criar_sala():
    """Cria uma nova sala via botão '+' da Home."""
    data = request.get_json()
    
    #Validação
    if not data or 'nome' not in data:
        return jsonify({"error": "O nome da sala é obrigatório"}), 400

    nova_sala = Sala(nome=data.get('nome'), descricao=data.get('descricao'))
    
    db.session.add(nova_sala)
    db.session.commit()
    
    return jsonify(nova_sala.to_json()), 201


#API: Dados dos sensores da Esp32 para o  backend
@bp.route('/api/sensors/data', methods=['POST'])
def post_data():
    """Recebe os dados da Esp32 e salva vinculado a uma sala."""
    data = request.get_json()
    sala_id = data.get('sala_id')

    #Valida se a Esp32 enviou o ID da sala
    if not sala_id:
        return jsonify({"error": "Campo 'sala_id' é obrigatório"}), 400

    #Valida se a sala existe no banco
    sala_existente = Sala.query.get(sala_id)
    if not sala_existente:
        return jsonify({"error": f"Sala {sala_id} não encontrada"}), 404

    #Cria o registro vinculado à sala
    record = SensorData(
        sala_id=sala_id,
        co2=data.get('co2'),
        tvoc=data.get('tvoc'),
        aqi=data.get('aqi'),
        temperature=data.get('temperature'),
        humidity=data.get('humidity')
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({"status": "saved", "sala": sala_existente.nome}), 201


# API: Dados para graficos de conforto backend para frontend
@bp.route('/api/sensors/data/<int:sala_id>', methods=['GET'])
def get_data_por_sala(sala_id):
    """Retorna o histórico de dados APENAS da sala solicitada."""
    
    # Verifica se a sala existe 
    if not Sala.query.get(sala_id):
        return jsonify({"error": "Sala não encontrada"}), 404

    records = SensorData.query.filter_by(sala_id=sala_id)\
        .order_by(SensorData.timestamp.desc())\
        .limit(200)\
        .all()

    return jsonify([r.to_json() for r in records])


@bp.route('/api/sensors/conforto/<int:sala_id>', methods=['GET'])
def avaliar_conforto_por_sala(sala_id):
    """Calcula o conforto térmico baseado no último dado da sala solicitada."""
    
    #Pega o dado mais recente 
    dado = SensorData.query.filter_by(sala_id=sala_id)\
        .order_by(SensorData.timestamp.desc())\
        .first()

    if not dado:
        return jsonify({"error": "Sem dados para esta sala"}), 404

    controller = ConfortoTermicoController()

    resultado = controller.avaliar({
        "temperatura": dado.temperature,
        "umidade": dado.humidity,
        "co2": dado.co2,
        "tvoc": dado.tvoc,
        "aqi": dado.aqi
    })

    return jsonify(resultado)

@bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok"})