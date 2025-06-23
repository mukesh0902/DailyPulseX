/**
 * AI Features for DailyPulseX
 * Adds interactive AI elements to enhance user experience
 */

document.addEventListener('DOMContentLoaded', () => {
  // AI Typing animation for descriptions
  function applyTypingEffect(element, text) {
    if (!element || !text) return;

    // Clear the element
    element.innerHTML = '';
    element.classList.add('typing-animation-container');

    // Create a container for the content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'ai-content';
    element.appendChild(contentContainer);

    // Split text into paragraphs first, to preserve formatting
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

    // Function to process each paragraph with delay
    let currentParagraph = 0;

    function processParagraph() {
      if (currentParagraph >= paragraphs.length) return;

      const paragraph = paragraphs[currentParagraph];
      const paragraphElement = document.createElement('p');
      paragraphElement.className = 'ai-paragraph';
      contentContainer.appendChild(paragraphElement);

      // Display text immediately without animation if it's too long
      if (paragraph.length > 300) {
        paragraphElement.textContent = paragraph;
        currentParagraph++;
        if (currentParagraph < paragraphs.length) {
          setTimeout(processParagraph, 100);
        }
        return;
      }

      // Apply typing animation
      let charIndex = 0;
      const typeChar = () => {
        if (charIndex < paragraph.length) {
          paragraphElement.textContent += paragraph.charAt(charIndex);
          charIndex++;
          setTimeout(typeChar, 10); // Faster speed
        } else {
          currentParagraph++;
          if (currentParagraph < paragraphs.length) {
            setTimeout(processParagraph, 300);
          }
        }
      };

      typeChar();
    }

    // Start the animation
    processParagraph();
  }

  // AI enhanced loading indicator
  function showAILoading(element) {
    if (!element) return;

    element.innerHTML = `
      <div class="ai-loading">
        <span>AI thinking</span>
        <div class="ai-loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    element.style.display = 'block';
  }

  // Helper function to split text into chunks
  function splitIntoChunks(text, maxLength) {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';

    words.forEach(word => {
      if ((currentChunk + ' ' + word).length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        chunks.push(currentChunk);
        currentChunk = word;
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Override the default describe button behavior
  const buttons = document.querySelectorAll('.btn-describe');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const title = button.getAttribute('data-title');
      const descId = button.getAttribute('data-id');
      const descriptionEl = document.getElementById(descId);

      if (descriptionEl.innerHTML && !descriptionEl.getAttribute('data-fetched')) {
        // If there's content but it wasn't fetched, probably cached
        descriptionEl.style.display = descriptionEl.style.display === 'block' ? 'none' : 'block';
        return;
      }

      if (descriptionEl.getAttribute('data-fetched') && descriptionEl.style.display === 'block') {
        // If it was already fetched and visible, just hide it
        descriptionEl.style.display = 'none';
        return;
      }

      if (descriptionEl.getAttribute('data-fetched')) {
        // If it was already fetched but hidden, show it with typing animation
        descriptionEl.style.display = 'block';
        const text = descriptionEl.textContent;
        applyTypingEffect(descriptionEl, text);
        return;
      }

      // If not fetched yet, fetch the description
      button.innerHTML = '<i class="fas fa-robot"></i> Processing...';

      // Show AI-enhanced loading state
      showAILoading(descriptionEl);

      const language = document.querySelector('#languageDropdown')?.getAttribute('data-current-lang') || 'en';

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
          button.innerHTML = '<i class="fas fa-robot"></i> AI Describe';
          if (data.desc) {
            descriptionEl.setAttribute('data-fetched', 'true');
            descriptionEl.style.display = 'block';

            // Apply typing animation
            applyTypingEffect(descriptionEl, data.desc);
          } else {
            descriptionEl.innerHTML = 'AI couldn\'t generate a description. Please try again.';
            descriptionEl.style.display = 'block';
          }
        })
        .catch(error => {
          button.innerHTML = '<i class="fas fa-robot"></i> AI Describe';
          descriptionEl.innerHTML = 'Error: ' + error.message;
          descriptionEl.style.display = 'block';
        });
    });
  });

  // Initialize AI features
  console.log('🤖 AI features initialized');
}); 