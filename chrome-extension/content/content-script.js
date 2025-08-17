// Content Script - Handles text replacement in web pages
(function() {
  'use strict';

  // Configuration
  const DEBOUNCE_DELAY = 100; // ms
  const MAX_SNIPPET_LENGTH = 10000;
  const SNIPPET_TRIGGER_REGEX = /(\S+)\s$/; // Matches word followed by space

  // State
  let snippetsCache = new Map();
  let expansionEnabled = true;
  let lastProcessedText = '';
  let debounceTimer = null;
  let isProcessing = false;

  // Initialize
  async function init() {
    console.log('Smart Snippets: Content script initialized');
    
    // Load initial settings
    await loadSettings();
    
    // Load cached snippets
    await loadSnippets();
    
    // Set up listeners
    setupListeners();
    
    // Attach to all editable elements
    attachToEditableElements();
  }

  // Load settings from storage
  async function loadSettings() {
    const settings = await chrome.storage.local.get(['expansionEnabled']);
    expansionEnabled = settings.expansionEnabled !== false;
  }

  // Load snippets from background
  async function loadSnippets() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_SNIPPETS' });
      if (response.success && response.snippets) {
        snippetsCache.clear();
        response.snippets.forEach(snippet => {
          snippetsCache.set(snippet.keyName, snippet);
        });
        console.log(`Loaded ${snippetsCache.size} snippets`);
      }
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
  }

  // Set up message listeners
  function setupListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SNIPPET_UPDATED':
          handleSnippetUpdate(message.snippet);
          break;
        case 'SNIPPET_REMOVED':
          handleSnippetRemoval(message.keyName);
          break;
        case 'EXPANSION_TOGGLED':
          expansionEnabled = message.enabled;
          console.log(`Expansion ${expansionEnabled ? 'enabled' : 'disabled'}`);
          break;
        case 'AUTH_STATE_CHANGED':
          if (message.authenticated) {
            loadSnippets();
          } else {
            snippetsCache.clear();
          }
          break;
      }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.expansionEnabled) {
        expansionEnabled = changes.expansionEnabled.newValue;
      }
    });
  }

  // Handle snippet update
  function handleSnippetUpdate(snippet) {
    snippetsCache.set(snippet.keyName, snippet);
    console.log(`Snippet updated: ${snippet.keyName}`);
  }

  // Handle snippet removal
  function handleSnippetRemoval(keyName) {
    snippetsCache.delete(keyName);
    console.log(`Snippet removed: ${keyName}`);
  }

  // Attach listeners to all editable elements
  function attachToEditableElements() {
    // Input and textarea elements
    document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea').forEach(element => {
      attachToElement(element);
    });

    // ContentEditable elements
    document.querySelectorAll('[contenteditable="true"]').forEach(element => {
      attachToElement(element);
    });

    // Monitor for dynamically added elements
    observeNewElements();
  }

  // Attach expansion listener to an element
  function attachToElement(element) {
    // Skip if already attached
    if (element.dataset.snippetsAttached) return;
    
    element.dataset.snippetsAttached = 'true';
    
    // Add input listener with debouncing
    element.addEventListener('input', (event) => {
      if (!expansionEnabled || isProcessing) return;
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processInput(element, event);
      }, DEBOUNCE_DELAY);
    });

    // Add keydown listener for special handling
    element.addEventListener('keydown', (event) => {
      if (!expansionEnabled) return;
      
      // Handle Tab key for expansion
      if (event.key === 'Tab') {
        const expanded = tryExpandAtCursor(element);
        if (expanded) {
          event.preventDefault();
        }
      }
    });
  }

  // Process input for snippet expansion
  async function processInput(element, event) {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      
      const text = getElementText(element);
      const cursorPosition = getCursorPosition(element);
      
      // Check for snippet trigger (word followed by space)
      const beforeCursor = text.substring(0, cursorPosition);
      const match = beforeCursor.match(SNIPPET_TRIGGER_REGEX);
      
      if (match) {
        const potentialKey = match[1];
        const snippet = snippetsCache.get(potentialKey);
        
        if (snippet) {
          await expandSnippet(element, snippet, match.index, cursorPosition);
        }
      }
    } finally {
      isProcessing = false;
    }
  }

  // Try to expand snippet at cursor position
  function tryExpandAtCursor(element) {
    const text = getElementText(element);
    const cursorPosition = getCursorPosition(element);
    
    // Find the word before cursor
    const beforeCursor = text.substring(0, cursorPosition);
    const words = beforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    if (lastWord) {
      const snippet = snippetsCache.get(lastWord);
      if (snippet) {
        const startIndex = beforeCursor.lastIndexOf(lastWord);
        expandSnippet(element, snippet, startIndex, cursorPosition);
        return true;
      }
    }
    
    return false;
  }

  // Expand a snippet
  async function expandSnippet(element, snippet, startIndex, endIndex) {
    const text = getElementText(element);
    const keyLength = snippet.keyName.length;
    
    // Calculate replacement positions
    const replaceStart = startIndex;
    const replaceEnd = startIndex + keyLength + 1; // +1 for the space
    
    // Build new text
    const newText = text.substring(0, replaceStart) + 
                   snippet.value + 
                   text.substring(replaceEnd);
    
    // Update element
    setElementText(element, newText);
    
    // Set cursor position after expanded text
    const newCursorPosition = replaceStart + snippet.value.length;
    setCursorPosition(element, newCursorPosition);
    
    // Track usage
    chrome.runtime.sendMessage({
      type: 'TRACK_USAGE',
      snippetId: snippet.id
    });
    
    // Visual feedback
    showExpansionFeedback(element);
    
    console.log(`Expanded: ${snippet.keyName} -> ${snippet.value.substring(0, 50)}...`);
  }

  // Get text from element
  function getElementText(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.value;
    } else {
      return element.textContent || '';
    }
  }

  // Set text in element
  function setElementText(element, text) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = text;
      // Trigger input event for frameworks
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      element.textContent = text;
      // Trigger input event for contenteditable
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Get cursor position
  function getCursorPosition(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.selectionStart;
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return preCaretRange.toString().length;
      }
      return 0;
    }
  }

  // Set cursor position
  function setCursorPosition(element, position) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.setSelectionRange(position, position);
      element.focus();
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Find the text node and offset
      let currentPos = 0;
      let node = element.firstChild;
      
      while (node && currentPos < position) {
        const nodeLength = node.textContent ? node.textContent.length : 0;
        if (currentPos + nodeLength >= position) {
          range.setStart(node, position - currentPos);
          range.setEnd(node, position - currentPos);
          break;
        }
        currentPos += nodeLength;
        node = node.nextSibling;
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      element.focus();
    }
  }

  // Show visual feedback for expansion
  function showExpansionFeedback(element) {
    element.style.transition = 'background-color 0.3s';
    const originalBackground = element.style.backgroundColor;
    element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
    }, 300);
  }

  // Observe for new editable elements
  function observeNewElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is editable
            if (isEditableElement(node)) {
              attachToElement(node);
            }
            
            // Check for editable children
            const editables = node.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea, [contenteditable="true"]');
            editables.forEach(attachToElement);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Check if element is editable
  function isEditableElement(element) {
    if (!element.tagName) return false;
    
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
      const type = element.type.toLowerCase();
      return type === 'text' || type === 'search' || type === 'email';
    }
    if (element.contentEditable === 'true') return true;
    
    return false;
  }

  // Handle special sites with custom editors
  function handleSpecialSites() {
    const hostname = window.location.hostname;
    
    // Gmail
    if (hostname.includes('mail.google.com')) {
      handleGmailEditor();
    }
    
    // Google Docs
    if (hostname.includes('docs.google.com')) {
      handleGoogleDocs();
    }
    
    // Slack
    if (hostname.includes('slack.com')) {
      handleSlackEditor();
    }
    
    // Add more special cases as needed
  }

  // Handle Gmail's custom editor
  function handleGmailEditor() {
    // Gmail uses contenteditable divs with specific classes
    const checkForComposer = setInterval(() => {
      const composers = document.querySelectorAll('[contenteditable="true"][role="textbox"]');
      composers.forEach(attachToElement);
      
      if (composers.length > 0) {
        clearInterval(checkForComposer);
      }
    }, 1000);
  }

  // Handle Google Docs (more complex, requires special handling)
  function handleGoogleDocs() {
    console.log('Google Docs detected - special handling may be needed');
    // Google Docs uses a canvas-based editor, which requires different approach
    // This would need more complex implementation
  }

  // Handle Slack's custom editor
  function handleSlackEditor() {
    const checkForEditor = setInterval(() => {
      const editors = document.querySelectorAll('[data-qa="message_input"]');
      editors.forEach(attachToElement);
      
      if (editors.length > 0) {
        clearInterval(checkForEditor);
      }
    }, 1000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle special sites
  handleSpecialSites();
})();