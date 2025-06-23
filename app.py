from flask import Flask, render_template, request, jsonify, current_app, redirect, url_for, flash, session
import requests
import os
import time
from datetime import datetime, timedelta
from functools import lru_cache
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_migrate import Migrate
from werkzeug.urls import url_parse
from models import db, User, Bookmark, ReadingHistory
from forms import LoginForm, RegistrationForm, ProfileSettingsForm
from googletrans import Translator

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///dailypulsex.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Initialize rate limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Initialize Translator
translator = Translator()

# API keys from environment variables with fallbacks
NEWS_DATA_API_KEY = os.environ.get('NEWS_DATA_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# News data cache
NEWS_CACHE = {}
CACHE_DURATION = 15 * 60  # 15 minutes in seconds

# Category and Country options for the UI
CATEGORIES = [
    ('all', 'All'),
    ('politics', 'Politics'),
    ('sports', 'Sports'),
    ('business', 'Business'),
    ('technology', 'Technology'),
    ('entertainment', 'Entertainment'),
    ('science', 'Science'),
    ('health', 'Health'),
    ('world', 'World')
    # Add more categories as needed based on Newsdata.io documentation
]

COUNTRIES = [
    ('', 'All'),
    ('us', 'United States'),
    ('gb', 'United Kingdom'),
    ('in', 'India'),
    ('au', 'Australia'),
    ('jp', 'Japan'),
    ('de', 'Germany'),
    ('fr', 'France'),
    ('ca', 'Canada')
    # Add more countries as needed based on Newsdata.io documentation
]

# Define supported languages
LANGUAGES = [
    ('en', 'English'),
    ('hi', 'Hindi')
]

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def get_cache_key(query, country, category):
    """Generate a unique cache key based on request parameters."""
    return f"{query}:{country}:{category}"

def fetch_news_data(query=None, country=None, category=None):
    """Fetch news from Newsdata.io API with caching."""
    # Check cache first
    cache_key = get_cache_key(query, country, category)
    cached_data = NEWS_CACHE.get(cache_key)
    
    if cached_data:
        cache_time, results = cached_data
        # Return cached data if it's still valid
        if time.time() - cache_time < CACHE_DURATION:
            print(f"Using cached data for {cache_key}")
            return results
    
    base_url = 'https://newsdata.io/api/1/latest'
    params = {
        'apikey': NEWS_DATA_API_KEY,
        'language': 'en',
        'q': query if query else None,
        'country': country if country and country != '' else 'in',
        'category': category if category and category != 'all' else None
    }
    # Remove None values from params
    params = {k: v for k, v in params.items() if v is not None}

    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data.get('status') == 'success':
            results = data.get('results', [])
            print(f"Fetched {len(results)} articles with parameters: {params}")
            # Cache the results
            NEWS_CACHE[cache_key] = (time.time(), results)
            return results
        else:
            error_msg = data.get('message', 'Unknown API error')
            print(f"Newsdata.io API error: {error_msg} - Full response: {data}")
            return []
    except requests.RequestException as e:
        print(f"Error fetching news from Newsdata.io: {e} - URL: {base_url}, Params: {params}")
        return []
    except ValueError as e:
        print(f"Error parsing JSON response: {e}")
        return []

# Apply rate limiting to Gemini API calls
@lru_cache(maxsize=100)
def get_gemini_description(title):
    """Fetch a description from the Gemini API for a given news title using search grounding."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    prompt = f"""Search for the news article titled '{title}' and provide a concise description based on the search results.

Important: Start with the facts directly. DO NOT begin with phrases like "Here's a summary" or "Here's a description". 
Just provide the direct information about the news article in an informative and engaging way.

Include key facts, notable personalities involved (if any), and why this news matters.
Keep it under 200 words.
"""
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "tools": [
            {
                "google_search": {}
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "topP": 0.9,
            "topK": 40
        }
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        description = data["candidates"][0]["content"]["parts"][0]["text"]
    except requests.Timeout:
        description = "Error: Request to Gemini AI timed out. Please try again later."
    except requests.RequestException as e:
        description = f"Error: Unable to fetch AI description - {str(e)}"
    except (KeyError, IndexError) as e:
        print(f"Error parsing Gemini API response: {e}, Response: {response.text if 'response' in locals() else 'No response'}")
        description = "AI description not available due to an error in processing the API response."
    return description

# For translating text content
def translate_text(text, target_language='en'):
    """Translate text to target language using Google Translate API"""
    if not text or target_language == 'en':
        return text
    
    try:
        translation = translator.translate(text, dest=target_language)
        return translation.text
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Return original text if translation fails

@app.route('/')
def index():
    """Render the homepage with news based on filters."""
    query = request.args.get('q')
    language = request.args.get('lang', 'en')  # Default to English
    
    # Save language preference in session
    session['language'] = language
    
    # Use user preferences if logged in and no specific filters are provided
    if current_user.is_authenticated and not (request.args.get('country') or request.args.get('category')):
        country = request.args.get('country', current_user.default_country)
        category = request.args.get('category', current_user.default_category)
    else:
        country = request.args.get('country')
        category = request.args.get('category')

    # Add a small delay to showcase loading states in development
    if os.environ.get('FLASK_ENV') == 'development':
        time.sleep(0.8)  # 800ms delay

    if not request.args:
        # Load latest headlines from all categories on first load
        articles = fetch_news_data()
    else:
        articles = fetch_news_data(query=query, country=country, category=category)

    # Get breaking news for the ticker
    breaking_news = articles[:5] if articles else []
    
    # Only translate titles if language is Hindi
    if language == 'hi' and articles:
        # Translate article titles
        for article in articles:
            article['title'] = translate_text(article['title'], language)
            
        # Translate breaking news titles
        for article in breaking_news:
            article['title'] = translate_text(article['title'], language)

    return render_template(
        'index.html',
        articles=articles,
        breaking_news=breaking_news,
        categories=CATEGORIES,
        countries=COUNTRIES,
        languages=LANGUAGES,
        current_language=language,
        current_category=category,
        current_country=country,
        search_query=query,
        last_updated=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('login'))
            
        login_user(user, remember=form.remember_me.data)
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
        
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now registered!')
        return redirect(url_for('login'))
        
    return render_template('register.html', form=form)

@app.route('/logout')
def logout():
    """Handle user logout."""
    logout_user()
    return redirect(url_for('index'))

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """Handle user profile settings."""
    form = ProfileSettingsForm()
    
    # Set form choices
    form.default_country.choices = COUNTRIES
    form.default_category.choices = CATEGORIES
    
    if request.method == 'GET':
        # Pre-populate form with current user preferences
        form.default_country.data = current_user.default_country
        form.default_category.data = current_user.default_category
    
    if form.validate_on_submit():
        current_user.default_country = form.default_country.data
        current_user.default_category = form.default_category.data
        db.session.commit()
        flash('Your preferences have been updated!')
        return redirect(url_for('profile'))
        
    return render_template('profile.html', form=form)

@app.route('/bookmarks')
@login_required
def bookmarks():
    """Display user bookmarks."""
    user_bookmarks = current_user.bookmarks.order_by(Bookmark.created_at.desc()).all()
    return render_template('bookmarks.html', bookmarks=user_bookmarks)

@app.route('/reading-history')
@login_required
def reading_history():
    """Display user reading history."""
    user_history = current_user.reading_history.order_by(ReadingHistory.viewed_at.desc()).all()
    return render_template('reading_history.html', history=user_history)

@app.route('/save-bookmark', methods=['POST'])
@login_required
def save_bookmark():
    """Save an article as bookmark."""
    title = request.form.get('title')
    url = request.form.get('url')
    source = request.form.get('source')
    image_url = request.form.get('image_url')
    category = request.form.get('category')
    
    # Check if already bookmarked
    existing = Bookmark.query.filter_by(user_id=current_user.id, article_url=url).first()
    if existing:
        flash('This article is already in your bookmarks!')
    else:
        bookmark = Bookmark(
            user_id=current_user.id,
            article_title=title,
            article_url=url,
            article_source=source,
            article_image_url=image_url,
            article_category=category
        )
        db.session.add(bookmark)
        db.session.commit()
        flash('Article saved to bookmarks!')
        
    # Determine where to redirect based on referrer
    referrer = request.referrer
    if 'reading-history' in referrer:
        return redirect(url_for('reading_history'))
    elif 'bookmarks' in referrer:
        return redirect(url_for('bookmarks'))
    else:
        return redirect(url_for('index'))

@app.route('/remove-bookmark/<int:bookmark_id>', methods=['POST'])
@login_required
def remove_bookmark(bookmark_id):
    """Remove a bookmark."""
    bookmark = Bookmark.query.get_or_404(bookmark_id)
    if bookmark.user_id != current_user.id:
        flash('You do not have permission to remove this bookmark!')
        return redirect(url_for('bookmarks'))
        
    db.session.delete(bookmark)
    db.session.commit()
    flash('Bookmark removed!')
    return redirect(url_for('bookmarks'))

@app.route('/clear-history', methods=['POST'])
@login_required
def clear_history():
    """Clear user's reading history."""
    ReadingHistory.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    flash('Reading history cleared!')
    return redirect(url_for('reading_history'))

@app.route('/track-read/<path:article_url>', methods=['POST'])
@login_required
def track_read(article_url):
    """Track when a user reads an article."""
    title = request.form.get('title')
    source = request.form.get('source')
    
    # Check if already in history
    existing = ReadingHistory.query.filter_by(
        user_id=current_user.id, 
        article_url=article_url
    ).first()
    
    if existing:
        # Update timestamp
        existing.viewed_at = datetime.utcnow()
        db.session.commit()
    else:
        # Add new entry
        history = ReadingHistory(
            user_id=current_user.id,
            article_title=title,
            article_url=article_url,
            article_source=source
        )
        db.session.add(history)
        db.session.commit()
    
    return jsonify({'status': 'success'})

@app.route('/describe', methods=['POST'])
@limiter.limit("10 per minute")
def describe():
    """Fetch description for an article using Gemini API with translation support."""
    title = request.json.get('title')
    language = request.json.get('language', session.get('language', 'en'))
    
    if not title:
        return jsonify({'error': 'No title provided'}), 400
    
    description = get_gemini_description(title)
    
    # Translate description if language is not English
    if language != 'en':
        description = translate_text(description, language)
    
    return jsonify({'desc': description})

@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Admin endpoint to clear the news cache."""
    if request.headers.get('X-Admin-Key') != os.environ.get('ADMIN_KEY'):
        return jsonify({'error': 'Unauthorized'}), 403
    NEWS_CACHE.clear()
    get_gemini_description.cache_clear()
    return jsonify({'message': 'Cache cleared successfully'})

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded errors."""
    return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return render_template('500.html'), 500

@app.context_processor
def inject_base_template_vars():
    """Make certain variables available to all templates."""
    return {
        'app_name': 'DailyPulseX',
        'current_year': datetime.now().year,
        'languages': LANGUAGES,
        'current_language': session.get('language', 'en')
    }

@app.route('/offline')
def offline():
    """Serve the offline page."""
    return render_template('offline.html')

@app.route('/static/manifest.json')
def serve_manifest():
    """Serve the manifest file with correct MIME type."""
    return app.send_static_file('manifest.json'), 200, {'Content-Type': 'application/manifest+json'}

@app.route('/static/sw.js')
def serve_service_worker():
    """Serve the service worker with correct MIME type."""
    return app.send_static_file('sw.js'), 200, {'Content-Type': 'application/javascript', 'Service-Worker-Allowed': '/'}

@app.route('/static/icons/<path:filename>')
def serve_icon(filename):
    """Serve app icons."""
    return app.send_static_file(f'icons/{filename}')

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)