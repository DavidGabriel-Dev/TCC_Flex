from app.extensions import db

class Config(db.Model):
    __tablename__ = 'configs'

    id = db.Column(db.Integer, primary_key=True)
    intervalo_segundos = db.Column(db.Integer, default=10, nullable=False)

    def to_json(self):
        return {
            "id": self.id,
            "intervalo": self.intervalo_segundos
        }