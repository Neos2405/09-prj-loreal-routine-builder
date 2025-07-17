/* Get references to DOM elements */
const searchInput = document.getElementById("searchInput");
const categoryFilterBtn = document.getElementById("categoryFilterBtn");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Store all products globally to avoid repeated API calls */
let allProducts = [];
let currentCategoryFilter = "";
let selectedProducts = new Set(); // Store selected product IDs
let currentFilteredProducts = []; // Store currently filtered products
let visibleProductsCount = 6; // Number of products to show initially
const PRODUCTS_PER_PAGE = 6; // Number of products to add each time "Show More" is clicked

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

  selectedProductsList.innerHTML = selectedProductsArray
    .map(product => `
      <span class="badge selected-product-tag" data-product-id="${product.id}">
        ${product.name}
        <button type="button" class="btn-close ms-2" aria-label="Remove ${product.name}"></button>
      </span>
    `)
    .join('');

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
  const products = await loadProducts();
  currentFilteredProducts = products;
  visibleProductsCount = PRODUCTS_PER_PAGE;
  displayProducts(products);
  updateSelectedProductsDisplay(); // Initialize empty state
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

/* Generate AI response using OpenAI API */
async function generateAIResponse(userMessage, selectedProducts) {
  /* Create context about selected products */
  const productContext = selectedProducts.length > 0 
    ? `Selected products: ${selectedProducts.map(p => `${p.name} by ${p.brand} (${p.category})`).join(", ")}`
    : "No products currently selected";
  
  /* Create the system message for L'Oreal brand context */
  const systemMessage = `You are a friendly and helpful L'Oreal beauty advisor. Your role is to provide personalized beauty and skincare routine recommendations. 

IMPORTANT GUIDELINES:
- Be friendly, helpful, sharp, and on point
- Focus on L'Oreal brand values of beauty, confidence, and self-expression
- Provide clear, practical advice that users can easily follow
- Format responses with bold headers and regular text for organized sections
- Do not use special characters like asterisks, bullets, or hashtags
- Use emojis appropriately to create emotional connection and express warmth
- Keep responses concise but informative
- When products are selected, incorporate them into your recommendations
- If no products are selected, suggest suitable L'Oreal product categories
- Always end with encouragement about their beauty journey

RESPONSE FORMAT:
Use HTML formatting with <h3> for main headers, <h4> for sub-headers, and <p> for paragraphs.
Example: <h3>Your Personalized Beauty Routine ✨</h3><h4>Morning Steps 🌅</h4><p>Start with...</p>
Keep it clean and easy to read with emojis to enhance emotional connection.`;

  const messages = [
    {
      role: "system",
      content: systemMessage
    },
    {
      role: "user", 
      content: `${userMessage}\n\nContext: ${productContext}`
    }
  ];

  /* Make API call to OpenAI */
  const response = await fetch(OPENAI_CONFIG.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_CONFIG.apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      messages: messages,
      max_tokens: OPENAI_CONFIG.maxTokens,
      temperature: OPENAI_CONFIG.temperature
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* Display chat message in the chat window */
function displayChatMessage(message, sender) {
  const chatWindow = document.getElementById("chatWindow");
  
  /* Create message element */
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message ${sender}`;
  
  if (sender === "user") {
    messageElement.innerHTML = message;
  } else {
    messageElement.innerHTML = message;
  }
  
  /* Add message to chat window */
  chatWindow.appendChild(messageElement);
  
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
      <span class="text-muted ms-2">Creating your personalized routine...</span>
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
