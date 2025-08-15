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
    const categoryEmojis = { 'Pessoal': '👤', 'Trabalho': '💼', 'Saúde': '❤️', 'Estudos': '📚', 'Rotina': '🔄', 'Default': '📌' };
    let taskCheckInterval;
    let lastCheckedDate = new Date().getDate();
    let autoRefreshInterval;
    let deferredPrompt;
    const installAppBtn = document.getElementById('install-app-btn');

    // --- FUNÇÕES DE UTILIDADE ---
    async function playSound(audioElement, volume = 0.5) {
        if (isMuted) return;
        try {
            audioElement.volume = volume;
            audioElement.currentTime = 0;
            await audioElement.play();
        } catch (error) { console.error(`Erro ao tocar o som:`, error); }
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
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (authToken) { options.headers['Authorization'] = `Bearer ${authToken}`; }
            if (body) { options.body = JSON.stringify(body); }
            const response = await fetch(url, options);

            if ((response.status === 401 || response.status === 403)) {
                if (endpoint !== '/api/user/login') logout();
                throw new Error(await response.text());
            }
            if (!response.ok) { throw new Error(await response.text() || `HTTP error! status: ${response.status}`); }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error(`Error during API request to ${endpoint}:`, error);
            throw error;
        } finally {
            if (showLoader) loader.classList.add('hidden');
        }
    }

    // --- 4. RENDERIZAÇÃO E LÓGICA (Tarefas) ---
    function updateStats() {
        const completedCount = allTasks.filter(task => task.completed).length;
        const now = new Date();
        const overdueCount = allTasks.filter(task => !task.completed && task.date && task.time && (now.getTime() - new Date(`${task.date}T${task.time}`).getTime()) > 300000).length;
        const pendingCount = allTasks.length - completedCount;
        
        totalTasksStat.textContent = allTasks.length;
        completedTasksStat.textContent = completedCount;
        pendingTasksStat.textContent = pendingCount - overdueCount >= 0 ? pendingCount - overdueCount : 0;
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
            case 'today': filteredPendingTasks = pendingTasks.filter(task => task.date === today); break;
            case 'upcoming': filteredPendingTasks = pendingTasks.filter(task => task.date > today); break;
            case 'routines': filteredPendingTasks = pendingTasks.filter(task => task.recurring); break;
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
        scheduleTaskChecks();
    }

    function createTaskElement(task) {
        const taskCard = document.createElement('div');
        let overdueClass = '';
        if (!task.completed && task.date && task.time) {
            if (new Date() - new Date(`${task.date}T${task.time}`) > 300000) overdueClass = 'overdue';
        }
        taskCard.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority} ${overdueClass}`;
        taskCard.dataset.id = task.id;
        const emoji = categoryEmojis[task.category] || categoryEmojis['Default'];
        const formattedDate = task.date ? new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem data';
        const timeDisplay = task.time ? task.time.substring(0, 5) : 'Sem hora';
        taskCard.innerHTML = `
            <div class="task-checkbox-container"><input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}></div>
            <div class="task-info">
                <div class="task-title"><span>${emoji}</span><h4>${task.title}</h4></div>
                <div class="task-meta">
                    <div class="meta-item"><i class="ph-light ph-calendar"></i><span>${formattedDate}</span></div>
                    <div class="meta-item"><i class="ph-light ph-clock"></i><span>${timeDisplay}</span></div>
                    <div class="meta-item"><i class="ph-light ph-tag"></i><span>${task.category}</span></div>
                    <div class="meta-item"><i class="ph-light ph-flag"></i><span>${task.priority}</span></div>
                    ${task.recurring ? `<div class="meta-item"><i class="ph-fill ph-repeat" style="color: var(--primary-color);"></i><span>Diária</span></div>` : ''}
                </div>
                ${task.withNotification && !task.completed ? `<div class="meta-item notification-countdown"><i class="ph-light ph-alarm"></i><span></span></div>` : ''}
                ${task.completed && task.recurring ? `<div class="meta-item reactivation-countdown"><i class="ph-fill ph-timer"></i><span></span></div>` : ''}
                ${task.description ? `<p class="task-description">${task.description.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
            <div class="task-actions-menu">
                <button class="menu-btn"><i class="ph-bold ph-dots-three-vertical"></i></button>
                <div class="dropdown-menu hidden">
                    <button class="edit-btn"><i class="ph ph-pencil-simple"></i> Editar</button>
                    <button class="delete-btn"><i class="ph ph-trash"></i> Excluir</button>
                </div>
            </div>`;
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
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        }
    }

    // --- 5. MANIPULAÇÃO DE EVENTOS (Tarefas) ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        const taskCard = target.closest('.task-card');
        if (!target.closest('.task-actions-menu')) { document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden')); }
        if (!taskCard) return;
        const id = taskCard.dataset.id;
        const task = allTasks.find(t => t.id == id);
        if (!task) return;

        if (target.classList.contains('task-checkbox')) {
            try {
                task.completed = target.checked;
                await apiRequest(`/api/tasks/${id}`, 'PUT', task, true);
                showToast(target.checked ? "Tarefa concluída!" : "Tarefa reaberta!");
                if (target.checked) playSound(completeSound, 0.3);
                loadTasks();
            } catch (error) { showToast("Erro ao atualizar a tarefa.", true); loadTasks(); }
        }
        if (target.closest('.menu-btn')) {
            const menu = taskCard.querySelector('.dropdown-menu');
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }
        if (target.classList.contains('edit-btn')) { openModalForEdit(task); }
        if (target.classList.contains('delete-btn')) {
            if (await showCustomConfirm('Tem certeza que deseja excluir esta tarefa?')) {
                try {
                    playSound(deleteSound, 0.4);
                    await apiRequest(`/api/tasks/${id}`, 'DELETE', null, true);
                    showToast("Tarefa excluída com sucesso!");
                    loadTasks();
                } catch (error) { showToast("Erro ao excluir a tarefa.", true); }
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
        if (event.target.tagName !== 'BUTTON') return;
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
    });

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = hiddenTaskId.value;
        const timeValue = document.getElementById('time').value;
        if (timeValue && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue)) {
            showToast("Formato de horário inválido. Use HH:mm.", true); return;
        }
        const dateValue = document.getElementById('date').value;
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        if (dateValue === today && timeValue) {
            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            if (timeValue < currentTime) { showToast("Não é possível agendar uma tarefa para um horário que já passou hoje.", true); return; }
        }
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            date: dateValue, time: timeValue ? `${timeValue}:00` : null,
            category: document.getElementById('category').value, priority: document.getElementById('priority').value,
            withNotification: document.getElementById('withNotification').checked, recurring: document.getElementById('recurring').checked,
            completed: id ? allTasks.find(t => t.id == id).completed : false,
            notificationState: id ? allTasks.find(t => t.id == id).notificationState : 0
        };
        try {
            await apiRequest(id ? `/api/tasks/${id}` : '/api/tasks', id ? 'PUT' : 'POST', taskData, true);
            showToast(id ? "Tarefa atualizada!" : "Tarefa adicionada!");
            if (!id) {
                playSound(addSound, 0.5);
                const currentTotal = parseInt(localStorage.getItem('totalTasksCreated') || '0');
                localStorage.setItem('totalTasksCreated', currentTotal + 1);
                updateUserInfoUI();
            }
            closeTaskModal();
            loadTasks();
        } catch (error) { showToast("Erro ao salvar a tarefa.", true); }
    }
    taskForm.addEventListener('submit', handleFormSubmit);

    // --- 6. LÓGICA DO MODAL ---
    // NOVO: Função para gerenciar a visibilidade de todos os modais e o scroll da página
    function setModalVisibility(modalElement, visible) {
        if (visible) {
            document.body.classList.add('modal-open');
            modalElement.classList.remove('hidden');
        } else {
            document.body.classList.remove('modal-open');
            modalElement.classList.add('hidden');
        }
    }

    // CORREÇÃO: Nova lógica para mostrar apenas horários futuros disponíveis
    function populateTimeSuggestions() {
        const datalist = document.getElementById('time-suggestions');
        const dateInput = document.getElementById('date');
        datalist.innerHTML = '';
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const isToday = (dateInput.value === today);
        let startHour = 0, startMinute = 0;
        if (isToday) {
            const now = new Date();
            startHour = now.getHours();
            if (now.getMinutes() < 30) { startMinute = 30; } else { startHour += 1; startMinute = 0; }
        }
        if (startHour >= 24) return;
        for (let h = startHour; h < 24; h++) {
            const mStart = (h === startHour) ? startMinute : 0;
            for (let m = mStart; m < 60; m += 30) {
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = time;
                datalist.appendChild(option);
            }
        }
    }

    function setDateInputMin() {
        const dateInput = document.getElementById('date');
        const today = new Date();
        dateInput.min = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        return dateInput.min;
    }

    function openModalForEdit(task) {
        modalTitle.textContent = 'Editar Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-check"></i> Salvar Alterações';
        taskForm.reset();
        setDateInputMin();
        hiddenTaskId.value = task.id;
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('date').value = task.date;
        document.getElementById('time').value = task.time ? task.time.substring(0, 5) : "";
        document.getElementById('category').value = task.category;
        document.getElementById('priority').value = task.priority;
        document.getElementById('withNotification').checked = task.withNotification;
        document.getElementById('recurring').checked = task.recurring;
        populateTimeSuggestions();
        setModalVisibility(taskModal, true);
    }

    function openModalForCreate() {
        modalTitle.textContent = 'Nova Tarefa';
        saveTaskBtn.innerHTML = '<i class="ph-bold ph-plus"></i> Adicionar Tarefa';
        taskForm.reset();
        hiddenTaskId.value = '';
        document.getElementById('date').value = setDateInputMin();
        document.getElementById('withNotification').checked = true;
        populateTimeSuggestions();
        setModalVisibility(taskModal, true);
    }

    function closeTaskModal() { setModalVisibility(taskModal, false); }
    addTaskBtn.addEventListener('click', openModalForCreate);
    closeModalBtn.addEventListener('click', closeTaskModal);
    document.getElementById('date').addEventListener('change', populateTimeSuggestions); // Atualiza horários ao mudar a data

    // --- 7. GESTÃO DE USUÁRIO E AUTENTICAÇÃO ---
    function showLoginState() {
        mainContainer.classList.remove('hidden');
        fab.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        setModalVisibility(loginModal, false);
        setModalVisibility(registerModal, false);
    }
    
    function showLoggedOutState() {
        // CORREÇÃO: Mantém o container visível para o efeito de desfoque funcionar
        mainContainer.classList.remove('hidden');
        fab.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        setModalVisibility(loginModal, true);
        setModalVisibility(registerModal, false);
        loader.classList.add('hidden');
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    }
    
    function logout() {
        authToken = null;
        localStorage.clear();
        allTasks = [];
        renderTasks();
        profileIconBtn.innerHTML = `<i class="ph-fill ph-user"></i>`;
        welcomeGreeting.textContent = `Olá, Dev!`;
        showLoggedOutState();
    }

    logoutBtn.addEventListener('click', logout);
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); setModalVisibility(loginModal, false); setModalVisibility(registerModal, true); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); setModalVisibility(registerModal, false); setModalVisibility(loginModal, true); });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await apiRequest('/api/user/login', 'POST', { username, password }, true);
            if (data && data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userAge', data.age);
                localStorage.setItem('totalTasksCreated', data.totalTasksCreated);
                showLoginState();
                updateUserInfoUI(data);
                initializeApp();
            }
        } catch (error) { showToast("Usuário ou senha inválidos.", true); }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const age = document.getElementById('register-age').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            await apiRequest('/api/user/register', 'POST', { name, age, username, password }, true);
            showToast("Usuário registrado com sucesso! Faça o login.");
            setModalVisibility(registerModal, false);
            setModalVisibility(loginModal, true);
        } catch (error) { showToast(error.message || "Erro ao registrar.", true); }
    });
    
    function setUserInfoViewMode() {
        userInfoView.classList.remove('hidden'); userInfoEdit.classList.add('hidden');
        editUserInfoBtn.classList.remove('hidden'); saveUserInfoBtn.classList.add('hidden');
        profilePicUploader.classList.remove('edit-mode'); userPhotoInput.disabled = true;
    }

    function setUserInfoEditMode() {
        userNameInput.value = localStorage.getItem('userName') || '';
        userAgeInput.value = localStorage.getItem('userAge') || '';
        userInfoView.classList.add('hidden'); userInfoEdit.classList.remove('hidden');
        editUserInfoBtn.classList.add('hidden'); saveUserInfoBtn.classList.remove('hidden');
        profilePicUploader.classList.add('edit-mode'); userPhotoInput.disabled = false;
    }

    function updateUserInfoUI(userData = null) {
        const userName = userData ? userData.name : localStorage.getItem('userName') || '';
        const userAge = userData ? userData.age : localStorage.getItem('userAge') || '';
        const userPhoto = userData ? userData.photo : (profileIconBtn.querySelector('img')?.src || null);
        const totalTasks = userData ? userData.totalTasksCreated : localStorage.getItem('totalTasksCreated') || '0';

        welcomeGreeting.textContent = userName ? `Olá, ${userName}!` : `Olá, Dev!`;
        userNameDisplay.textContent = userName || 'Não informado';
        userAgeDisplay.textContent = userAge || 'Não informada';
        userTotalTasksSpan.textContent = totalTasks;

        const defaultAvatarSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`;

        if (userPhoto && userPhoto !== 'null') {
            userPhotoPreview.src = userPhoto; userPhotoPreview.style.display = 'block';
            avatarContainer.innerHTML = ''; avatarContainer.appendChild(userPhotoPreview);
            profileIconBtn.innerHTML = `<img src="${userPhoto}" alt="Foto de Perfil">`;
        } else {
            avatarContainer.innerHTML = defaultAvatarSVG; userPhotoPreview.style.display = 'none';
            profileIconBtn.innerHTML = `<i class="ph-fill ph-user"></i>`;
        }
    }
    
    function openUserInfoModal() {
        updateUserInfoUI(); // Usa os dados já carregados
        setUserInfoViewMode();
        setModalVisibility(userInfoModal, true);
    }
    function closeUserInfoModal() { setModalVisibility(userInfoModal, false); }

    async function handleUserInfoSubmit(event) {
        event.preventDefault();
        const name = userNameInput.value.trim(); const age = userAgeInput.value.trim();
        const photoFile = userPhotoInput.files[0];
        if (!name || !age) { showToast("Por favor, preencha nome e idade.", true); return; }
        const updateData = { name, age };
        const saveAndUpdate = async (photoData) => {
            if (photoData) { updateData.photo = photoData; }
            try {
                await apiRequest('/api/user/profile', 'PUT', updateData, true);
                localStorage.setItem('userName', name); localStorage.setItem('userAge', age);
                updateUserInfoUI({ name, age, photo: updateData.photo, totalTasksCreated: localStorage.getItem('totalTasksCreated') });
                showToast("Informações salvas!");
                closeUserInfoModal();
            } catch (error) { showToast("Erro ao salvar informações.", true); }
        };
        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => saveAndUpdate(e.target.result);
            reader.readAsDataURL(photoFile);
        } else { saveAndUpdate(profileIconBtn.querySelector('img')?.src); }
    }

    profileIconBtn.addEventListener('click', openUserInfoModal);
    closeUserModalBtn.addEventListener('click', closeUserInfoModal);
    editUserInfoBtn.addEventListener('click', setUserInfoEditMode);
    userInfoForm.addEventListener('submit', handleUserInfoSubmit);
    userPhotoInput.addEventListener('change', () => {
        const file = userPhotoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                userPhotoPreview.src = e.target.result; userPhotoPreview.style.display = 'block';
                avatarContainer.innerHTML = ''; avatarContainer.appendChild(userPhotoPreview);
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 8. FUNÇÕES GERAIS ---
    function createCategoryFilters() { /* ...código original... */ }
    function setTheme(theme) { /* ...código original... */ }
    themeToggleBtn.addEventListener('click', () => { setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'); });
    function setMute(muted) { isMuted = muted; muteIcon.className = muted ? 'ph-fill ph-speaker-slash' : 'ph-fill ph-speaker-high'; localStorage.setItem('isMuted', muted); }
    muteToggleBtn.addEventListener('click', () => setMute(!isMuted) );
    function showCustomConfirm(message) {
        confirmModalText.textContent = message; setModalVisibility(confirmModal, true);
        return new Promise((resolve) => { resolveConfirm = resolve; });
    }
    function hideCustomConfirm(value) {
        setModalVisibility(confirmModal, false);
        if (resolveConfirm) resolveConfirm(value);
    }
    confirmBtn.addEventListener('click', () => hideCustomConfirm(true));
    cancelBtn.addEventListener('click', () => hideCustomConfirm(false));
    function requestNotificationPermission() { /* ...código original... */ }
    function showNotification(title, body) { /* ...código original... */ }
    function checkAndUpdateCountdown() { /* ...código original... */ }
    function checkTasksAndSendNotifications() { /* ...código original... */ }
    async function checkAndResetRecurringTasks() { /* ...código original... */ }
    function updateReactivationCountdown() { /* ...código original... */ }
    function checkAndUpdateOverdueStatus() { /* ...código original... */ }
    function scheduleTaskChecks() { /* ...código original... */ }
    async function fetchLocationAndWeather() { /* ...código original... */ }
    function startClock(timezone) { /* ...código original... */ }
    function getWeatherIcon(code) { /* ...código original... */ }
    
    // Simplificando funções originais para economizar espaço
    function createCategoryFilters() { categoryFilterControls.innerHTML = ''; const categories = Object.keys(categoryEmojis).filter(c => c !== 'Rotina' && c !== 'Default'); categories.forEach(cat => { const btn = document.createElement('button'); btn.className = 'filter-btn'; btn.dataset.filter = cat; btn.textContent = cat; categoryFilterControls.appendChild(btn); }); }
    function setTheme(theme) { document.body.dataset.theme = theme; themeIcon.className = theme === 'dark' ? 'ph-fill ph-moon' : 'ph-fill ph-sun'; localStorage.setItem('theme', theme); }
    function requestNotificationPermission() { if (!('Notification' in window)) return; if (Notification.permission === 'default') { Notification.requestPermission(); } }
    function showNotification(title, body) { if (Notification.permission !== 'granted') return; const opts = { body, icon: '/icons/icon-192x192.png' }; if ('serviceWorker' in navigator && navigator.serviceWorker.ready) { navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)); } else { new Notification(title, opts); } }
    function checkAndUpdateCountdown() { const now = new Date(); allTasks.forEach(task => { if(task.completed || !task.withNotification || !task.date || !task.time) return; const diff = new Date(`${task.date}T${task.time}`) - now; const el = document.querySelector(`.task-card[data-id='${task.id}'] .notification-countdown span`); if(el) { if(diff > 0) { const min = Math.ceil(diff / 60000); el.textContent = min > 60 ? `em ${Math.floor(min/60)}h` : `em ${min}m`; } else { el.parentElement.classList.add('hidden'); } } }); }
    async function checkAndResetRecurringTasks() { if (new Date().getDate() === lastCheckedDate) return; lastCheckedDate = new Date().getDate(); const toReset = allTasks.filter(t => t.recurring && t.completed); if (toReset.length > 0) { const promises = toReset.map(t => { t.completed = false; t.notificationState = 0; const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); t.date = tomorrow.toISOString().split('T')[0]; return apiRequest(`/api/tasks/${t.id}`, 'PUT', t); }); await Promise.all(promises); loadTasks(); } }
    function updateReactivationCountdown() { const now = new Date(); const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(0,0,0,0); const diff = tomorrow - now; const h = Math.floor(diff/3600000); const m = Math.floor((diff % 3600000) / 60000); document.querySelectorAll('.reactivation-countdown span').forEach(s => s.textContent = `Reativa em ${h}h ${m}m`); }
    function checkAndUpdateOverdueStatus() { const now = new Date(); allTasks.forEach(task => { const card = document.querySelector(`.task-card[data-id='${task.id}']`); if(!card) return; if(task.completed) { card.classList.remove('overdue'); return; } if (task.date && task.time) { const isOverdue = now - new Date(`${task.date}T${task.time}`) > 300000; card.classList.toggle('overdue', isOverdue); } }); }
    function scheduleTaskChecks() { if (taskCheckInterval) clearInterval(taskCheckInterval); const checks = () => { checkAndUpdateCountdown(); checkAndUpdateOverdueStatus(); /* checkTasksAndSendNotifications(); */ checkAndResetRecurringTasks(); updateReactivationCountdown(); }; checks(); taskCheckInterval = setInterval(checks, 30000); }
    async function fetchLocationAndWeather() { try { const geo = await (await fetch('https://ipapi.co/json/')).json(); const { city, country_name, latitude, longitude, timezone } = geo; locationEl.textContent = `${city}, ${country_name}`; const weather = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)).json(); temperatureEl.textContent = `${Math.round(weather.current_weather.temperature)}°C`; weatherIconEl.className = getWeatherIcon(weather.current_weather.weathercode); startClock(timezone); } catch (e) { locationEl.textContent = 'Não foi possível carregar.'; temperatureEl.textContent = '--'; startClock('America/Sao_Paulo'); } finally { locationWeatherSection.style.display = 'grid'; } }
    function startClock(timezone) { if(clockInterval) clearInterval(clockInterval); const update = () => { const now = new Date(); currentTimeEl.textContent = now.toLocaleTimeString('pt-BR', {timeZone: timezone, hour: '2-digit', minute: '2-digit'}); currentDateEl.textContent = new Intl.DateTimeFormat('pt-BR', {year:'numeric', month:'long', day: 'numeric', timeZone: timezone}).format(now); }; update(); clockInterval = setInterval(update, 1000); }
    function getWeatherIcon(code) { const icons = { 0: 'ph-fill ph-sun', 1: 'ph-fill ph-cloud-sun', 2: 'ph-fill ph-cloud', 3: 'ph-fill ph-clouds', 45: 'ph-fill ph-fog', 61: 'ph-fill ph-cloud-rain', 80: 'ph-fill ph-cloud-lightning' }; return icons[code] || 'ph-fill ph-question'; }
    
    window.addEventListener('click', (event) => {
      if (event.target === taskModal) closeTaskModal();
      if (event.target === confirmModal) hideCustomConfirm(false);
      if (event.target === userInfoModal) closeUserInfoModal();
    });

    // --- LÓGICA DE INSTALAÇÃO DO PWA ---
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (authToken) { installAppBtn.classList.remove('hidden'); } });
    installAppBtn.addEventListener('click', async () => { installAppBtn.classList.add('hidden'); deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; });
    window.addEventListener('appinstalled', () => { installAppBtn.classList.add('hidden'); deferredPrompt = null; showToast("App instalado!"); });

    // --- INICIALIZAÇÃO ---
    async function initializeApp() {
        setTheme(localStorage.getItem('theme') || 'dark');
        setMute(localStorage.getItem('isMuted') === 'true');
        requestNotificationPermission(); createCategoryFilters();
        try {
            const userData = await apiRequest('/api/user/me');
            if (userData) {
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('userAge', userData.age);
                localStorage.setItem('totalTasksCreated', userData.totalTasksCreated);
                updateUserInfoUI(userData);
            }
            await Promise.all([ loadTasks(), fetchLocationAndWeather() ]);
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(loadTasks, 60000);
        } catch (error) {
            console.error("Erro na inicialização:", error);
            if (String(error).includes("401") || String(error).includes("403")) { logout(); }
            else { showToast("Erro ao iniciar o app.", true); }
        } finally {
            loader.classList.add('hidden');
        }
    }

    if (authToken) {
        showLoginState();
        initializeApp();
    } else {
        showLoggedOutState();
    }
});