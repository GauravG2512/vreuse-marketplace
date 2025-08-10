// D:\\Vreuse\\frontend\\app.js
// API Base URL
const API_URL = 'https://vreuse-marketplace-gg.onrender.com/api'; 

// === DOM Element Selectors ===
const welcomeMessage = document.getElementById('welcome-message');
const showAddItemBtn = document.getElementById('show-add-item');
const showHomeBtn = document.getElementById('show-home');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const logoutBtn = document.getElementById('logout-button');
const showProfileBtn = document.getElementById('show-profile');
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
let currentChatId = null;
let currentChatPartnerId = null;
let myUserId = null;

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
        <label for="register-name">Name:</label>
        <input type="text" id="register-name" required>
        <label for="register-email">VIT Email:</label>
        <input type="email" id="register-email" required>
        <label for="register-role">Role:</label>
        <select id="register-role" required>
            <option value="" disabled selected>Select your role</option>
            <option value="Student">Student</option>
            <option value="Teacher">Teacher</option>
        </select>
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
    if (socket && socket.connected) {
        console.log('Socket already connected.');
        return;
    }

    // Use the same base URL as the API for the socket connection
    const socketUrl = API_URL.replace('/api', '');
    socket = io(socketUrl);

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('joinRoom', userId);
    });

socket.off('receiveMessage');
socket.on('receiveMessage', (message) => {
    if (message.sender._id !== myUserId) {
        if (currentChatId && message.chat === currentChatId) {
            appendMessageToChat(message);
        } else {
            if (messagesInboxContainer.style.display === 'block') {
                fetchConversations();
            }
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
    authContainer.style.display = 'none';
    addItemContainer.style.display = 'none';
    marketplaceContainer.style.display = 'none';
    profileContainer.style.display = 'none';
    messagesInboxContainer.style.display = 'none';
    chatContainer.style.display = 'none';

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
        fetchItems();
    } else if (page === 'profile') {
        profileContainer.style.display = 'block';
        fetchUserProfile();
    } else if (page === 'messages') {
        messagesInboxContainer.style.display = 'block';
        fetchConversations();
    } else if (page === 'chat') {
        chatContainer.style.display = 'flex';
        setupChatListeners();
    }
};

const handleAuthenticatedState = async () => {
    const userName = localStorage.getItem('userName');
    welcomeMessage.textContent = `Welcome, ${userName}!`;
    welcomeMessage.style.display = 'block';

    showAddItemBtn.style.display = 'block';
    showHomeBtn.style.display = 'block';
    showProfileBtn.style.display = 'block';
    showMessagesBtn.style.display = 'block';
    logoutBtn.style.display = 'block';

    showLoginBtn.style.display = 'none';
    showRegisterBtn.style.display = 'none';
    
    vreuseLogo.style.display = 'none';
    vitLogo.style.display = 'block';

    const user = await fetchUserProfileData();
    if (user) {
        myUserId = user._id;
        initializeSocket(myUserId);
    } else {
        handleUnauthenticatedState();
    }

    renderPage('home');
};

const handleUnauthenticatedState = () => {
    welcomeMessage.style.display = 'none';
    showAddItemBtn.style.display = 'none';
    showHomeBtn.style.display = 'none';
    showProfileBtn.style.display = 'none';
    showMessagesBtn.style.display = 'none';
    logoutBtn.style.display = 'none';

    showLoginBtn.style.display = 'block';
    showRegisterBtn.style.display = 'block';

    vreuseLogo.style.display = 'block';
    vitLogo.style.display = 'none';

    renderPage('login');
};

// === Error Handling ===
const displayErrorMessage = (message) => {
    const errorBox = document.createElement('div');
    errorBox.classList.add('error-message-box');
    errorBox.textContent = message;
    document.body.appendChild(errorBox);
    setTimeout(() => {
        errorBox.remove();
    }, 5000);
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
                localStorage.setItem('userName', user.name);
                handleAuthenticatedState();
                return;
            }
        } catch (error) {
            console.error("Failed to verify token or fetch user profile:", error);
        }
        // If we reach this point, the token was invalid or expired.
        // We must clear the auth data to ensure a consistent UI state.
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
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
            await handleAuthSubmission('login', { email, password });
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const role = document.getElementById('register-role').value;
            const password = document.getElementById('register-password').value;
            await handleAuthSubmission('register', { name, email, role, password });
        });
    }
};

const handleAuthSubmission = async (type, payload) => {
    const errorElement = document.getElementById(`${type}-error`);
    try {
        const response = await fetch(`${API_URL}/user/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok) {
            errorElement.textContent = '';
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userName', data.name);
            handleAuthenticatedState();
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
        <div id="profile-display" class="profile-info">
            <p><strong>Name:</strong> <span id="profile-name-display">${user.name}</span></p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${user._id}</p>
            <p><strong>Role:</strong> <span id="profile-role-display">${user.role}</span></p>
            <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="profile-actions">
            <button id="edit-profile-button" class="nav-button">Edit Profile</button>
            <button id="delete-account-button" class="nav-button" style="background-color: #c0392b;">Delete Account</button>
        </div>
    `;

    document.getElementById('edit-profile-button').addEventListener('click', () => {
        showEditProfileForm(user);
    });

    document.getElementById('delete-account-button').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`${API_URL}/user/profile`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    alert('Account deleted successfully.');
                    logout();
                } else {
                    const data = await response.json();
                    displayErrorMessage(data.error || 'Failed to delete account.');
                }
            } catch (error) {
                displayErrorMessage('Could not connect to the server.');
            }
        }
    });
};

const showEditProfileForm = (user) => {
    const profileContainer = document.getElementById('profile-container');
    profileContainer.innerHTML = `
        <h2>Edit Profile</h2>
        <div class="profile-info">
            <form id="update-profile-form" class="profile-form">
                <div id="profile-update-message"></div>
                <label for="profile-name"><strong>Name:</strong></label>
                <input type="text" id="profile-name" name="name" value="${user.name}" required>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>User ID:</strong> ${user._id}</p>
                <label for="profile-role"><strong>Role:</strong></label>
                <select id="profile-role" name="role" required>
                    <option value="Student" ${user.role === 'Student' ? 'selected' : ''}>Student</option>
                    <option value="Teacher" ${user.role === 'Teacher' ? 'selected' : ''}>Teacher</option>
                </select>
                <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="profile-form-actions">
                    <button type="submit" class="nav-button">Update Profile</button>
                    <button type="button" id="cancel-edit-button" class="nav-button" style="background-color: #6c757d;">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('update-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profile-name').value;
        const newRole = document.getElementById('profile-role').value;
        const token = localStorage.getItem('token');
        const messageElement = document.getElementById('profile-update-message');

        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, role: newRole })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                localStorage.setItem('userName', updatedUser.user.name);
                messageElement.textContent = 'Profile updated successfully!';
                messageElement.style.color = '#4CAF50';
                setTimeout(() => {
                    fetchUserProfile();
                }, 1000);
            } else {
                const data = await response.json();
                messageElement.textContent = data.error || 'Failed to update profile.';
                messageElement.style.color = 'red';
            }
        } catch (error) {
            messageElement.textContent = 'Could not connect to the server.';
            messageElement.style.color = 'red';
        }
    });

    document.getElementById('cancel-edit-button').addEventListener('click', () => {
        fetchUserProfile();
    });
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
        if (loggedInUserEmail && item.user.email !== loggedInUserEmail) {
            actionsHtml += `<button class="contact-button" data-poster-id="${item.user._id}" data-poster-email="${item.user.email}">Contact Poster</button>`;
        }
        
        if (loggedInUserEmail && item.user.email === loggedInUserEmail) {
            actionsHtml += `<button class="remove-button" data-item-id="${item._id}">
                                <i class="fa fa-remove"></i> Remove
                            </button>`;
        }
        
        itemElement.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <p><strong>Price:</strong> ₹${item.price}</p>
            <img src="${item.image}" alt="${item.title}" onerror="this.onerror=null;this.src='https://placehold.co/200x150/cccccc/333333?text=No+Image';">
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Posted By:</strong> ${item.user.email.split('@')[0]}</p>
            <div class="item-actions">
                ${actionsHtml}
            </div>
        `;
        itemList.appendChild(itemElement);
    });

    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.getAttribute('data-item-id');
            const token = localStorage.getItem('token');
            const itemElementToRemove = e.target.closest('.item-listing');

            if (confirm('Are you sure you want to remove this item?')) {
                try {
                    const response = await fetch(`${API_URL}/items/${itemId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        itemElementToRemove.remove();
                    } else {
                        const data = await response.json();
                        displayErrorMessage(`Error: ${data.error}`);
                    }
                } catch (error) {
                    displayErrorMessage('Could not delete the item. Please try again.');
                    console.error('Error deleting item:', error);
                }
            }
        });
    });

   document.querySelectorAll('.contact-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const posterId = e.target.getAttribute('data-poster-id');
        const posterEmail = e.target.getAttribute('data-poster-email');

        if (!myUserId) {
            displayErrorMessage("User ID not loaded yet. Please wait.");
            return;
        }
        if (posterId === myUserId) {
            displayErrorMessage("You cannot chat with yourself.");
            return;
        }
        startChat(posterId, posterEmail);
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
        displayErrorMessage("Please log in to start a chat.");
        return;
    }

    if (!myUserId) {
        displayErrorMessage("User ID not loaded yet. Please try again in a moment.");
        return;
    }

    if (myUserId === partnerId) {
        displayErrorMessage("You cannot chat with yourself.");
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
            currentChatPartnerId = partnerId;

            chatContainer.innerHTML = chatTemplate(partnerEmail);
            document.getElementById('chat-with-user').textContent = `Chat with ${partnerEmail.split('@')[0]}`;
            
            if (data.messages && data.messages.length > 0) {
                populateChatMessages(data.messages);
            } else {
                document.getElementById('chat-messages').innerHTML = '<p style="text-align: center; color: #666;">Start a new conversation!</p>';
            }
            
            setupChatListeners();
            renderPage('chat');
        } else {
            const errorData = await response.json();
            displayErrorMessage(`Failed to start chat: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        displayErrorMessage('Error starting chat. Please try again.');
    }
};

const populateChatMessages = (messages) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    chatMessagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const isSent = message.sender._id === myUserId;
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', isSent ? 'sent' : 'received');
        messageElement.textContent = message.text;
        chatMessagesContainer.appendChild(messageElement);
    });
    
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

const appendMessageToChat = (message) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    if (!chatMessagesContainer) return;

    const placeholder = chatMessagesContainer.querySelector('p[style*="text-align: center"]');
    if (placeholder) {
        placeholder.remove();
    }
    
    const isSent = message.sender._id === myUserId;
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', isSent ? 'sent' : 'received');
    messageElement.textContent = message.text;
    chatMessagesContainer.appendChild(messageElement);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

const setupChatListeners = () => {
    const sendButton = document.getElementById('send-message-button');
    const chatInput = document.getElementById('chat-input-text');
    const closeButton = document.getElementById('close-chat');

    if (sendButton && chatInput) {
        sendButton.onclick = () => {
            const messageText = chatInput.value.trim();
            if (messageText && currentChatId && myUserId) {
                sendMessage(messageText); 
                chatInput.value = '';
            }
        };

        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const messageText = chatInput.value.trim();
                if (messageText && currentChatId && myUserId) {
                    sendMessage(messageText); 
                    chatInput.value = '';
                }
            }
        };
    }

    if (closeButton) {
        closeButton.onclick = () => {
            currentChatId = null;
            currentChatPartnerId = null;
            renderPage('messages');
        };
    }
};

const sendMessage = (messageText) => {
    if (!socket || !socket.connected) {
        displayErrorMessage('Cannot send message: Socket not connected.');
        return;
    }
    if (!currentChatId || !myUserId) {
        displayErrorMessage('Cannot send message: Chat or user ID missing.');
        return;
    }

    socket.emit('sendMessage', {
        chatId: currentChatId,
        senderId: myUserId,
        text: messageText
    });

    appendMessageToChat({
        chat: currentChatId,
        sender: { _id: myUserId, email: localStorage.getItem('userEmail') },
        text: messageText,
        createdAt: new Date().toISOString()
    });
};


const fetchConversations = async () => {
    const token = localStorage.getItem('token');
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;

    if (!token) {
        conversationsList.innerHTML = '<p>Please log in to view your conversations.</p>';
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
            conversationsList.innerHTML = `<p style="color: red;">Error loading conversations: ${errorData.error}</p>`;
        }
    } catch (error) {
        console.error('Error fetching conversations:', error);
        conversationsList.innerHTML = `<p style="color: red;">Could not connect to the server to load conversations.</p>`;
    }
};

const displayConversations = (conversations) => {
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;
    conversationsList.innerHTML = '';

    if (conversations.length === 0) {
        conversationsList.innerHTML = '<p>No conversations yet. Start by contacting a poster from the marketplace!</p>';
        return;
    }

    conversations.forEach(conversation => {
        const conversationElement = document.createElement('div');
        conversationElement.classList.add('conversation-item');
        const chatPartnerEmail = conversation.chatPartner ? conversation.chatPartner.email.split('@')[0] : 'Unknown User';
        conversationElement.innerHTML = `
            <h3>${chatPartnerEmail}</h3>
            <p>${conversation.lastMessage || 'No messages yet'}</p>
            <p style="font-size: 0.8em; color: #999;">${new Date(conversation.updatedAt).toLocaleString()}</p>
        `;
        conversationElement.addEventListener('click', () => {
            if (conversation.chatPartner) {
                startChat(conversation.chatPartner._id, conversation.chatPartner.email);
            } else {
                displayErrorMessage("Cannot start chat with an unknown user.");
            }
        });
        conversationsList.appendChild(conversationElement);
    });
};

// === Main Application Flow ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
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
    localStorage.removeItem('userName');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    myUserId = null;
    handleUnauthenticatedState();
});

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    myUserId = null;
    handleUnauthenticatedState();
};