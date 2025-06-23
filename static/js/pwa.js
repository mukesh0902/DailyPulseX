// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Cache articles for offline use
function cacheArticles(articles) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_NEWS',
      articles: articles
    });
  }
}

// Handle offline indicator
function updateOnlineStatus() {
  const offlineIndicator = document.getElementById('offline-indicator');
  if (!offlineIndicator) return;

  if (navigator.onLine) {
    offlineIndicator.classList.add('d-none');
  } else {
    offlineIndicator.classList.remove('d-none');
  }
}

// Setup offline mode indicator
document.addEventListener('DOMContentLoaded', () => {
  // Create offline indicator if it doesn't exist
  if (!document.getElementById('offline-indicator')) {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator d-none';
    indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
    document.body.appendChild(indicator);
  }

  // Initial check
  updateOnlineStatus();

  // Listen for online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Install prompt for PWA
  let deferredPrompt;
  const installButton = document.getElementById('install-app');

  if (installButton) {
    // Hide the button initially
    installButton.classList.add('d-none');

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      // Show the install button
      installButton.classList.remove('d-none');

      installButton.addEventListener('click', (e) => {
        // Hide the app provided install promotion
        installButton.classList.add('d-none');
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      });
    });
  }

  // Try to fetch cached news if we're offline
  if (!navigator.onLine) {
    fetchCachedNews();
  }
});

// Function to fetch cached news
function fetchCachedNews() {
  if ('caches' in window) {
    caches.open('news-cache')
      .then(cache => {
        return cache.match('cached-news');
      })
      .then(response => {
        if (response) {
          return response.json();
        }
        return null;
      })
      .then(data => {
        if (data && data.articles && data.articles.length > 0) {
          // Check if data is not too old (24 hours)
          const now = Date.now();
          const cachedTime = data.timestamp;
          const oneDay = 24 * 60 * 60 * 1000; // milliseconds in one day

          if (now - cachedTime < oneDay) {
            // Display cached articles
            displayCachedArticles(data.articles);
          }
        }
      })
      .catch(error => {
        console.error('Error fetching cached news:', error);
      });
  }
}

// Display cached articles - this function will be specific to your app's structure
function displayCachedArticles(articles) {
  // This will depend on your app's DOM structure
  const articleContainer = document.querySelector('.articles-grid');
  if (!articleContainer) return;

  // Clear "No articles found" message if present
  const noArticles = document.querySelector('.no-articles');
  if (noArticles) {
    noArticles.remove();
  }

  // Check if there are already articles displayed
  if (articleContainer.children.length > 0) {
    // There are already articles, possibly loaded from network, don't replace
    return;
  }

  // Display cached articles
  articles.forEach((article, index) => {
    const articleElement = createArticleElement(article);
    articleContainer.appendChild(articleElement);
  });

  // Add a notification that these are cached articles
  const notification = document.createElement('div');
  notification.className = 'alert alert-info mt-3';
  notification.innerHTML = '<i class="fas fa-info-circle"></i> You are viewing cached articles. Connect to the internet for the latest news.';
  articleContainer.parentNode.insertBefore(notification, articleContainer);
}

// Helper function to create article elements
function createArticleElement(article) {
  const col = document.createElement('div');
  col.className = 'col-md-4 col-sm-6 mb-4';

  col.innerHTML = `
    <div class="article-card">
      ${article.image_url ?
      `<img src="${article.image_url}" class="card-img-top" alt="${article.title}" loading="lazy">` :
      `<div class="no-image">${article.source_name || 'News'}</div>`
    }
      <div class="card-body">
        <span class="category-tag">${article.category ? article.category[0] : 'General'}</span>
        <h5>${article.title}</h5>
        <p class="meta">
          <i class="fas fa-clock"></i> ${article.pubDate ? article.pubDate.split(' ')[0] : 'Unknown date'} - 
          <i class="fas fa-newspaper"></i> ${article.source_name || 'Unknown source'}
        </p>
        <div class="description">${article.description || 'No description available'}</div>
        <a href="${article.link}" target="_blank" class="btn btn-read mt-2">Read More</a>
      </div>
    </div>
  `;

  return col;
} 