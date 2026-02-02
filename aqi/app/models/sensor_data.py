from app.extensions import db
from datetime import datetime

class SensorData(db.Model):
    __tablename__ = 'sensor_data'

    id = db.Column(db.Integer, primary_key=True)
    
    #Recebe uma chave estrangeira de uma sala
    sala_id = db.Column(db.Integer, db.ForeignKey('salas.id'), nullable=False)
    
    co2 = db.Column(db.Integer)
    tvoc = db.Column(db.Integer)
    aqi = db.Column(db.Integer)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_json(self):
        return {
            "id": self.id,
            "sala_id": self.sala_id,
            "co2": self.co2,
            "tvoc": self.tvoc,
            "aqi": self.aqi,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "timestamp": self.timestamp.isoformat()
        }