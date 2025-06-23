from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User preferences
    default_country = db.Column(db.String(2), default='us')
    default_category = db.Column(db.String(20), default='all')
    
    # Relationships
    bookmarks = db.relationship('Bookmark', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reading_history = db.relationship('ReadingHistory', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Bookmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_title = db.Column(db.String(255), nullable=False)
    article_url = db.Column(db.String(512), nullable=False)
    article_source = db.Column(db.String(100))
    article_image_url = db.Column(db.String(512))
    article_category = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Bookmark {self.article_title[:30]}>'

class ReadingHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_title = db.Column(db.String(255), nullable=False)
    article_url = db.Column(db.String(512), nullable=False)
    article_source = db.Column(db.String(100))
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ReadingHistory {self.article_title[:30]}>' 