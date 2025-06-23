from app import app, db
from models import User, Bookmark, ReadingHistory

with app.app_context():
    print("Creating database tables...")
    db.create_all()
    
    # Create an admin user if it doesn't exist
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@example.com',
            default_country='us',
            default_category='all'
        )
        admin.set_password('adminpass')
        db.session.add(admin)
        
        # Create a test user if it doesn't exist
        if not User.query.filter_by(username='testuser').first():
            user = User(
                username='testuser',
                email='test@example.com',
                default_country='in',
                default_category='technology'
            )
            user.set_password('testpass')
            db.session.add(user)
            
        db.session.commit()
        print("Created admin and test users.")
    else:
        print("Admin user already exists.")
    
    print("Database initialization complete!") 