from app.extensions import db
from flask_login import UserMixin
import hashlib

class User(UserMixin, db.Model):
    __tablename__ = 'users'  

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(64), nullable=False)
    
    role = db.Column(db.String(20), nullable=False, default='comum') 

    def set_password(self, password):
        self.password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

    def check_password(self, password):
        hash_input = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return hash_input == self.password_hash

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'