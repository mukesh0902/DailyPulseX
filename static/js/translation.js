/**
 * Translation functionality for DailyPulseX
 */

document.addEventListener('DOMContentLoaded', () => {
  // Store current language from the page
  const currentLanguage = document.querySelector('html').getAttribute('lang') || 'en';

  // Handle language switching for dynamic content
  function updateDescriptionWithLanguage(descriptionElement, title) {
    if (!descriptionElement || !title) return;

    const language = document.querySelector('#languageDropdown')?.getAttribute('data-current-lang') || 'en';

    // Show loading state
    if (window.loadingManager) {
      window.loadingManager.showTranslationLoading(descriptionElement);
    }

    // Fetch description with language
    fetch('/describe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        language: language
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (window.loadingManager) {
          window.loadingManager.hideTranslationLoading(descriptionElement);
        }

        if (data.desc) {
          descriptionElement.innerHTML = data.desc;
          descriptionElement.setAttribute('data-fetched', 'true');
        } else {
          descriptionElement.innerHTML = 'Error fetching description. Please try again.';
        }
      })
      .catch(error => {
        if (window.loadingManager) {
          window.loadingManager.hideTranslationLoading(descriptionElement);
        }
        descriptionElement.innerHTML = 'Error: ' + error.message;
      });
  }

  // Add language indicator to already fetched descriptions
  window.refreshDescriptionsWithLanguage = () => {
    const descriptions = document.querySelectorAll('.description[data-fetched="true"]');
    descriptions.forEach(desc => {
      const parentCard = desc.closest('.article-card') || desc.closest('.carousel-item');
      if (parentCard) {
        const title = parentCard.querySelector('h5')?.textContent ||
          parentCard.querySelector('h3')?.textContent;
        if (title) {
          updateDescriptionWithLanguage(desc, title);
        }
      }
    });
  };
}); 