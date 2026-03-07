from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions import db
from app.models.sensor_data import SensorData
from app.models.sala import Sala
from app.models.user import User
from app.models.config import Config 
from app.controllers.conforto_termico_controller import ConfortoTermicoController
from datetime import datetime
import csv
from io import StringIO
from flask import make_response


bp = Blueprint('sensors', __name__)

secret_key = "senhamestre"

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('sensors.index'))
    
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form.get('username')).first()
        if user and user.check_password(request.form.get('password')):
            login_user(user)
            return redirect(url_for('sensors.index'))
        flash('Login inválido')
    return render_template('login.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('sensors.login'))

@bp.route('/')
@login_required
def index():
    return render_template('home.html')

@bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@bp.route('/api/salas', methods=['GET'])
@login_required
def listar_salas():
    salas = Sala.query.all()
    return jsonify([s.to_json() for s in salas])

@bp.route('/api/salas', methods=['POST'])
@login_required
def criar_sala():
    if current_user.role != 'admin':
        return jsonify({"error": "Acesso negado. Apenas administradores podem criar salas"}), 403
    
    data = request.get_json()
    sala_id = data.get('id')
    nome = data.get('nome')
    descricao = data.get('descricao')

    if not sala_id or not nome:
        return jsonify({"error": "ID e Nome são obrigatórios"}), 400

    if Sala.query.get(sala_id):
        return jsonify({"error": f"Já existe uma sala cadastrada com o ID {sala_id}!"}), 400

    nova_sala = Sala(id=sala_id, nome=nome, descricao=descricao)
    db.session.add(nova_sala)
    db.session.commit()
    
    return jsonify(nova_sala.to_json()), 201

@bp.route('/api/sensors/historico', methods=['GET'])
@login_required
def historico():
    sala_id = request.args.get('sala_id')
    inicio = request.args.get('inicio')
    fim = request.args.get('fim')

    if not sala_id: return jsonify({"error": "Falta sala_id"}), 400

    query = SensorData.query.filter_by(sala_id=sala_id)

    if inicio and fim:
        try:
            dt_ini = datetime.strptime(inicio, '%Y-%m-%dT%H:%M')
            dt_fim = datetime.strptime(fim, '%Y-%m-%dT%H:%M')
            query = query.filter(SensorData.timestamp.between(dt_ini, dt_fim))
        except:
            return jsonify({"error": "Data inválida"}), 400
        
        dados = query.order_by(SensorData.timestamp.asc()).all()
    else:
        dados = query.order_by(SensorData.timestamp.desc()).limit(50).all()
        dados = dados[::-1] 

    return jsonify([d.to_json() for d in dados])

@bp.route('/api/sensors/conforto/<int:sala_id>')
@login_required
def conforto(sala_id):
    dado = SensorData.query.filter_by(sala_id=sala_id).order_by(SensorData.timestamp.desc()).first()
    if not dado: return jsonify({"error": "Sem dados"}), 404
    
    ctrl = ConfortoTermicoController()
    res = ctrl.avaliar({
        "temperatura": dado.temperature, "umidade": dado.humidity,
        "co2": dado.co2, "tvoc": dado.tvoc, "aqi": dado.aqi
    })
    return jsonify(res)

@bp.route('/api/sensors/data', methods=['POST'])
def receive_data():
    data = request.get_json()
    if not data or not data.get('sala_id'): return jsonify({"error": "Erro dados"}), 400
    
    if not Sala.query.get(data.get('sala_id')): return jsonify({"error": "Sala não existe"}), 404

    rec = SensorData(
        sala_id=data['sala_id'], co2=data.get('co2'), tvoc=data.get('tvoc'),
        aqi=data.get('aqi'), temperature=data.get('temperature'), humidity=data.get('humidity')
    )
    db.session.add(rec)
    db.session.commit()
    return jsonify({"status": "ok"}), 201

@bp.route('/api/config/intervalo', methods=['GET'])
def obter_intervalo():
    config = Config.query.first()
    intervalo = config.intervalo_segundos if config else 10
    return jsonify({"intervalo": intervalo})

@bp.route('/api/config/intervalo', methods=['POST'])
@login_required
def atualizar_intervalo():
    if current_user.role != 'admin':
        return jsonify({"error": "Acesso negado. Apenas admins podem alterar o intervalo."}), 403
    
    data = request.get_json()
    novo_valor = data.get('intervalo')

    if not novo_valor or int(novo_valor) < 5:
        return jsonify({"error": "O intervalo mínimo é de 5 segundos."}), 400

    config = Config.query.first()
    if not config:
        config = Config(intervalo_segundos=int(novo_valor))
        db.session.add(config)
    else:
        config.intervalo_segundos = int(novo_valor)
    
    db.session.commit()
    return jsonify({"message": "Intervalo atualizado com sucesso!", "intervalo": int(novo_valor)}), 200


@bp.route('/api/salas/<int:sala_id>', methods=['DELETE'])
@login_required
def deletar_sala(sala_id):
    if current_user.role != 'admin':
        return jsonify({"erro":"somente administradores podem excluir salas"}), 403
    
    sala = Sala.query.get(sala_id)
    if not sala:
        return jsonify({"error": "Sala não encontrada"}), 404

    try:
        SensorData.query.filter_by(sala_id=sala_id).delete()
        db.session.delete(sala)
        db.session.commit()
        return jsonify({"message": "Sala e dados excluídos com sucesso!"}), 200
    except Exception as e:
        db.session.rollback() 
        return jsonify({"error": str(e)}), 500

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('sensors.index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        role_escolhida = request.form.get('role')     
        admin_code = request.form.get('admin_code')   

        if User.query.filter_by(username=username).first():
            flash('Nome de usuário já existe.')
            return redirect(url_for('sensors.register'))

        if role_escolhida == 'admin':
            if admin_code != secret_key:
                flash('Código de segurança incorreto! Conta não criada.')
                return redirect(url_for('sensors.register'))
        else:
            role_escolhida = 'comum'

        new_user = User(username=username, role=role_escolhida)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Conta criada com sucesso! Faça login.')
        return redirect(url_for('sensors.login'))
    
    return render_template('register.html')

@bp.route('/api/sensors/exportar_csv')
@login_required
def exportar_csv():
    sala_id = request.args.get('sala_id')
    inicio = request.args.get('inicio')
    fim = request.args.get('fim')

    if not sala_id:
        return jsonify({"error": "ID da sala é obrigatório"}), 400

    query = SensorData.query.filter_by(sala_id=sala_id)
    
    if inicio and fim:
        try:
            dt_inicio = datetime.fromisoformat(inicio)
            dt_fim = datetime.fromisoformat(fim)
            query = query.filter(SensorData.timestamp.between(dt_inicio, dt_fim))
        except ValueError:
            pass 
    
    dados = query.order_by(SensorData.timestamp.asc()).all()

    si = StringIO()
    cw = csv.writer(si, delimiter=';')
    
    cw.writerow(['Data e Hora', 'CO2 (ppm)', 'TVOC (ppb)', 'AQI', 'Temp (C)', 'Umidade (%)'])

    for d in dados:
        cw.writerow([
            d.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
            d.co2,
            d.tvoc,
            d.aqi,
            str(d.temperature).replace('.', ','), 
            str(d.humidity).replace('.', ',')
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = f"attachment; filename=relatorio_sala_{sala_id}.csv"
    output.headers["Content-type"] = "text/csv"
    return output

