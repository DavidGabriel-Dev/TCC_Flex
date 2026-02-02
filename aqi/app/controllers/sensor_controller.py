from flask import request, jsonify
from . import bp
from ..database import db
from ..models.sensor_data import SensorData

@bp.route('/api/sensors/data', methods=['POST'])
def receive_data():
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "JSON required"}), 400
    
    record = SensorData(
        co2 = data.get("co2"),
        tvoc = data.get("tvoc"),
        aqi = data.get("aqi"),
        temperature = data.get("temperature"),
        humidity = data.get("humidity")
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({"msg": "data stored sucessfully"}), 201