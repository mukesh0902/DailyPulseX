/**
 * Loading States & Skeleton Screens for DailyPulseX
 */

class LoadingManager {
  constructor() {
    this.skeletonCardsCount = 6; // Number of skeleton cards to show
    this.featuredSkeletonCount = 1; // Number of featured skeletons
    console.log('Loading manager initialized');
  }

  /**
   * Show skeleton loading for articles
   */
  showArticleSkeletons() {
    const articlesGrid = document.querySelector('.articles-grid');
    if (!articlesGrid) return;

    // Clear existing content
    articlesGrid.innerHTML = '';

    // Add skeleton cards
    for (let i = 0; i < this.skeletonCardsCount; i++) {
      articlesGrid.appendChild(this.createArticleSkeleton());
    }
  }

  /**
   * Show skeleton loading for featured carousel
   */
  showFeaturedSkeletons() {
    const carouselInner = document.querySelector('.carousel-inner');
    if (!carouselInner) return;

    // Clear existing content
    carouselInner.innerHTML = '';

    // Add featured skeleton
    for (let i = 0; i < this.featuredSkeletonCount; i++) {
      const item = document.createElement('div');
      item.className = 'carousel-item active';
      item.appendChild(this.createFeaturedSkeleton());
      carouselInner.appendChild(item);
    }
  }

  /**
   * Show skeleton loading for article description
   */
  showDescriptionSkeleton(descriptionElement) {
    if (!descriptionElement) return;

    // Create skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-description';

    // Replace content with skeleton
    descriptionElement.innerHTML = '';
    descriptionElement.appendChild(skeleton);
    descriptionElement.style.display = 'block';
  }

  /**
   * Create a skeleton for an article card
   */
  createArticleSkeleton() {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-sm-6 mb-4';

    col.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-tag"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-meta"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `;

    return col;
  }

  /**
   * Create a skeleton for a featured article
   */
  createFeaturedSkeleton() {
    const featuredCard = document.createElement('div');
    featuredCard.className = 'featured-card';

    featuredCard.innerHTML = `
      <div class="skeleton skeleton-featured"></div>
      <div class="skeleton-caption">
        <div class="skeleton skeleton-caption-title"></div>
        <div class="skeleton-caption-btns">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    `;

    return featuredCard;
  }

  /**
   * Hide skeletons and show actual content
   */
  hideSkeletons(container) {
    if (!container) return;

    // Remove all skeleton elements
    const skeletons = container.querySelectorAll('.skeleton-card, .skeleton-featured');
    skeletons.forEach(skeleton => {
      skeleton.parentNode.removeChild(skeleton);
    });
  }

  // Add translation loading indicator
  showTranslationLoading(element) {
    if (!element) return;

    const loading = document.createElement('div');
    loading.className = 'translation-loading';
    element.innerHTML = '';
    element.appendChild(loading);
  }

  // Hide translation loading indicator
  hideTranslationLoading(element) {
    if (!element) return;

    const loading = element.querySelector('.translation-loading');
    if (loading) {
      loading.remove();
    }
  }
}

// Initialize the loading manager
const loadingManager = new LoadingManager();

// Show skeletons when page loads
document.addEventListener('DOMContentLoaded', () => {
  const articlesGrid = document.querySelector('.articles-grid');
  const carouselInner = document.querySelector('.carousel-inner');

  // Check if articles are already loaded
  if (articlesGrid && articlesGrid.children.length === 0) {
    loadingManager.showArticleSkeletons();
  }

  if (carouselInner && carouselInner.children.length === 0) {
    loadingManager.showFeaturedSkeletons();
  }
}); 