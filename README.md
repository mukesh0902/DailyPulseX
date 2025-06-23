# DailyPulseX News Application

A modern and responsive news aggregator application powered by Flask, Newsdata.io API, and Google's Gemini AI.

## Features

- 📰 Real-time news updates from various sources
- 🔍 Search for news articles by keyword
- 🌏 Filter news by country and category
- 🤖 AI-powered article descriptions using Google's Gemini
- 👤 User accounts with authentication
- 🔖 Save favorite articles as bookmarks
- 📖 Track reading history
- ⚙️ Personalized user preferences
- 🌓 Dark/Light theme toggle
- 📱 Responsive design for all devices
- 🚀 Fast loading with API caching
- 🛡️ Rate limiting for API protection

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/DailyPulseX.git
   cd DailyPulseX
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on the `.env.example` and add your API keys:
   ```
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. Initialize the database:
   ```
   python init_db.py
   ```

6. Run the application:
   ```
   python app.py
   ```

7. Navigate to `http://localhost:5000` in your browser.

## Environment Variables

- `NEWS_DATA_API_KEY`: Your API key from [Newsdata.io](https://newsdata.io)
- `GEMINI_API_KEY`: Your API key from [Google AI Studio](https://ai.google.dev/)
- `ADMIN_KEY`: A secret key for admin functions like cache clearing
- `SECRET_KEY`: Flask secret key for session security
- `DATABASE_URL`: Database connection URL (default: SQLite)
- `FLASK_ENV`: Set to `development` for debug mode, `production` for production
- `PORT`: The port to run the application on (default: 5000)

## API Endpoints

- `/`: Main page with news articles
- `/login`: User login
- `/register`: User registration
- `/logout`: User logout
- `/profile`: User profile settings
- `/bookmarks`: User saved articles
- `/reading-history`: User reading history
- `/save-bookmark`: Save an article (POST)
- `/remove-bookmark/<id>`: Remove a bookmark (POST)
- `/clear-history`: Clear reading history (POST)
- `/track-read/<url>`: Track article reading (POST)
- `/describe`: Get AI-generated descriptions (POST)
- `/clear-cache`: Clear the news cache (requires admin key)

## Default Users

The `init_db.py` script creates two default users:

1. Admin User
   - Username: `admin`
   - Password: `adminpass`

2. Test User
   - Username: `testuser`
   - Password: `testpass`

For security in production, please change these credentials or remove them after setup.

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- News data provided by [Newsdata.io](https://newsdata.io)
- AI descriptions powered by [Google Gemini](https://ai.google.dev/)
- Frontend built with [Bootstrap](https://getbootstrap.com/) 