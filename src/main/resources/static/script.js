document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELEÇÃO DE ELEMENTOS ---
    const loader = document.getElementById('loader');
    const taskList = document.getElementById('task-list');
    const completedTaskList = document.getElementById('completed-task-list');
    const completedSection = document.getElementById('completed-section');
    const noTasksMessage = document.getElementById('no-tasks-message');
    const filterControls = document.querySelector('.filter-controls');
    const categoryFilterControls = document.getElementById('category-filter-controls');
    const mainContainer = document.querySelector('.container');
    const fab = document.getElementById('add-task-btn');

    const totalTasksStat = document.getElementById('total-tasks-stat');
    const completedTasksStat = document.getElementById('completed-tasks-stat');
    const pendingTasksStat = document.getElementById('pending-tasks-stat');
    const overdueTasksStat = document.getElementById('overdue-tasks-stat');

    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const taskForm = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    const hiddenTaskId = document.getElementById('task-id');
    const saveTaskBtn = document.getElementById('save-task-btn');

    const timeInput = document.getElementById('time');
    const timeSuggestions = document.getElementById('time-suggestions');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const muteToggleBtn = document.getElementById('mute-toggle-btn');
    const muteIcon = muteToggleBtn.querySelector('i');
    const logoutBtn = document.getElementById('logout-btn');

    const addSound = document.getElementById('add-sound');
    const completeSound = document.getElementById('complete-sound');
    const deleteSound = document.getElementById('delete-sound');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const toastContainer = document.getElementById('toast-container');

    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');

    const welcomeGreeting = document.getElementById('welcome-greeting');
    const profileIconBtn = document.getElementById('profile-icon-btn');
    const userInfoModal = document.getElementById('user-info-modal');
    const closeUserModalBtn = document.getElementById('close-user-modal-btn');
    const userInfoForm = document.getElementById('user-info-form');
    const userNameDisplay = document.getElementById('user-name-display');
    const userAgeDisplay = document.getElementById('user-age-display');
    const userInfoEdit = document.getElementById('user-info-edit');
    const userNameInput = document.getElementById('user-name-input');
    const userAgeInput = document.getElementById('user-age-input');
    const userPhotoInput = document.getElementById('user-photo-input');
    const userPhotoPreview = document.getElementById('user-photo-preview');
    const avatarContainer = document.getElementById('avatar-container');
    const profilePicUploader = document.querySelector('.profile-pic-uploader');
    const editUserInfoBtn = document.getElementById('edit-user-info-btn');
    const saveUserInfoBtn = document.getElementById('save-user-info-btn');
    const userTotalTasksSpan = document.getElementById('user-total-tasks');

    const locationWeatherSection = document.getElementById('location-weather-section');
    const weatherIconEl = document.getElementById('weather-icon');
    const temperatureEl = document.getElementById('temperature');
    const locationEl = document.getElementById('location');
    const currentTimeEl = document.getElementById('current-time');
    const currentDateEl = document.getElementById('current-date');
    let clockInterval = null;

    // --- 2. ESTADO DA APLICAÇÃO ---
    let allTasks = [];
    let currentFilter = 'all';
    let currentCategoryFilter = 'all';
    let isMuted = false;
    let authToken = localStorage.getItem('authToken');
    const API_BASE_URL = '';
    let resolveConfirm;

    const categoryEmojis = {
        'Pessoal': '👤', 'Trabalho': '💼', 'Saúde': '❤️',
        'Estudos': '📚', 'Rotina': '🔄', 'Default': '📌'
    };

    let deferredPrompt;
    const installAppBtn = document.getElementById('install-app-btn');

    // --- FUNÇÕES DE UTILIDADE ---
    async function playSound(audioElement, volume = 0.5) {
        if (isMuted) return;
        try {
            audioElement.volume = volume;
            audioElement.currentTime = 0;
            await audioElement.play();
        } catch (error) {
            console.error(`Erro ao tocar o som (${audioElement.src}):`, error.message);
        }
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.innerHTML = `<i class="ph-bold ${isError ? 'ph-x-circle' : 'ph-check-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- 3. FUNÇÕES DA API ---
    async function apiRequest(endpoint, method = 'GET', body = null, showLoader = false) {
        if (showLoader) loader.classList.remove('hidden');
        
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (authToken) {
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(url, options);

            if ((response.status === 401 || response.status === 403) && endpoint !== '/api/user/login') {
                logout();
                return;
            }

            if (!response.ok) {
                let errorBody;
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = response.statusText;
                }
                throw new Error(errorBody || `HTTP error! status: ${response.status}`);
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error(`Error during API request to endpoint: ${endpoint}.`, error);
            throw error;
        } finally {
            if (showLoader) loader.classList.add('hidden');
        }
    }

    // --- 4. RENDERIZAÇÃO E LÓGICA (Tarefas) ---
    function updateStats() {
        const completedCount = allTasks.filter(task => task.completed).length;
        const now = new Date();
        const overdueCount = allTasks.filter(task =>
            !task.completed && task.date && task.time && (new Date(`${task.date}T${task.time}`) < now)
        ).length;
        const pendingCount = allTasks.length - completedCount;

        totalTasksStat.textContent = allTasks.length;
        completedTasksStat.textContent = completedCount;
        pendingTasksStat.textContent = pendingCount;
        overdueTasksStat.textContent = overdueCount;
    }

    function renderTasks() {
        updateStats();
        const priorityOrder = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        const sortedTasks = [...allTasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
            if (priorityB !== priorityA) return priorityB - priorityA;
            const dateA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : 0;
            const dateB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : 0;
            return dateA - dateB;
        });

        const pendingTasks = sortedTasks.filter(task => !task.completed);
        const completedTasks = sortedTasks.filter(task => task.completed);

        taskList.innerHTML = '';
        completedTaskList.innerHTML = '';
        let filteredPendingTasks = pendingTasks;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        switch (currentFilter) {
            case 'today':
                filteredPendingTasks = pendingTasks.filter(task => task.date === today);
                break;
            case 'upcoming':
                filteredPendingTasks = pendingTasks.filter(task => task.date > today);
                break;
            case 'routines':
                filteredPendingTasks = pendingTasks.filter(task => task.recurring);
                break;
        }

        if (currentCategoryFilter !== 'all') {
            filteredPendingTasks = filteredPendingTasks.filter(task => task.category === currentCategoryFilter);
        }

        noTasksMessage.classList.toggle('hidden', allTasks.length > 0);
        if (filteredPendingTasks.length > 0) {
            filteredPendingTasks.forEach(task => taskList.appendChild(createTaskElement(task)));
        } else if (allTasks.length > 0) {
            taskList.innerHTML = `<div id="no-tasks-message" class=""><i class="ph-light ph-files"></i><p>Nenhuma tarefa corresponde aos filtros.</p></div>`;
        }

        completedSection.classList.toggle('hidden', completedTasks.length === 0);
        if (completedTasks.length > 0) {
            completedTasks.forEach(task => completedTaskList.appendChild(createTaskElement(task)));
        }
    }

    function createTaskElement(task) {
        const taskCard = document.createElement('div');
        const isOverdue = !task.completed && task.date && task.time && (new Date(`${task.date}T${task.time}`) < new Date());
        taskCard.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority} ${isOverdue ? 'overdue' : ''}`;
        taskCard.dataset.id = task.id;

        const emoji = categoryEmojis[task.category] || categoryEmojis['Default'];
        const formattedDate = task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem data';
        const timeDisplay = task.time ? task.time.substring(0, 5) : 'Sem hora';

        taskCard.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            </div>
            <div class="task-info">
                <div class="task-title">
                    <span>${emoji}</span>
                    <h4>${task.title}</h4>
                </div>
                <div class="task-meta">
                    <div class="meta-item"><i class="ph-light ph-calendar"></i><span>${formattedDate}</span></div>
                    <div class="meta-item"><i class="ph-light ph-clock"></i><span>${timeDisplay}</span></div>
                    <div class="meta-item"><i class="ph-light ph-tag"></i><span>${task.category}</span></div>
                    <div class="meta-item"><i class="ph-light ph-flag"></i><span>${task.priority}</span></div>
                    ${task.recurring ? `<div class="meta-item"><i class="ph-fill ph-repeat" style="color: var(--primary-color);"></i><span>Diária</span></div>` : ''}
                </div>
                ${task.description ? `<p class="task-description">${task.description.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
            <div class="task-actions-menu">
                <button class="menu-btn"><i class="ph-bold ph-dots-three-vertical"></i></button>
                <div class="dropdown-menu hidden">
                    <button class="edit-btn"><i class="ph ph-pencil-simple"></i> Editar</button>
                    <button class="delete-btn"><i class="ph ph-trash"></i> Excluir</button>
                </div>
            </div>
        `;
        return taskCard;
    }

    async function loadTasks() {
        if (!authToken) return;
        try {
            const tasks = await apiRequest('/api/tasks');
            if (tasks) {
                allTasks = tasks;
                renderTasks();
            }
        } catch (error) {
            showToast("Não foi possível carregar as tarefas.", true);
        }
    }

    // --- 5. MANIPULAÇÃO DE EVENTOS (Tarefas) ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        const taskCard = target.closest('.task-card');

        if (!target.closest('.task-actions-menu')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }
        if (!taskCard) return;

        const id = taskCard.dataset.id;
        const task = allTasks.find(t => t.id == id);
        if (!task) return;

        if (target.classList.contains('task-checkbox')) {
            try {
                task.completed = target.checked;
                await apiRequest(`/api/tasks/${id}`, 'PUT', task, true);
                showToast(task.completed ? "Tarefa concluída!" : "Tarefa reaberta!");
                if (task.completed) playSound(completeSound, 0.3);
                loadTasks();
            } catch (error) {
                showToast("Erro ao atualizar a tarefa.", true);
                loadTasks();
            }
        }

        if (target.closest('.menu-btn')) {
            const menu = taskCard.querySelector('.dropdown-menu');
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }

        if (target.classList.contains('edit-btn')) {
            openModalForEdit(task);
        }

        if (target.classList.contains('delete-btn')) {
            const confirmed = await showCustomConfirm('Tem certeza que deseja excluir esta tarefa?');
            if (confirmed) {
                try {
                    playSound(deleteSound, 0.4);
                    await apiRequest(`/api/tasks/${id}`, 'DELETE', null, true);
                    showToast("Tarefa excluída com sucesso!");
                    loadTasks();
                } catch (error) {
                    showToast("Erro ao excluir a tarefa.", true);
                }
            }
        }
    });

    filterControls.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            currentFilter = event.target.dataset.filter;
            filterControls.querySelector('.filter-btn.active').classList.remove('active');
            event.target.classList.add('active');
            renderTasks();
        }
    });

    categoryFilterControls.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const clickedButton = event.target;
            const filter = clickedButton.dataset.filter;
            const currentlyActiveButton = categoryFilterControls.querySelector('.filter-btn.active');

            if (clickedButton.classList.contains('active')) {
                clickedButton.classList.remove('active');
                currentCategoryFilter = 'all';
            } else {
                if (currentlyActiveButton) currentlyActiveButton.classList.remove('active');
                clickedButton.classList.add('active');
                currentCategoryFilter = filter;
            }
            renderTasks();
        }
    });

    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = hiddenTaskId.value;
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value ? `${document.getElementById('time').value}:00` : null,
            category: document.getElementById('category').value,
            priority: document.getElementById('priority').value,
            withNotification: document.getElementById('withNotification').checked,
            recurring: document.getElementById('recurring').checked,
            completed: id ? allTasks.find(t => t.id == id).completed : false,
            notificationState: id ? allTasks.find(t => t.id == id).notificationState : 0
        };

        const endpoint = id ? `/api/tasks/${id}` : '/api/tasks';
        const method = id ? 'PUT' : 'POST';

        try {
            await apiRequest(endpoint, method, taskData, true);
            showToast(id ? "Tarefa atualizada!" : "Tarefa adicionada!");
            if (!id) playSound(addSound, 0.5);
            closeModal();
            loadTasks();
        } catch (error) {
            showToast("Erro ao salvar a tarefa.", true);
        }
    });

    // --- 6. LÓGICA DO MODAL E SUGESTÕES DE HORÁRIO ---
    function populateTimeSuggestions() {
        timeSuggestions.innerHTML = '';
        const now = new Date();
        const dateValue = document.getElementById('date').value;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        let startHour = (dateValue === today) ? now.getHours() : 0;
        let startMinute = (dateValue === today) ? (now.getMinutes() < 30 ? 30 : 0) : 0;
        if (startMinute === 0 && dateValue === today) startHour++;

        for (let h = startHour; h < 24; h++) {
            for (let m = (h === startHour ? startMinute : 0); m < 60; m += 30) {
                const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeString;
                timeSuggestions.appendChild(option);
            }
        }
    }
    timeInput.addEventListener('focus', populateTimeSuggestions);

    function setDateInputMin() {
        const dateInput = document.getElementById('date');
        const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        dateInput.min = todayLocal.toISOString().split('T')[0];
        return dateInput.min;
    }

    function openModalForEdit(task) {
        modalTitle.textContent = 'Editar Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-check"></i> Salvar Alterações';
        taskForm.reset();
        setDateInputMin();
        hiddenTaskId.value = task.id;
        Object.keys(task).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = task[key];
                } else if (key === 'time' && task[key]) {
                    element.value = task[key].substring(0, 5);
                } else {
                    element.value = task[key];
                }
            }
        });
        taskModal.classList.remove('hidden');
    }

    function openModalForCreate() {
        modalTitle.textContent = 'Nova Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-plus"></i> Adicionar Tarefa';
        taskForm.reset();
        hiddenTaskId.value = '';
        document.getElementById('date').value = setDateInputMin();
        document.getElementById('withNotification').checked = true;
        taskModal.classList.remove('hidden');
    }

    function closeModal() { taskModal.classList.add('hidden'); }
    addTaskBtn.addEventListener('click', openModalForCreate);
    closeModalBtn.addEventListener('click', closeModal);

    // --- 7. GESTÃO DE USUÁRIO E AUTENTICAÇÃO ---
    function showLoginState() {
        mainContainer.classList.remove('hidden');
        fab.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loginModal.classList.add('hidden');
        registerModal.classList.add('hidden');
    }

    function showLoggedOutState() {
        mainContainer.classList.add('hidden');
        fab.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        loginModal.classList.remove('hidden');
        registerModal.classList.add('hidden');
        loader.classList.add('hidden');
    }

    function logout() {
        authToken = null;
        localStorage.clear();
        allTasks = [];
        renderTasks();
        showLoggedOutState();
    }

    logoutBtn.addEventListener('click', logout);
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('hidden'); registerModal.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerModal.classList.add('hidden'); loginModal.classList.remove('hidden'); });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await apiRequest('/api/user/login', 'POST', {
                username: document.getElementById('login-username').value,
                password: document.getElementById('login-password').value
            }, true);
            if (data && data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
                showLoginState();
                updateUserInfoUI(data);
                initializeApp();
            }
        } catch (error) {
            showToast("Erro ao fazer login.", true);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/api/user/register', 'POST', {
                name: document.getElementById('register-name').value,
                age: document.getElementById('register-age').value,
                username: document.getElementById('register-username').value,
                password: document.getElementById('register-password').value
            }, true);
            showToast("Usuário registrado com sucesso! Faça o login.");
            registerModal.classList.add('hidden');
            loginModal.classList.remove('hidden');
        } catch (error) {
            showToast("Erro ao registrar usuário.", true);
        }
    });

    function setUserInfoViewMode() {
        userInfoView.classList.remove('hidden');
        userInfoEdit.classList.add('hidden');
        editUserInfoBtn.classList.remove('hidden');
        saveUserInfoBtn.classList.add('hidden');
        profilePicUploader.classList.remove('edit-mode');
        userPhotoInput.disabled = true;
    }

    function setUserInfoEditMode() {
        userNameInput.value = localStorage.getItem('name') || '';
        userAgeInput.value = localStorage.getItem('age') || '';
        userInfoView.classList.add('hidden');
        userInfoEdit.classList.remove('hidden');
        editUserInfoBtn.classList.add('hidden');
        saveUserInfoBtn.classList.remove('hidden');
        profilePicUploader.classList.add('edit-mode');
        userPhotoInput.disabled = false;
    }

    function updateUserInfoUI(userData = null) {
        const userName = userData ? userData.name : localStorage.getItem('name') || '';
        const userAge = userData ? userData.age : localStorage.getItem('age') || '';
        const userPhoto = userData ? userData.photo : localStorage.getItem('photo');
        const totalTasks = userData ? userData.totalTasks : localStorage.getItem('totalTasks') || '0';

        welcomeGreeting.textContent = userName ? `Olá, ${userName}!` : `Olá!`;
        userNameDisplay.textContent = userName || 'Não informado';
        userAgeDisplay.textContent = userAge || 'Não informada';
        userTotalTasksSpan.textContent = totalTasks;

        const defaultAvatarSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;

        if (userPhoto && userPhoto !== 'null') {
            userPhotoPreview.src = userPhoto;
            userPhotoPreview.style.display = 'block';
            avatarContainer.innerHTML = `<img src="${userPhoto}" alt="Foto de Perfil" id="user-photo-preview">`;
            profileIconBtn.innerHTML = `<img src="${userPhoto}" alt="Foto de Perfil">`;
        } else {
            avatarContainer.innerHTML = defaultAvatarSVG;
            profileIconBtn.innerHTML = `<i class="ph-fill ph-user"></i>`;
        }
    }

    function openUserInfoModal() {
        updateUserInfoUI({
            name: localStorage.getItem('name'),
            age: localStorage.getItem('age'),
            photo: localStorage.getItem('photo'),
            totalTasks: localStorage.getItem('totalTasks')
        });
        setUserInfoViewMode();
        userInfoModal.classList.remove('hidden');
    }

    userInfoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = userNameInput.value.trim();
        const age = userAgeInput.value.trim();
        const photoFile = userPhotoInput.files[0];

        const updateData = { name, age };
        const saveAndUpdate = async (photoData) => {
            if (photoData) updateData.photo = photoData;
            try {
                await apiRequest('/api/user/profile', 'PUT', updateData, true);
                localStorage.setItem('name', name);
                localStorage.setItem('age', age);
                if (updateData.photo) localStorage.setItem('photo', updateData.photo);
                updateUserInfoUI({ name, age, photo: updateData.photo, totalTasks: localStorage.getItem('totalTasks') });
                showToast("Informações salvas com sucesso!");
                userInfoModal.classList.add('hidden');
            } catch (error) {
                showToast("Erro ao salvar informações.", true);
            }
        };

        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => saveAndUpdate(e.target.result);
            reader.readAsDataURL(photoFile);
        } else {
            saveAndUpdate(localStorage.getItem('photo'));
        }
    });

    profileIconBtn.addEventListener('click', openUserInfoModal);
    closeUserModalBtn.addEventListener('click', () => userInfoModal.classList.add('hidden'));
    editUserInfoBtn.addEventListener('click', setUserInfoEditMode);
    userPhotoInput.addEventListener('change', () => {
        const file = userPhotoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarContainer.innerHTML = `<img src="${e.target.result}" alt="Foto de Perfil" id="user-photo-preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 8. FUNÇÕES GERAIS E NOTIFICAÇÃO PUSH ---
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function subscribeUserToPush() {
        if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (subscription === null) {
                const response = await apiRequest('/api/notifications/vapidPublicKey');
                const vapidPublicKey = response.publicKey;
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }
            const subData = subscription.toJSON();
            await apiRequest('/api/notifications/subscribe', 'POST', {
                endpoint: subData.endpoint,
                p256dh: subData.keys.p256dh,
                auth: subData.keys.auth
            });
            console.log('Usuário inscrito para notificações push.');
        } catch (error) {
            console.error('Falha ao inscrever o usuário para notificações push:', error);
            showToast("Não foi possível ativar as notificações push.", true);
        }
    }

    function createCategoryFilters() {
        categoryFilterControls.innerHTML = '';
        const categories = ['Pessoal', 'Trabalho', 'Saúde', 'Estudos', 'Rotina'];
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = category;
            button.textContent = category;
            categoryFilterControls.appendChild(button);
        });
    }

    function setTheme(theme) {
        document.body.dataset.theme = theme;
        themeIcon.className = theme === 'dark' ? 'ph-fill ph-moon' : 'ph-fill ph-sun';
        localStorage.setItem('theme', theme);
    }
    themeToggleBtn.addEventListener('click', () => setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'));

    function setMute(muted) { isMuted = muted; muteIcon.className = muted ? 'ph-fill ph-speaker-slash' : 'ph-fill ph-speaker-high'; localStorage.setItem('isMuted', muted); }
    muteToggleBtn.addEventListener('click', () => setMute(!isMuted));

    function showCustomConfirm(message) {
        confirmModalText.textContent = message;
        confirmModal.classList.remove('hidden');
        return new Promise((resolve) => { resolveConfirm = resolve; });
    }
    confirmBtn.addEventListener('click', () => { confirmModal.classList.add('hidden'); resolveConfirm(true); });
    cancelBtn.addEventListener('click', () => { confirmModal.classList.add('hidden'); resolveConfirm(false); });

    // --- LÓGICA DE CLIMA E LOCALIZAÇÃO ---
    async function fetchLocationAndWeather() { /* ... (código inalterado) ... */ }
    function startClock(timezone) { /* ... (código inalterado) ... */ }
    function getWeatherIcon(weatherCode) { /* ... (código inalterado) ... */ }

    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
        if (e.target === confirmModal) { confirmModal.classList.add('hidden'); resolveConfirm(false); }
        if (e.target === userInfoModal) userInfoModal.classList.add('hidden');
    });

    // --- LÓGICA DE INSTALAÇÃO DO PWA ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (authToken) installAppBtn.classList.remove('hidden');
    });
    installAppBtn.addEventListener('click', async () => {
        installAppBtn.classList.add('hidden');
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
    });
    window.addEventListener('appinstalled', () => {
        installAppBtn.classList.add('hidden');
        deferredPrompt = null;
        showToast("Aplicativo instalado com sucesso!");
    });

    // --- INICIALIZAÇÃO ---
    async function initializeApp() {
        setTheme(localStorage.getItem('theme') || 'dark');
        setMute(localStorage.getItem('isMuted') === 'true');
        updateUserInfoUI({
            name: localStorage.getItem('name'),
            age: localStorage.getItem('age'),
            photo: localStorage.getItem('photo'),
            totalTasks: localStorage.getItem('totalTasks')
        });
        createCategoryFilters();
        await subscribeUserToPush();
        await loadTasks();
        //await fetchLocationAndWeather(); // Descomente se quiser usar
        loader.classList.add('hidden');
    }

    if (authToken) {
        showLoginState();
        initializeApp();
    } else {
        showLoggedOutState();
    }
});