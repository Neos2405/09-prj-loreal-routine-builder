/* Get references to DOM elements */
const searchInput = document.getElementById("searchInput");
const categoryFilterBtn = document.getElementById("categoryFilterBtn");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Cloudflare Worker configuration for secure API calls */
const CLOUDFLARE_WORKER_URL = 'https://loreal-chatbot-proxy.lphneos245.workers.dev/';

/* Store all products globally to avoid repeated API calls */
let allProducts = [];
let currentCategoryFilter = "";
let selectedProducts = new Set(); // Store selected product IDs
let currentFilteredProducts = []; // Store currently filtered products
let visibleProductsCount = 6; // Number of products to show initially
const PRODUCTS_PER_PAGE = 6; // Number of products to add each time "Show More" is clicked
let conversationHistory = []; // Store conversation history for context

/* localStorage keys */
const STORAGE_KEYS = {
  SELECTED_PRODUCTS: 'loreal_selected_products',
  CONVERSATION_HISTORY: 'loreal_conversation_history',
  RTL_MODE: 'loreal_rtl_mode'
};

/* Load data from localStorage */
function loadFromStorage() {
  try {
    /* Load selected products */
    const savedSelections = localStorage.getItem(STORAGE_KEYS.SELECTED_PRODUCTS);
    if (savedSelections) {
      const productIds = JSON.parse(savedSelections);
      selectedProducts = new Set(productIds);
    }
    
    /* Load conversation history */
    const savedHistory = localStorage.getItem(STORAGE_KEYS.CONVERSATION_HISTORY);
    if (savedHistory) {
      conversationHistory = JSON.parse(savedHistory);
      /* Restore chat messages to the UI */
      restoreChatHistory();
    }
    
    /* Load RTL mode preference */
    const savedRtlMode = localStorage.getItem(STORAGE_KEYS.RTL_MODE);
    if (savedRtlMode === 'true') {
      setRTLMode(true);
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    /* Reset if corrupted data */
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.RTL_MODE);
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PRODUCTS, JSON.stringify(Array.from(selectedProducts)));
  } catch (error) {
    console.error("Error saving selected products:", error);
  }
}

/* Save conversation history to localStorage */
function saveConversationHistory() {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_HISTORY, JSON.stringify(conversationHistory));
  } catch (error) {
    console.error("Error saving conversation history:", error);
  }
}

/* Restore chat history to the UI */
function restoreChatHistory() {
  const chatWindow = document.getElementById("chatWindow");
  chatWindow.innerHTML = ''; // Clear existing messages
  
  conversationHistory.forEach(message => {
    if (message.role === 'user' || message.role === 'assistant') {
      const sender = message.role === 'user' ? 'user' : 'ai';
      displayChatMessage(message.content, sender, false); // false = don't save to history again
    }
  });
}

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
    return allProducts;
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger text-center" role="alert">
          <i class="fa-solid fa-exclamation-triangle me-2"></i>
          Unable to load products. Please try again later.
        </div>
      </div>
    `;
    return [];
  }
}

/* Filter products based on search term and category */
function filterProducts(searchTerm = "", category = "") {
  let filteredProducts = allProducts;

  /* Filter by category if selected */
  if (category) {
    filteredProducts = filteredProducts.filter(product => 
      product.category === category
    );
  }

  /* Filter by search term if provided */
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      product.brand.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
    );
  }

  /* Store filtered products and reset visible count */
  currentFilteredProducts = filteredProducts;
  visibleProductsCount = PRODUCTS_PER_PAGE;

  return filteredProducts;
}

/* Create HTML for displaying product cards in Bootstrap grid */
function displayProducts(products, showAll = false) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="col-12">
        <div class="text-center text-muted py-5">
          <i class="fa-solid fa-search fa-3x mb-3 opacity-25"></i>
          <h3 class="h5">No products found</h3>
          <p>Try selecting a different category</p>
        </div>
      </div>
    `;
    /* Hide show more button if it exists */
    const showMoreBtn = document.getElementById('showMoreBtn');
    if (showMoreBtn) {
      showMoreBtn.style.display = 'none';
    }
    return;
  }

  /* Determine how many products to show */
  const productsToShow = showAll ? products : products.slice(0, visibleProductsCount);

  /* Create responsive Bootstrap cards for each product */
  productsContainer.innerHTML = productsToShow
    .map(
      (product) => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card product-card h-100 border-0 shadow-sm ${selectedProducts.has(product.id) ? 'selected' : ''}" data-product-id="${product.id}">
        <div class="product-info-icon" data-product-id="${product.id}">
          <i class="fa-solid fa-info"></i>
        </div>
        <div class="card-body p-4">
          <div class="row g-3">
            <div class="col-4">
              <img src="${product.image}" alt="${product.name}" class="img-fluid product-image rounded">
            </div>
            <div class="col-8">
              <h5 class="card-title product-name mb-2">${product.name}</h5>
              <p class="card-text product-brand mb-1">${product.brand}</p>
              <span class="product-category">${product.category}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  /* Add or update "Show More" button */
  updateShowMoreButton(products.length);

  /* Add click handlers for product cards */
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      /* Don't select product if clicking the info icon */
      if (e.target.closest('.product-info-icon')) {
        return;
      }
      const productId = parseInt(card.dataset.productId);
      toggleProductSelection(productId);
    });
  });

  /* Add click handlers for info icons */
  document.querySelectorAll('.product-info-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(icon.dataset.productId);
      showProductModal(productId);
    });
  });
}

/* Update or create "Show More" button */
function updateShowMoreButton(totalProducts) {
  let showMoreBtn = document.getElementById('showMoreBtn');
  
  /* Remove existing button if it exists */
  if (showMoreBtn) {
    showMoreBtn.remove();
  }

  /* Only show "Show More" if there are more products to display */
  if (visibleProductsCount < totalProducts) {
    const showMoreHtml = `
      <div class="col-12 text-center mt-4">
        <button id="showMoreBtn" class="btn btn-link text-decoration-underline p-0 border-0 bg-transparent" style="color: var(--loreal-dark); font-size: 1rem;">
          Show More
        </button>
      </div>
    `;
    
    productsContainer.insertAdjacentHTML('afterend', showMoreHtml);
    
    /* Add click handler for "Show More" button */
    document.getElementById('showMoreBtn').addEventListener('click', () => {
      visibleProductsCount += PRODUCTS_PER_PAGE;
      displayProducts(currentFilteredProducts);
    });
  }
}

/* Toggle product selection */
function toggleProductSelection(productId) {
  if (selectedProducts.has(productId)) {
    selectedProducts.delete(productId);
  } else {
    selectedProducts.add(productId);
  }
  
  /* Save to localStorage */
  saveSelectedProducts();
  
  /* Update the visual state of the card */
  updateProductCardState(productId);
  
  /* Update the selected products display */
  updateSelectedProductsDisplay();
}

/* Update the visual state of a product card */
function updateProductCardState(productId) {
  const card = document.querySelector(`[data-product-id="${productId}"]`);
  if (card) {
    if (selectedProducts.has(productId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }
}

/* Update the selected products display */
function updateSelectedProductsDisplay() {
  const selectedProductsArray = Array.from(selectedProducts).map(id => 
    allProducts.find(product => product.id === id)
  ).filter(Boolean);

  if (selectedProductsArray.length === 0) {
    selectedProductsList.innerHTML = '<p class="text-muted mb-0">No products selected</p>';
    return;
  }

  selectedProductsList.innerHTML = `
    <div class="mb-3">
      <div class="d-flex align-items-center mb-2">
        <span class="text-muted small me-3">${selectedProductsArray.length} product${selectedProductsArray.length > 1 ? 's' : ''} selected</span>
        <button id="clearAllProducts" class="btn btn-link p-0 text-decoration-underline" style="color: var(--loreal-dark); font-size: 0.9rem;">
          Clear All
        </button>
      </div>
      <div class="selected-products-tags d-flex flex-wrap gap-2">
        ${selectedProductsArray
          .map(product => `
            <span class="badge selected-product-tag" data-product-id="${product.id}">
              ${product.name}
              <button type="button" class="btn-close ms-2" aria-label="Remove ${product.name}"></button>
            </span>
          `)
          .join('')}
      </div>
    </div>
  `;

  /* Add click handler for Clear All button */
  document.getElementById('clearAllProducts').addEventListener('click', () => {
    selectedProducts.clear();
    saveSelectedProducts();
    updateSelectedProductsDisplay();
    
    /* Update all product card states */
    document.querySelectorAll('.product-card').forEach(card => {
      card.classList.remove('selected');
    });
  });

  /* Add click handlers to remove buttons */
  document.querySelectorAll('.selected-product-tag .btn-close').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(button.closest('.selected-product-tag').dataset.productId);
      toggleProductSelection(productId);
    });
  });
}

/* Show product modal with details */
function showProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  /* Create modal if it doesn't exist */
  let modal = document.getElementById('productModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'productModal';
    modal.className = 'product-modal';
    document.body.appendChild(modal);
  }

  /* Set modal content */
  modal.innerHTML = `
    <div class="product-modal-content" style="background-image: url('${product.image}')">
      <div class="product-modal-header">
        <button class="product-modal-close" onclick="closeProductModal()">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
      <div class="product-modal-body">
        <h2 class="product-modal-title">${product.name}</h2>
        <p class="product-modal-brand">${product.brand}</p>
        <span class="product-modal-category">${product.category}</span>
        <p class="product-modal-description">${product.description || 'This premium L\'Oréal product is designed to enhance your beauty routine with professional-quality results. Formulated with advanced ingredients and backed by years of research, it delivers exceptional performance for all your beauty needs.'}</p>
      </div>
    </div>
  `;

  /* Show modal */
  modal.classList.add('show');

  /* Add escape key handler */
  document.addEventListener('keydown', handleModalEscape);

  /* Prevent body scroll */
  document.body.style.overflow = 'hidden';
}

/* Close product modal */
function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.remove('show');
    document.removeEventListener('keydown', handleModalEscape);
    document.body.style.overflow = '';
  }
}

/* Handle escape key for modal */
function handleModalEscape(e) {
  if (e.key === 'Escape') {
    closeProductModal();
  }
}

/* Close modal when clicking outside */
document.addEventListener('click', (e) => {
  const modal = document.getElementById('productModal');
  if (modal && e.target === modal) {
    closeProductModal();
  }
});

/* Handle search input changes */
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value;
  const filteredProducts = filterProducts(searchTerm, currentCategoryFilter);
  displayProducts(filteredProducts);
});

/* Handle category filter dropdown clicks */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("category-filter-item")) {
    e.preventDefault();
    
    const selectedCategory = e.target.dataset.category;
    const categoryText = e.target.textContent;
    
    /* Update button text to show selected category */
    categoryFilterBtn.innerHTML = `<i class="fa-solid fa-filter me-2"></i>${categoryText}`;
    
    /* Store current category filter */
    currentCategoryFilter = selectedCategory;
    
    /* Apply filters */
    const searchTerm = searchInput.value;
    const filteredProducts = filterProducts(searchTerm, selectedCategory);
    displayProducts(filteredProducts);
  }
});

/* Initialize the app by loading all products */
async function initializeApp() {
  /* Load data from localStorage first */
  loadFromStorage();
  
  const products = await loadProducts();
  currentFilteredProducts = products;
  visibleProductsCount = PRODUCTS_PER_PAGE;
  displayProducts(products);
  updateSelectedProductsDisplay(); // Initialize with saved selections
}

/* Start the app when the page loads */
initializeApp();

/* Chat form submission handler with OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();
  const generateBtn = document.getElementById("generateRoutine");
  
  if (!userMessage) return;
  
  /* Disable generate button during chat request */
  generateBtn.disabled = true;
  
  /* Show user message first */
  displayChatMessage(userMessage, "user");
  
  /* Clear input and show loading state */
  userInput.value = "";
  showTypingIndicator();
  
  try {
    /* Get selected products for context */
    const selectedProductsArray = Array.from(selectedProducts).map(id => 
      allProducts.find(product => product.id === id)
    ).filter(Boolean);
    
    /* Generate AI response */
    const response = await generateAIResponse(userMessage, selectedProductsArray);
    
    /* Remove typing indicator before showing response */
    removeTypingIndicator();
    
    /* Display AI response */
    displayChatMessage(response, "ai");
    
  } catch (error) {
    console.error("Error getting AI response:", error);
    removeTypingIndicator();
    displayChatMessage("I apologize, but I'm having trouble connecting right now. Please try again in a moment.", "ai");
  } finally {
    /* Re-enable generate button after request completes */
    generateBtn.disabled = false;
  }
});

/* Generate AI response using Cloudflare Worker to protect API key */
async function generateAIResponse(userMessage, selectedProducts) {
  /* Create context about selected products */
  const productContext = selectedProducts.length > 0 
    ? `Selected products: ${selectedProducts.map(p => `${p.name} by ${p.brand} (${p.category})`).join(", ")}`
    : "No products currently selected";
  
  /* Perform web search for current L'Oréal information */
  let webSearchResults = "";
  try {
    const searchResults = await performWebSearch(userMessage);
    if (searchResults && searchResults.length > 0) {
      webSearchResults = `\n\nCurrent web information:\n${searchResults.map(result => 
        `- ${result.title}: ${result.snippet} (Source: ${result.link})`
      ).join('\n')}`;
    }
  } catch (error) {
    console.warn("Web search failed:", error);
    // Continue without web search if it fails
  }
  
  /* Create the system message for L'Oreal brand context with web search capability */
  const systemMessage = `You are a friendly and helpful L'Oreal beauty advisor with access to current web information. Your role is to provide personalized beauty and skincare routine recommendations using both your knowledge and real-time web search results.

IMPORTANT GUIDELINES:
- Be friendly, helpful, sharp, and on point
- Focus on L'Oreal brand values of beauty, confidence, and self-expression
- Provide clear, practical advice that users can easily follow
- When you have web search results, incorporate current information and cite sources with clickable links
- Format responses with bold headers and regular text for organized sections
- Do not use special characters like asterisks, bullets, or hashtags
- Use emojis appropriately to create emotional connection and express warmth
- When referring to products, use their exact names as they appear in the product list
- Keep responses concise but informative
- When products are selected, incorporate them into your recommendations
- If no products are selected, suggest suitable L'Oreal product categories
- Always end with encouragement about their beauty journey
- When citing web sources, format links as: <a href="URL" target="_blank" rel="noopener">Source Title</a>

RESPONSE FORMAT:
Use HTML formatting with <h3> for main headers, <h4> for sub-headers, and <p> for paragraphs.
Example: <h3>Your Personalized Beauty Routine ✨</h3><h4>Morning Steps 🌅</h4><p>Start with...</p>
Include citations when using web information: <p>According to recent information from <a href="URL" target="_blank" rel="noopener">L'Oréal's official site</a>, this product...</p>
Keep it clean and easy to read with emojis to enhance emotional connection.`;

  /* Build messages array with conversation history */
  const messages = [
    {
      role: "system",
      content: systemMessage
    }
  ];

  /* Add conversation history for context (last 10 messages to keep API calls manageable) */
  const recentHistory = conversationHistory.slice(-10);
  messages.push(...recentHistory);

  /* Add current user message with product context and web search results */
  messages.push({
    role: "user", 
    content: `${userMessage}\n\nContext: ${productContext}${webSearchResults}`
  });

  /* Make API call to Cloudflare Worker instead of direct OpenAI */
  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages,
        model: "gpt-4o",
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare Worker error:', response.status, errorText);
      throw new Error(`Cloudflare Worker request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Worker response:', data); // Debug log
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.error) {
      throw new Error(`AI Service Error: ${data.error.message || data.error}`);
    } else {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from AI service');
    }
  } catch (error) {
    console.error('Error calling Cloudflare Worker:', error);
    throw new Error('Sorry, I encountered an error while generating your routine. Please try again.');
  }
}

/* Perform web search for current L'Oréal information */
async function performWebSearch(query) {
  try {
    /* Create search query focused on L'Oréal */
    const searchQuery = `L'Oréal ${query} beauty routine products 2024 2025`;
    
    /* Use Serper API for web search - you'll need to add your API key to your Cloudflare Worker */
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': '', // This would need to be handled by your Cloudflare Worker
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5, // Limit to 5 results
        gl: 'us',
        hl: 'en'
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    /* Filter and format results */
    const results = [];
    if (searchData.organic) {
      searchData.organic.forEach(result => {
        /* Prioritize L'Oréal official sites and beauty-related content */
        if (result.link.includes('loreal.com') || 
            result.link.includes('beauty') || 
            result.title.toLowerCase().includes('loreal') ||
            result.snippet.toLowerCase().includes('loreal')) {
          results.push({
            title: result.title,
            snippet: result.snippet,
            link: result.link
          });
        }
      });
    }

    /* If no L'Oréal specific results, include general beauty results */
    if (results.length === 0 && searchData.organic) {
      searchData.organic.slice(0, 3).forEach(result => {
        results.push({
          title: result.title,
          snippet: result.snippet,
          link: result.link
        });
      });
    }

    return results;
  } catch (error) {
    console.error("Web search error:", error);
    return []; // Return empty array instead of throwing error
  }
}

/* Process AI message to highlight product names and make them clickable */
function processAIMessage(message) {
  let processedMessage = message;
  
  /* Get all product names for highlighting */
  allProducts.forEach(product => {
    const productName = product.name;
    /* Create a regex that matches the product name (case insensitive, word boundaries) */
    const regex = new RegExp(`\\b${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    
    /* Replace with clickable link */
    processedMessage = processedMessage.replace(regex, (match) => {
      return `<span class="product-link" onclick="showProductModal(${product.id})" title="Click to view product details">${match}</span>`;
    });
  });
  
  return processedMessage;
}

/* Display chat message in the chat window */
function displayChatMessage(message, sender, saveToHistory = true) {
  const chatWindow = document.getElementById("chatWindow");
  
  /* Create message element */
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message ${sender}`;
  
  if (sender === "user") {
    messageElement.innerHTML = message;
  } else {
    /* Process AI messages to highlight product names */
    const processedMessage = processAIMessage(message);
    messageElement.innerHTML = processedMessage;
  }
  
  /* Add message to chat window */
  chatWindow.appendChild(messageElement);
  
  /* Save to conversation history if requested */
  if (saveToHistory) {
    const role = sender === 'user' ? 'user' : 'assistant';
    conversationHistory.push({
      role: role,
      content: message // Save original message without processing
    });
    saveConversationHistory();
  }
  
  /* Scroll to bottom */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show typing indicator while AI is generating response */
function showTypingIndicator() {
  const chatWindow = document.getElementById("chatWindow");
  
  /* Remove any existing typing indicator */
  removeTypingIndicator();
  
  /* Create typing indicator */
  const typingElement = document.createElement("div");
  typingElement.className = "typing-indicator chat-message ai";
  typingElement.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <div class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <span class="text-muted ms-2">Searching for current L'Oréal information and creating your routine...</span>
    </div>
  `;
  
  chatWindow.appendChild(typingElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove typing indicator */
function removeTypingIndicator() {
  const chatWindow = document.getElementById("chatWindow");
  const existingIndicator = chatWindow.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
}

/* Clear conversation history */
function clearConversationHistory() {
  conversationHistory = [];
  saveConversationHistory();
  
  /* Clear chat window */
  const chatWindow = document.getElementById("chatWindow");
  chatWindow.innerHTML = '';
}

/* Clear chat button handler */
document.getElementById("clearChatBtn").addEventListener("click", () => {
  showClearChatConfirmation();
});

/* Show clear chat confirmation popup */
function showClearChatConfirmation() {
  const clearBtn = document.getElementById("clearChatBtn");
  
  /* Remove any existing confirmation */
  const existingConfirmation = document.querySelector('.clear-chat-confirmation');
  if (existingConfirmation) {
    existingConfirmation.remove();
  }
  
  /* Create confirmation element */
  const confirmationElement = document.createElement('div');
  confirmationElement.className = 'clear-chat-confirmation';
  confirmationElement.innerHTML = `
    <div class="confirmation-message">Are you sure?</div>
    <div class="confirmation-buttons">
      <button class="confirm-yes">Yes</button>
      <button class="confirm-no">No</button>
    </div>
  `;
  confirmationElement.style.cssText = `
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 10px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    font-size: 0.85rem;
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  /* Style the message */
  const messageStyle = `
    margin-bottom: 8px;
    color: #333;
    text-align: center;
  `;
  
  /* Style the buttons container */
  const buttonsStyle = `
    display: flex;
    gap: 8px;
    justify-content: center;
  `;
  
  /* Style the Yes button */
  const yesButtonStyle = `
    background-color: black;
    color: white;
    border: 1px solid black;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  `;
  
  /* Style the No button */
  const noButtonStyle = `
    background-color: gray;
    color: white;
    border: 1px solid gray;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  `;
  
  /* Position relative to button */
  clearBtn.style.position = 'relative';
  clearBtn.appendChild(confirmationElement);
  
  /* Apply styles */
  const messageDiv = confirmationElement.querySelector('.confirmation-message');
  const buttonsDiv = confirmationElement.querySelector('.confirmation-buttons');
  const yesBtn = confirmationElement.querySelector('.confirm-yes');
  const noBtn = confirmationElement.querySelector('.confirm-no');
  
  messageDiv.style.cssText = messageStyle;
  buttonsDiv.style.cssText = buttonsStyle;
  yesBtn.style.cssText = yesButtonStyle;
  noBtn.style.cssText = noButtonStyle;
  
  /* Add hover effects */
  yesBtn.addEventListener('mouseenter', () => {
    yesBtn.style.backgroundColor = 'red';
    yesBtn.style.color = 'white';
    yesBtn.style.borderColor = 'red';
  });
  
  yesBtn.addEventListener('mouseleave', () => {
    yesBtn.style.backgroundColor = 'black';
    yesBtn.style.color = 'white';
    yesBtn.style.borderColor = 'black';
  });
  
  noBtn.addEventListener('mouseenter', () => {
    noBtn.style.backgroundColor = 'white';
    noBtn.style.color = 'black';
    noBtn.style.borderColor = 'white';
  });
  
  noBtn.addEventListener('mouseleave', () => {
    noBtn.style.backgroundColor = 'gray';
    noBtn.style.color = 'white';
    noBtn.style.borderColor = 'gray';
  });
  
  /* Add click handlers */
  yesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearConversationHistory();
    confirmationElement.remove();
    showClearChatMessage();
  });
  
  noBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmationElement.remove();
  });
  
  /* Show confirmation with animation */
  setTimeout(() => {
    confirmationElement.style.opacity = '1';
  }, 50);
  
  /* Auto-hide after 10 seconds if no action */
  setTimeout(() => {
    if (confirmationElement.parentNode) {
      confirmationElement.style.opacity = '0';
      setTimeout(() => {
        if (confirmationElement.parentNode) {
          confirmationElement.remove();
        }
      }, 300);
    }
  }, 10000);
}

/* Show clear chat success message */
function showClearChatMessage() {
  const clearBtn = document.getElementById("clearChatBtn");
  
  /* Remove any existing message */
  const existingMessage = document.querySelector('.clear-chat-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  /* Create message element */
  const messageElement = document.createElement('div');
  messageElement.className = 'clear-chat-message';
  messageElement.innerHTML = 'Conversation cleared!';
  messageElement.style.cssText = `
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 10px;
    background-color: var(--loreal-dark);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  `;
  
  /* Position relative to button */
  clearBtn.style.position = 'relative';
  clearBtn.appendChild(messageElement);
  
  /* Show message with animation */
  setTimeout(() => {
    messageElement.style.opacity = '1';
  }, 50);
  
  /* Hide message after 2 seconds */
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 300);
  }, 2000);
}

/* Generate Routine button handler */
document.getElementById("generateRoutine").addEventListener("click", async () => {
  const generateBtn = document.getElementById("generateRoutine");
  const userInput = document.getElementById("userInput");
  
  /* Disable button and inputs during generation */
  generateBtn.disabled = true;
  userInput.disabled = true;
  
  /* Get selected products */
  const selectedProductsArray = Array.from(selectedProducts).map(id => 
    allProducts.find(product => product.id === id)
  ).filter(Boolean);
  
  if (selectedProductsArray.length === 0) {
    displayChatMessage("Please select some products first so I can create a personalized routine for you!", "ai");
    generateBtn.disabled = false;
    userInput.disabled = false;
    return;
  }
  
  /* Show user message */
  displayChatMessage("Please create a beauty routine using my selected products", "user");
  
  /* Show loading and generate routine */
  showTypingIndicator();
  
  try {
    const routinePrompt = "Create a complete daily beauty routine using the selected products. Include morning and evening steps with clear instructions.";
    const response = await generateAIResponse(routinePrompt, selectedProductsArray);
    
    /* Remove typing indicator before showing response */
    removeTypingIndicator();
    
    /* Display AI response */
    displayChatMessage(response, "ai");
  } catch (error) {
    console.error("Error generating routine:", error);
    removeTypingIndicator();
    displayChatMessage("I apologize, but I'm having trouble creating your routine right now. Please try again in a moment.", "ai");
  } finally {
    /* Re-enable button and inputs after generation completes */
    generateBtn.disabled = false;
    userInput.disabled = false;
  }
});

/* RTL Mode Functions */
function setRTLMode(isRTL) {
  const html = document.documentElement;
  const rtlToggleText = document.getElementById('rtlToggleText');
  
  if (isRTL) {
    html.setAttribute('dir', 'rtl');
    html.setAttribute('lang', 'ar');
    rtlToggleText.textContent = 'English';
    /* Update placeholder text for RTL */
    document.getElementById('searchInput').placeholder = 'البحث عن المنتجات...';
    document.getElementById('userInput').placeholder = 'اكتب رسالتك هنا...';
  } else {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', 'en');
    rtlToggleText.textContent = 'عربي';
    /* Restore English placeholder text */
    document.getElementById('searchInput').placeholder = 'Search products...';
    document.getElementById('userInput').placeholder = 'Type your message here...';
  }
  
  /* Save preference */
  localStorage.setItem(STORAGE_KEYS.RTL_MODE, isRTL.toString());
}

function toggleRTLMode() {
  const html = document.documentElement;
  const isCurrentlyRTL = html.getAttribute('dir') === 'rtl';
  setRTLMode(!isCurrentlyRTL);
}

/* RTL Toggle Button Event Listener */
document.getElementById('rtlToggle').addEventListener('click', toggleRTLMode);
