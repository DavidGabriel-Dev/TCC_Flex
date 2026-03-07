from ..extensions import db

class Sala(db.Model):
    __tablename__ = 'salas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(200))

    def to_json(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "descricao": self.descricao
        }