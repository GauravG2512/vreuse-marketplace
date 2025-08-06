// API Base URL
const API_URL = 'https://vreuse-marketplace-gg.onrender.com/api';

// === DOM Element Selectors ===
const welcomeMessage = document.getElementById('welcome-message');
const showAddItemBtn = document.getElementById('show-add-item');
const showHomeBtn = document.getElementById('show-home');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const logoutBtn = document.getElementById('logout-button');
const showProfileBtn = document = document.getElementById('show-profile');
const showMessagesBtn = document.getElementById('show-messages');

const vreuseLogo = document.getElementById('vreuse-logo');
const vitLogo = document.getElementById('vit-logo');

const authContainer = document.getElementById('auth-container');
const addItemContainer = document.getElementById('add-item-container');
const marketplaceContainer = document.getElementById('marketplace-container');
const profileContainer = document.getElementById('profile-container');
const messagesInboxContainer = document.getElementById('messages-inbox-container');
const chatContainer = document.getElementById('chat-container');
const itemList = document.getElementById('item-list');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const sortBy = document.getElementById('sort-by');

// Chat and Socket Variables
let socket;
let currentChatId = null; // Stores the ID of the currently active chat
let currentChatPartnerId = null; // Stores the ID of the current chat partner
let myUserId = null; // Stores the logged-in user's ID

// === HTML Templates ===
const loginFormTemplate = `
    <form id="login-form" class="auth-form">
        <h2>Login</h2>
        <div id="login-error" class="error-message"></div>
        <label for="login-email">VIT Email:</label>
        <input type="email" id="login-email" required>
        <label for="login-password">Password:</label>
        <input type="password" id="login-password" required>
        <button type="submit">Login</button>
    </form>
`;

const registerFormTemplate = `
    <form id="register-form" class="auth-form">
        <h2>Register</h2>
        <div id="register-error" class="error-message"></div>
        <label for="register-email">VIT Email:</label>
        <input type="email" id="register-email" required>
        <label for="register-password">Password:</label>
        <input type="password" id="register-password" required>
        <button type="submit">Register</button>
    </form>
`;

const addItemFormTemplate = `
    <form id="add-item-form" class="auth-form" enctype="multipart/form-data">
        <h2>Post a New Item</h2>
        <div id="add-item-error" class="error-message"></div>
        <label for="item-title">Title:</label>
        <input type="text" id="item-title" name="title" required>

        <label for="item-description">Description:</label>
        <textarea id="item-description" name="description" rows="4" required></textarea>

        <label for="item-category">Category:</label>
        <select id="item-category" name="category" required>
            <option value="" disabled selected>Select a category</option>
            <option value="Books">Books</option>
            <option value="Lab Kits">Lab Kits</option>
            <option value="Electronics">Electronics</option>
            <option value="Free Stuff">Free Stuff</option>
            <option value="Other">Other</option>
        </select>

        <label for="item-price">Price (₹):</label>
        <input type="number" id="item-price" name="price" required>

        <label for="item-pickup">Pickup Location:</label>
        <input type="text" id="item-pickup" name="pickupLocation" required>

        <label for="item-image">Upload Image:</label>
        <input type="file" id="item-image" name="image" required>

        <button type="submit">Post Item</button>
    </form>
`;

const chatTemplate = (chatPartnerEmail) => `
    <div class="chat-header">
        <h2 id="chat-with-user">Chat with ${chatPartnerEmail.split('@')[0]}</h2>
        <button id="close-chat" class="nav-button">Close</button>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input">
        <input type="text" id="chat-input-text" placeholder="Type a message...">
        <button id="send-message-button" class="nav-button">Send</button>
    </div>
`;

// === Socket Initialization ===
const initializeSocket = (userId) => {
    // Check if socket is already initialized to prevent multiple connections
    if (socket && socket.connected) {
        console.log('Socket already connected.');
        return;
    }

    socket = io('http://localhost:5004'); // Connect to your backend Socket.io server

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('joinRoom', userId); // Emit joinRoom with the user's ID
    });

    socket.on('receiveMessage', (message) => {
        // FIX: Only append the message if it's from a different sender
        // or if the current user is not the sender (i.e., it's a message from another user)
        if (message.sender._id !== myUserId) {
            if (currentChatId && message.chat === currentChatId) {
                appendMessageToChat(message);
            } else {
                // If the message is for a different chat, and the inbox is visible, refresh it.
                // This ensures the last message preview is updated.
                if (messagesInboxContainer.style.display === 'block') {
                    fetchConversations();
                }
                // Optionally, you could add a visual notification here for new messages
                // in other conversations (e.g., a badge on the "Messages" button).
                console.log("New message received for another chat:", message);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected.');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
    });
};

// === UI State Management ===
const renderPage = (page) => {
    // Hide all main content sections
    authContainer.style.display = 'none';
    addItemContainer.style.display = 'none';
    marketplaceContainer.style.display = 'none';
    profileContainer.style.display = 'none';
    messagesInboxContainer.style.display = 'none';
    chatContainer.style.display = 'none';

    // Show the requested page and load its content/listeners
    if (page === 'login') {
        authContainer.style.display = 'flex';
        authContainer.innerHTML = loginFormTemplate;
        setupAuthFormListeners();
    } else if (page === 'register') {
        authContainer.style.display = 'flex';
        authContainer.innerHTML = registerFormTemplate;
        setupAuthFormListeners();
    } else if (page === 'addItem') {
        addItemContainer.style.display = 'flex';
        addItemContainer.innerHTML = addItemFormTemplate;
        setupAddItemFormListener();
    } else if (page === 'home') {
        marketplaceContainer.style.display = 'block';
        fetchItems(); // Load items when navigating to home
    } else if (page === 'profile') {
        profileContainer.style.display = 'block';
        fetchUserProfile(); // Load user profile when navigating to profile
    } else if (page === 'messages') {
        messagesInboxContainer.style.display = 'block';
        fetchConversations(); // Load conversations when navigating to messages
    } else if (page === 'chat') {
        chatContainer.style.display = 'flex';
        // The chatTemplate is already set in startChat, just need to setup listeners
        setupChatListeners();
    }
};

const handleAuthenticatedState = async () => {
    const userEmail = localStorage.getItem('userEmail');
    welcomeMessage.textContent = `Welcome, ${userEmail.split('@')[0]}!`;
    welcomeMessage.style.display = 'block';

    // Show authenticated navigation buttons
    showAddItemBtn.style.display = 'block';
    showHomeBtn.style.display = 'block';
    showProfileBtn.style.display = 'block';
    showMessagesBtn.style.display = 'block';
    logoutBtn.style.display = 'block';

    // Hide unauthenticated navigation buttons
    showLoginBtn.style.display = 'none';
    showRegisterBtn.style.display = 'none';
    
    // Change logo for authenticated state
    vreuseLogo.style.display = 'none';
    vitLogo.style.display = 'block';

    // Initialize socket connection after getting user ID
    const user = await fetchUserProfileData();
    if (user) {
        myUserId = user._id; // Store the current user's ID
        initializeSocket(myUserId);
    }

    renderPage('home'); // Redirect to home page after successful authentication
};

const handleUnauthenticatedState = () => {
    // Hide authenticated navigation buttons
    welcomeMessage.style.display = 'none';
    showAddItemBtn.style.display = 'none';
    showHomeBtn.style.display = 'none';
    showProfileBtn.style.display = 'none';
    showMessagesBtn.style.display = 'none';
    logoutBtn.style.display = 'none';

    // Show unauthenticated navigation buttons
    showLoginBtn.style.display = 'block';
    showRegisterBtn.style.display = 'block';

    // Change logo for unauthenticated state
    vreuseLogo.style.display = 'block';
    vitLogo.style.display = 'none';

    renderPage('login'); // Redirect to login page
};

// === Authentication & Form Logic ===
const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            if (response.ok && user) {
                localStorage.setItem('userEmail', user.email);
                // localStorage.setItem('userId', user._id); // myUserId is now set globally
                handleAuthenticatedState();
                return;
            }
        } catch (error) {
            console.error("Failed to verify token or fetch user profile:", error);
        }
    }
    handleUnauthenticatedState();
};

const setupAuthFormListeners = () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await handleAuthSubmission('login', email, password);
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            await handleAuthSubmission('register', email, password);
        });
    }
};

const handleAuthSubmission = async (type, email, password) => {
    const errorElement = document.getElementById(`${type}-error`);
    try {
        const response = await fetch(`${API_URL}/user/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (response.ok) {
            errorElement.textContent = '';
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            handleAuthenticatedState(); // Re-authenticate and initialize socket
        } else {
            errorElement.textContent = data.error || `Failed to ${type}.`;
        }
    } catch (error) {
        errorElement.textContent = 'Could not connect to the server. Please try again.';
        console.error(`Error during ${type}:`, error);
    }
};

const fetchUserProfileData = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error("Failed to fetch user profile data:", error);
        }
    }
    return null;
};

// === User Profile Logic ===
const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    profileContainer.innerHTML = '<p>Loading profile...</p>';
    if (!token) {
        profileContainer.innerHTML = '<p>Please log in to view your profile.</p>';
        return;
    }

    try {
        const user = await fetchUserProfileData();
        if (user) {
            displayUserProfile(user);
        } else {
            profileContainer.innerHTML = `<p style="color: red;">Error loading profile. User data not found.</p>`;
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        profileContainer.innerHTML = `<p style="color: red;">Error loading profile. Please try again later.</p>`;
    }
};

const displayUserProfile = (user) => {
    profileContainer.innerHTML = `
        <h2>User Profile</h2>
        <div class="profile-info">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${user._id}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
    `;
};

// === Item Fetching & Display ===
const fetchItems = async () => {
    itemList.innerHTML = '<p>Loading items...</p>';

    const searchTerm = searchInput.value;
    const category = categoryFilter.value;
    const sortOrder = sortBy.value;

    let url = `${API_URL}/items`;
    const params = new URLSearchParams();

    if (searchTerm) {
        params.append('search', searchTerm);
    }
    if (category) {
        params.append('category', category);
    }
    if (sortOrder) {
        params.append('sort', sortOrder);
    }

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) { throw new Error('Network response was not ok'); }
        const items = await response.json();
        if (items.length === 0) {
            itemList.innerHTML = '<p>No items have been posted yet.</p>';
        } else {
            displayItems(items);
        }
    } catch (error) {
        console.error('Error fetching items:', error);
        itemList.innerHTML = `<p style="color: red;">Error loading items. Please try again later.</p>`;
    }
};

const displayItems = (items) => {
    itemList.innerHTML = '';
    const loggedInUserEmail = localStorage.getItem('userEmail');
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('item-listing');
        
        let actionsHtml = '';
        // Only show contact button if the item is not posted by the current user
        if (loggedInUserEmail && item.user.email !== loggedInUserEmail) {
            actionsHtml += `<button class="contact-button" data-poster-id="${item.user._id}" data-poster-email="${item.user.email}">Contact Poster</button>`;
        }
        
        // Show remove button only if the item is posted by the current user
        if (loggedInUserEmail && item.user.email === loggedInUserEmail) {
            actionsHtml += `<button class="remove-button" data-item-id="${item._id}">
                                <i class="fa fa-remove"></i> Remove
                            </button>`;
        }
        
        itemElement.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <p><strong>Price:</strong> ₹${item.price}</p>
            <img src="/uploads/${item.image}" alt="${item.title}" onerror="this.onerror=null;this.src='https://placehold.co/200x150/cccccc/333333?text=No+Image';">
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Pickup Location:</strong> ${item.pickupLocation}</p>
            <p><strong>Posted By:</strong> ${item.user.email.split('@')[0]}</p>
            <div class="item-actions">
                ${actionsHtml}
            </div>
        `;
        itemList.appendChild(itemElement);
    });

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.getAttribute('data-item-id');
            const token = localStorage.getItem('token');
            const itemElementToRemove = e.target.closest('.item-listing');

            // Use a custom modal or confirmation message instead of alert/confirm
            if (confirm('Are you sure you want to remove this item?')) { // For now, using confirm for simplicity
                try {
                    const response = await fetch(`${API_URL}/items/${itemId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        itemElementToRemove.remove();
                        // Optionally, show a success message to the user
                    } else {
                        const data = await response.json();
                        alert(`Error: ${data.error}`); // Use custom modal instead of alert
                    }
                } catch (error) {
                    alert('Could not delete the item. Please try again.'); // Use custom modal instead of alert
                    console.error('Error deleting item:', error);
                }
            }
        });
    });

    // Add event listeners to the new contact buttons
    document.querySelectorAll('.contact-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const posterId = e.target.getAttribute('data-poster-id');
            const posterEmail = e.target.getAttribute('data-poster-email');
            if (myUserId && posterId !== myUserId) { // Prevent chatting with self
                startChat(posterId, posterEmail);
            } else {
                alert("You cannot chat with yourself."); // Use custom modal instead of alert
            }
        });
    });
};

// === Add Item Form Logic ===
const setupAddItemFormListener = () => {
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            const errorElement = document.getElementById('add-item-error');

            if (!token) {
                errorElement.textContent = 'You must be logged in to post an item.';
                return;
            }
            
            const formData = new FormData(addItemForm);

            try {
                const response = await fetch(`${API_URL}/items`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                if (response.ok) {
                    addItemForm.reset();
                    // After adding item, redirect to home to see the new item
                    renderPage('home');
                } else {
                    const data = await response.json();
                    errorElement.textContent = data.error || 'Failed to post item.';
                }
            } catch (error) {
                errorElement.textContent = 'Could not connect to the server.';
                console.error('Error adding item:', error);
            }
        });
    }
};

// === Chat Functions ===
const startChat = async (partnerId, partnerEmail) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please log in to start a chat."); // Use custom modal instead of alert
        return;
    }

    // Prevent starting a chat with yourself
    if (myUserId === partnerId) {
        alert("You cannot chat with yourself."); // Use custom modal instead of alert
        return;
    }

    try {
        const response = await fetch(`${API_URL}/chat/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ partnerId })
        });

        if (response.ok) {
            const data = await response.json();
            currentChatId = data.chatId;
            currentChatPartnerId = partnerId; // Store partner ID for future use

            // Populate the chat container with the template and partner email
            chatContainer.innerHTML = chatTemplate(partnerEmail);
            document.getElementById('chat-with-user').textContent = `Chat with ${partnerEmail.split('@')[0]}`;
            
            if (data.messages && data.messages.length > 0) {
                populateChatMessages(data.messages);
            } else {
                // Clear messages if no previous messages exist
                document.getElementById('chat-messages').innerHTML = '<p style="text-align: center; color: #666;">Start a new conversation!</p>';
            }
            
            setupChatListeners(); // Attach event listeners to the new chat elements
            renderPage('chat'); // Display the chat page
        } else {
            const errorData = await response.json();
            console.error('Failed to start chat:', errorData.error);
            alert(`Failed to start chat: ${errorData.error}`); // Use custom modal instead of alert
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        alert('Error starting chat. Please try again.'); // Use custom modal instead of alert
    }
};

const populateChatMessages = (messages) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    chatMessagesContainer.innerHTML = ''; // Clear existing messages
    
    messages.forEach(message => {
        const isSent = message.sender._id === myUserId; // Determine if message was sent by current user
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', isSent ? 'sent' : 'received');
        messageElement.textContent = message.text;
        chatMessagesContainer.appendChild(messageElement);
    });
    
    // Scroll to the bottom of the chat to show the latest messages
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

const appendMessageToChat = (message) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    if (!chatMessagesContainer) return; // Ensure chat container exists

    // Remove "Start a new conversation!" message if it exists
    const placeholder = chatMessagesContainer.querySelector('p[style*="text-align: center"]');
    if (placeholder) {
        placeholder.remove();
    }
    
    const isSent = message.sender._id === myUserId;
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', isSent ? 'sent' : 'received');
    messageElement.textContent = message.text;
    chatMessagesContainer.appendChild(messageElement);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
};

const setupChatListeners = () => {
    const sendButton = document.getElementById('send-message-button');
    const chatInput = document.getElementById('chat-input-text');
    const closeButton = document.getElementById('close-chat');

    if (sendButton && chatInput) {
        // **FIX:** Reassign onclick and onkeypress to prevent multiple listeners
        // This ensures that only one listener is active at any given time.
        sendButton.onclick = async () => {
            const messageText = chatInput.value.trim();
            if (messageText && currentChatId && myUserId) {
                await sendMessage(messageText);
                chatInput.value = ''; // Clear input field
            }
        };

        chatInput.onkeypress = async (e) => {
            if (e.key === 'Enter') {
                const messageText = chatInput.value.trim();
                if (messageText && currentChatId && myUserId) {
                    await sendMessage(messageText);
                    chatInput.value = ''; // Clear input field
                }
            }
        };
    }

    if (closeButton) {
        closeButton.onclick = () => {
            currentChatId = null; // Reset current chat ID
            currentChatPartnerId = null; // Reset current chat partner ID
            renderPage('messages'); // Go back to messages inbox
        };
    }
};

const sendMessage = async (messageText) => {
    // Ensure we have the necessary IDs and socket connection
    if (!socket || !socket.connected || !currentChatId || !myUserId) {
        console.error('Cannot send message: Socket not connected or chat/user ID missing.');
        alert('Cannot send message. Please refresh and try again.'); // Use custom modal
        return;
    }

    try {
        // Emit the message through Socket.io
        socket.emit('sendMessage', {
            chatId: currentChatId,
            senderId: myUserId,
            text: messageText
        });

        // Optimistically append the message to the current user's chat UI
        // This makes the UI feel more responsive as the message appears instantly.
        appendMessageToChat({
            chat: currentChatId,
            sender: { _id: myUserId, email: localStorage.getItem('userEmail') }, // Mock sender for immediate display
            text: messageText,
            createdAt: new Date().toISOString() // Add a timestamp for consistent message object
        });

    } catch (error) {
        console.error('Error emitting message via socket:', error);
        alert('Error sending message. Please try again.'); // Use custom modal
    }
};

const fetchConversations = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        // If no token, user is not logged in, so no conversations to fetch
        const conversationsList = document.getElementById('conversations-list');
        if (conversationsList) {
            conversationsList.innerHTML = '<p>Please log in to view your conversations.</p>';
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/chat/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayConversations(data.conversations);
        } else {
            const errorData = await response.json();
            console.error('Failed to fetch conversations:', errorData.error);
            const conversationsList = document.getElementById('conversations-list');
            if (conversationsList) {
                conversationsList.innerHTML = `<p style="color: red;">Error loading conversations: ${errorData.error}</p>`;
            }
        }
    } catch (error) {
        console.error('Error fetching conversations:', error);
        const conversationsList = document.getElementById('conversations-list');
        if (conversationsList) {
            conversationsList.innerHTML = `<p style="color: red;">Could not connect to the server to load conversations.</p>`;
        }
    }
};

const displayConversations = (conversations) => {
    const conversationsList = document.getElementById('conversations-list');
    conversationsList.innerHTML = ''; // Clear existing list

    if (conversations.length === 0) {
        conversationsList.innerHTML = '<p>No conversations yet. Start by contacting a poster from the marketplace!</p>';
        return;
    }

    conversations.forEach(conversation => {
        const conversationElement = document.createElement('div');
        conversationElement.classList.add('conversation-item');
        // Ensure chatPartner exists before trying to access its email
        const chatPartnerEmail = conversation.chatPartner ? conversation.chatPartner.email.split('@')[0] : 'Unknown User';
        conversationElement.innerHTML = `
            <h3>${chatPartnerEmail}</h3>
            <p>${conversation.lastMessage || 'No messages yet'}</p>
            <p style="font-size: 0.8em; color: #999;">${new Date(conversation.updatedAt).toLocaleString()}</p>
        `;
        // Attach click listener to start chat with the partner
        conversationElement.addEventListener('click', () => {
            if (conversation.chatPartner) {
                startChat(conversation.chatPartner._id, conversation.chatPartner.email);
            } else {
                alert("Cannot start chat with an unknown user."); // Use custom modal
            }
        });
        conversationsList.appendChild(conversationElement);
    });
};

// === Main Application Flow ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuth(); // Check authentication status on page load
    
    // Add event listeners for search and filter inputs
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            fetchItems();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            fetchItems();
        });
    }
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            fetchItems();
        });
    }
});

// === UI Navigation ===
showLoginBtn.addEventListener('click', () => renderPage('login'));
showRegisterBtn.addEventListener('click', () => renderPage('register'));
showAddItemBtn.addEventListener('click', () => renderPage('addItem'));
showHomeBtn.addEventListener('click', () => renderPage('home'));
showProfileBtn.addEventListener('click', () => renderPage('profile'));
showMessagesBtn.addEventListener('click', () => renderPage('messages'));

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    // Disconnect socket if it exists
    if (socket) {
        socket.disconnect();
        socket = null; // Clear the socket instance
    }
    myUserId = null; // Clear user ID
    handleUnauthenticatedState(); // Transition to unauthenticated state
});
